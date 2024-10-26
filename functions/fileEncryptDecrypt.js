const fs = require('fs');
const crypto = require('crypto');

/**
 * Encrypts a file using RSA public key encryption.
 *
 * @param {string} inputFilePath - The path to the input file to be encrypted.
 * @param {string} outputFilePath - The path where the encrypted file will be saved.
 * @param {string} publicKey - The RSA public key used for encryption.
 *
 * @throws Will throw an error if there is an issue reading the input file or writing the encrypted data.
 *
 * @example
 * encryptFile('path/to/input.txt', 'path/to/output.enc');
 *
 * @description
 * This function reads the input file in chunks and encrypts each chunk using the provided RSA public key.
 * The encrypted data is then written to the output file. The function handles errors during the read and write
 * processes and logs them to the console.
 */
async function encryptFile(inputFilePath, outputFilePath, publicKey) {
    const chunkSize = 446;

    const readStream = fs.createReadStream(inputFilePath, { highWaterMark: chunkSize });
    const writeStream = fs.createWriteStream(outputFilePath);
    try {
        readStream.on('data', (chunk) => {
            try {
                const encryptedData = crypto.publicEncrypt(
                    {
                        key: publicKey,
                        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                        oaepHash: 'sha256',
                    },
                    chunk
                );

                writeStream.write(encryptedData);
            } catch (err) {
                console.error('Error during encryption:', err.message);
            }
        });

        readStream.on('end', () => {
            writeStream.end();
        });

        readStream.on('error', (err) => {
            console.error(`Error reading file: ${err.message}`);
        });

        writeStream.on('error', (err) => {
            console.error(`Error writing file: ${err.message}`);
        });

        return { success: true, message: 'File encrypted successfully' };
    }
    catch (err) {
        return { success: false, message: 'Error encrypting file: ' + err.message };
    }
}

/**
 * Decrypts a file using RSA private key decryption.
 *
 * @param {string} inputFilePath - The path to the encrypted input file.
 * @param {string} outputFilePath - The path to the decrypted output file.
 * @param {string} privateKey - The RSA private key used for decryption.
 *
 * @throws Will throw an error if there is an issue reading the input file or writing to the output file.
 *
 * @example
 * decryptFile('path/to/encrypted/file', 'path/to/decrypted/file');
 *
 * @description
 * This function reads an encrypted file in chunks, decrypts each chunk using a provided RSA private key,
 * and writes the decrypted data to an output file. It handles errors during the read, write, and decryption processes.
 */
function decryptFile(inputFilePath, outputFilePath, privateKey) {
    const chunkSize = 512;

    const readStream = fs.createReadStream(inputFilePath, { highWaterMark: chunkSize });
    const writeStream = fs.createWriteStream(outputFilePath);
    try {
        readStream.on('data', (chunk) => {
            try {
                const decryptedData = crypto.privateDecrypt(
                    {
                        key: privateKey,
                        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                        oaepHash: 'sha256',
                    },
                    chunk
                );

                writeStream.write(decryptedData);
            } catch (err) {
                console.error('Error during decryption:', err.message);
            }
        });

        readStream.on('end', () => {
            writeStream.end();
        });

        readStream.on('error', (err) => {
            console.error(`Error reading file: ${err.message}`);
        });

        writeStream.on('error', (err) => {
            console.error(`Error writing file: ${err.message}`);
        });

        return { success: true, message: 'File decrypted successfully' };
    } catch (err) {
        return { success: false, message: 'Error decrypting file: ' + err.message };
    }
}

// const inputFilePath = path.join(__dirname, 'sourcefile.txt');
// const encryptedFolder = path.join(__dirname, 'encrypted');
// const encryptedFilePath = path.join(encryptedFolder, '20240604.jpg');

// const decryptedFolder = path.join(__dirname, 'decrypted');
// const decryptedFilePath = path.join(decryptedFolder, '20240604_decrypted.jpg');

// if (!fs.existsSync(encryptedFolder)) {
//     fs.mkdirSync(encryptedFolder);
// }
// if (!fs.existsSync(decryptedFolder)) {
//     fs.mkdirSync(decryptedFolder);
// }

// encryptFile(inputFilePath, encryptedFilePath);

// decryptFile(encryptedFilePath, decryptedFilePath);

module.exports = { encryptFile, decryptFile };