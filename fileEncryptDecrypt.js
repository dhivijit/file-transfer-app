const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const keysDir = path.join(__dirname, 'keys');

// Read the public and private keys
const publicKey = fs.readFileSync(path.join(keysDir, 'public_key.pem'), { encoding: 'utf-8' });
const privateKey = fs.readFileSync(path.join(keysDir, 'private_key.pem'), { encoding: 'utf-8' });

// Main function to process the file for encryption
function encryptFile(inputFilePath, outputFilePath) {
    const chunkSize = 446; // Reduced chunk size to fit encryption with padding

    // Create read and write streams
    const readStream = fs.createReadStream(inputFilePath, { highWaterMark: chunkSize });
    const writeStream = fs.createWriteStream(outputFilePath);

    readStream.on('data', (chunk) => {
        try {
            // Encrypt the chunk
            const encryptedData = crypto.publicEncrypt(
                {
                    key: publicKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256',
                },
                chunk
            );

            // Write the encrypted chunk to the output file
            writeStream.write(encryptedData);
        } catch (err) {
            console.error('Error during encryption:', err.message);
        }
    });

    readStream.on('end', () => {
        console.log('File encryption completed.');
        writeStream.end();
    });

    readStream.on('error', (err) => {
        console.error(`Error reading file: ${err.message}`);
    });

    writeStream.on('error', (err) => {
        console.error(`Error writing file: ${err.message}`);
    });
}

// Function to decrypt the file
function decryptFile(inputFilePath, outputFilePath) {
    const chunkSize = 512; // Encrypted chunk size

    // Create read and write streams
    const readStream = fs.createReadStream(inputFilePath, { highWaterMark: chunkSize });
    const writeStream = fs.createWriteStream(outputFilePath);

    readStream.on('data', (chunk) => {
        try {
            // Decrypt the chunk
            const decryptedData = crypto.privateDecrypt(
                {
                    key: privateKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256',
                },
                chunk
            );

            // Write the decrypted chunk to the output file
            writeStream.write(decryptedData);
        } catch (err) {
            console.error('Error during decryption:', err.message);
        }
    });

    readStream.on('end', () => {
        console.log('File decryption completed.');
        writeStream.end();
    });

    readStream.on('error', (err) => {
        console.error(`Error reading file: ${err.message}`);
    });

    writeStream.on('error', (err) => {
        console.error(`Error writing file: ${err.message}`);
    });
}

// File paths for encryption and decryption
const inputFilePath = path.join(__dirname, 'sourcefile.txt'); // Original file
const encryptedFolder = path.join(__dirname, 'encrypted');
const encryptedFilePath = path.join(encryptedFolder, '20240604.jpg'); // Encrypted file

const decryptedFolder = path.join(__dirname, 'decrypted');
const decryptedFilePath = path.join(decryptedFolder, '20240604_decrypted.jpg'); // Decrypted file

// Ensure the encrypted and decrypted directories exist
if (!fs.existsSync(encryptedFolder)) {
    fs.mkdirSync(encryptedFolder);
}
if (!fs.existsSync(decryptedFolder)) {
    fs.mkdirSync(decryptedFolder);
}

// Start encryption
// encryptFile(inputFilePath, encryptedFilePath);

// After encryption, you can call the decryption function
decryptFile(encryptedFilePath, decryptedFilePath);
