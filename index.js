const { spawn } = require('child_process');
const tar = require('tar');
const fs = require('fs-extra');
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

const getFormattedDate = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const FORMATTED_DATE = getFormattedDate();
const DB_CLIENT   = process.env.DB_CLIENT || 'postgres';
const DB_NAME     = process.env.DB_NAME;
const DB_USER     = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST     = process.env.DB_HOST || '127.0.0.1';
const DB_PORT     = process.env.DB_PORT || (DB_CLIENT === 'postgres' ? '5432' : '3306');

const DIRECTORY_TO_BACKUP = process.env.DIRECTORY_TO_BACKUP;
const KEEP_LOCAL_BACKUPS  = process.env.KEEP_LOCAL_BACKUPS === 'true';
const BACKUP_FOLDER       = './backups';
const ZIP_NAME            = `${FORMATTED_DATE}_public.tar.gz`;
const SQL_DUMP_NAME       = DB_CLIENT === 'postgres' ? `${FORMATTED_DATE}_db.pgdump` : `${FORMATTED_DATE}_db.sql`;

const CLIENT_ID       = process.env.CLIENT_ID;
const CLIENT_SECRET   = process.env.CLIENT_SECRET;
const REFRESH_TOKEN   = process.env.REFRESH_TOKEN;
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: REFRESH_TOKEN });

async function uploadFile(filePath) {
  const drive = google.drive({ version: 'v3', auth });
  const fileMetadata = { name: path.basename(filePath), parents: [DRIVE_FOLDER_ID] };
  const media = { mimeType: 'application/gzip', body: fs.createReadStream(filePath) };
  const res = await drive.files.create({ resource: fileMetadata, media, fields: 'id' });
  console.log('Uploaded to Drive. File Id:', res.data.id);
}

function spawnPromise(cmd, args, opts = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, opts);
        let stderr = '';
        child.stderr.on('data', (d) => { stderr += d.toString(); process.stderr.write(d); });
        child.stdout.on('data', (d) => process.stdout.write(d));
        child.on('close', (code) => {
            if (code === 0) return resolve();
            const err = new Error(`Command failed: ${cmd} ${args.join(' ')}\n${stderr}`);
            err.code = code;
            reject(err);
        });
    });
}

async function dumpPostgres(sqlDumpPath) {
    const args = ['-h', DB_HOST, '-p', DB_PORT, '-U', DB_USER, '-d', DB_NAME, '-F', 'c', '-f', sqlDumpPath];
    await spawnPromise('pg_dump', args, {
        env: { ...process.env, PGPASSWORD: DB_PASSWORD },
    });
    console.log('PostgreSQL database dumped successfully.');
}

async function dumpMySQL(sqlDumpPath) {
    const args = ['--result-file=' + sqlDumpPath, '-h', DB_HOST, '-P', DB_PORT, '-u', DB_USER, DB_NAME];
    await spawnPromise('mysqldump', args, {
        env: { ...process.env, MYSQL_PWD: DB_PASSWORD },
    });
    console.log('MySQL database dumped successfully.');
}

async function main() {
    await fs.ensureDir(BACKUP_FOLDER);

    const sqlDumpPath = path.join(BACKUP_FOLDER, SQL_DUMP_NAME);

    try {
        if (DB_CLIENT === 'postgres') {
            await dumpPostgres(sqlDumpPath);
        } else if (DB_CLIENT === 'mysql') {
            await dumpMySQL(sqlDumpPath);
        } else {
            throw new Error(`DB_CLIENT no soportado: ${DB_CLIENT}`);
        }
    } catch (err) {
        console.error(`Error dumping ${DB_CLIENT} database:`, err);
        process.exit(1);
    }

    const tarPath = path.join(BACKUP_FOLDER, ZIP_NAME);
    try {
        await tar.c({ gzip: true, file: tarPath }, [DIRECTORY_TO_BACKUP]);
        console.log('Directory zipped successfully.');
    } catch (err) {
        console.error('Error creating tar.gz:', err);
        process.exit(1);
    }

    try {
        await uploadFile(sqlDumpPath);
        await uploadFile(tarPath);
    } catch (err) {
        console.error('Error uploading to Drive:', err);
        process.exit(1);
    }

    if (!KEEP_LOCAL_BACKUPS) {
        await fs.remove(sqlDumpPath);
        await fs.remove(tarPath);
        console.log('Local files deleted successfully.');
    }

    console.log('Backup completed.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
