const axios = require('axios');
const fs = require('fs');
const path = require('path');


/**
 * Downloads a file from the given URL and saves it to the local filesystem.
 *
 * @async
 * @function downloadFile
 * @param {string} url - The URL of the file to download.
 * @returns {Promise<void>} - A promise that resolves when the file has been downloaded and saved.
 * @throws {Error} - Throws an error if the download or file writing process fails.
 */
async function downloadFile(url) {
  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
    });

    const fileName = path.basename(url);
    const writer = fs.createWriteStream(fileName);

    response.data.pipe(writer);

    writer.on('finish', () => {
      console.log(`File downloaded successfully: ${fileName}`);
    });

    writer.on('error', (err) => {
      console.error('Error writing file:', err);
    });
  } catch (error) {
    console.error('Error downloading file:', error);
  }
}

// const url = 'https://bafybeif44fa5wxvejrx2p3pa7pa2kzepsmgddelmbs2pqsgtyi6ah53rfy.ipfs.w3s.link/20240802.jpg';
// downloadFile(url);

module.exports = downloadFile;