const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Downloads a file from the given URL and saves it to the local filesystem.
 *
 * @async
 * @function downloadFile
 * @param {string} url - The URL of the file to download.
 * @param {string} directory - The directory where the file should be saved.
 * @returns {Promise<Object>} - A promise that resolves with a success message or an error message.
 * @throws {Error} - Throws an error if the download or file writing process fails.
 */
async function downloadFile(url, directory) {
  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
    });

    const fileName = path.basename(url);
    const filePath = path.join(directory, fileName);
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`File downloaded successfully: ${filePath}`);
        resolve({ success: true, message: "File Downloaded Successfully" });
      });

      writer.on('error', (err) => {
        console.error('Error writing file:', err);
        reject({ success: false, message: "Error writing file" });
      });
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return { success: false, message: "Error downloading file" };
  }
}

module.exports = downloadFile;