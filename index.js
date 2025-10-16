const { exec } = require('child_process');
const tar = require('tar');
const fs = require('fs-extra');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const getFormattedDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

const FORMATTED_DATE = getFormattedDate();
const DB_CLIENT = process.env.DB_CLIENT || 'mysql';
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DIRECTORY_TO_BACKUP = process.env.DIRECTORY_TO_BACKUP;
const KEEP_LOCAL_BACKUPS = process.env.KEEP_LOCAL_BACKUPS === 'true';
const BACKUP_FOLDER = './backups';
const ZIP_NAME = `${FORMATTED_DATE}_public.tar.gz`;
const SQL_DUMP_NAME = DB_CLIENT === 'postgres' ? `${FORMATTED_DATE}_db.pgdump` : `${FORMATTED_DATE}_db.sql`;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Google auth
const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: REFRESH_TOKEN });

async function uploadFile(filePath) {
    const drive = google.drive({ version: 'v3', auth });
    const fileMetadata = {
        'name': path.basename(filePath),
        'parents': [DRIVE_FOLDER_ID]
    };
    const media = {
        mimeType: 'application/gzip',
        body: fs.createReadStream(filePath)
    };

    const res = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
    });
    console.log('File Id:', res.data.id);
}

async function main() {
    // Create backup directory if not exists
    await fs.ensureDir(BACKUP_FOLDER);

    // Dump MySQL database
    const sqlDumpPath = path.join(BACKUP_FOLDER, SQL_DUMP_NAME);
    const mysqlDumpCommand = `mysqldump -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > ${sqlDumpPath}`;
    const postgresDumpCommand = `PGPASSWORD="${DB_PASSWORD}" pg_dump -U ${DB_USER} ${DB_NAME} > ${sqlDumpPath}`;
    const dumpCommand = DB_CLIENT === 'postgres' ? postgresDumpCommand : mysqlDumpCommand;
    exec(dumpCommand, async (err) => {
        if (err) {
            console.error('Error dumping MySQL database:', err);
            return;
        }

        console.log('MySQL database dumped successfully.');

        // Create tar.gz of the public directory
        const tarPath = path.join(BACKUP_FOLDER, ZIP_NAME);
        tar.c(
            {
                gzip: true,
                file: tarPath
            },
            [DIRECTORY_TO_BACKUP]
        ).then(async () => {
            console.log('Directory zipped successfully.');

            // Upload the SQL dump
            await uploadFile(sqlDumpPath);

            // Upload the tar.gz file
            await uploadFile(tarPath);

            // Clean up local files
            if(!KEEP_LOCAL_BACKUPS) {
                await fs.remove(sqlDumpPath);
                await fs.remove(tarPath);
                console.log('Local files deleted successfully.');
            }

        }).catch(err => console.error('Error creating tar.gz:', err));
    });
}

main().catch(console.error);

