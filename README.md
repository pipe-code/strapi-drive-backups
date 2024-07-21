# Node.js Backup Script

This project is a Node.js script that creates backups of a MySQL database and a specific directory, compresses them, and uploads the resulting files to a Google Drive folder. After uploading, the local files are deleted unless specified otherwise.

## Tested Environment

- Node.js version: 18.20.3

## Setup

### Prerequisites

- Node.js (v18.20.3)
- npm (Node Package Manager)
- Google Cloud project with Drive API enabled
- MySQL database

### Installation

1. Clone this repository:

    git clone https://github.com/pipe-code/strapi-drive-backups.git
    cd strapi-drive-backups

2. Install the required npm packages:

    npm install

3. Create a .env file in the root of the project and add the following variables:

    CLIENT_ID=your_google_client_id
    CLIENT_SECRET=your_google_client_secret
    REFRESH_TOKEN=your_google_refresh_token
    DRIVE_FOLDER_ID=your_google_drive_folder_id
    DB_NAME=your_database_name
    DB_USER=your_database_username
    DB_PASSWORD=your_database_password
    DIRECTORY_TO_BACKUP=/path/to/your/directory
    KEEP_LOCAL_BACKUPS=true_or_false


## Environment Variables
- CLIENT_ID: Your Google API client ID. You can obtain this by creating OAuth 2.0 credentials in the Google Cloud Console.
- CLIENT_SECRET: Your Google API client secret. Obtain this along with the client ID.
- REFRESH_TOKEN: A refresh token to authenticate the application. You can obtain this by authorizing your application to access Google Drive.
- DRIVE_FOLDER_ID: The ID of the Google Drive folder where the backups will be uploaded. You can find this by navigating to the folder in Google Drive and copying the part of the URL after folders/.
- DB_NAME: The name of your MySQL database.
- DB_USER: The username for your MySQL database.
- DB_PASSWORD: The password for your MySQL database.
- DIRECTORY_TO_BACKUP: The path to the directory you want to backup.
- KEEP_LOCAL_BACKUPS: Set to true if you want to keep the local files after uploading to Google Drive. Set to false to delete the files after uploading.

## Running the Script
Once you have set up your environment variables and installed the necessary packages, you can run the script:

    node index.js

This script will:

1. Dump the MySQL database.
2. Create a tar.gz file of the specified directory.
3. Upload both files to Google Drive.
4. Delete the local copies of the files unless KEEP_LOCAL_BACKUPS is set to true.

## Additional Information
The backups are saved in a directory named backups in the project root.
The script generates filenames in the format [YYYYMMDD_HHMMSS]_db.sql and [YYYYMMDD_HHMMSS]_public.tar.gz.

## License
This project is licensed under the MIT License. See the LICENSE file for details.