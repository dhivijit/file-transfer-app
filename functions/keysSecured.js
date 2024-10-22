const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Function to generate a cryptographic key from a password.
 * @param {string} password - The user-provided password.
 * @param {Buffer} salt - A salt value to strengthen the password-derived key.
 * @returns {Buffer} - The generated key.
 */
function generateKey(password, salt) {
    return crypto.scryptSync(password, salt, 32); // 32 bytes key (256-bit AES)
}

/**
 * Encrypts data using AES-256-GCM encryption algorithm.
 * @param {Buffer} key - The encryption key.
 * @param {Buffer} data - The data to be encrypted.
 * @returns {Object} - Contains encrypted data, initialization vector (iv), and authentication tag (authTag).
 */
function encryptData(key, data) {
    const iv = crypto.randomBytes(16); // Initialization vector for AES
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        encryptedData: encrypted,
        iv: iv,
        authTag: authTag
    };
}

/**
 * Decrypts data using AES-256-GCM.
 * @param {Buffer} key - The decryption key.
 * @param {Buffer} encryptedFile - The full content of the encrypted file.
 * @returns {Buffer} - The decrypted data.
 */
function decryptData(key, encryptedFile) {
    const salt = encryptedFile.slice(0, 16); // First 16 bytes is the salt
    const iv = encryptedFile.slice(16, 32); // Next 16 bytes is the IV
    const authTag = encryptedFile.slice(32, 48); // Next 16 bytes is the Auth Tag
    const encryptedData = encryptedFile.slice(48); // The rest is the encrypted data

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    return decrypted;
}

/**
 * Encrypt RSA key files from a specified folder using a password.
 * Deletes original files after encryption.
 * @param {string} folderPath - The path to the folder containing RSA key files.
 * @param {string} password - The password to encrypt the files.
 * @returns {Object} - Operation result containing success status and message.
 */
function encryptRSAKeys(folderPath, password) {
    try {
        const salt = crypto.randomBytes(16); // Generate a random salt for key derivation
        const key = generateKey(password, salt); // Derive the key from the password

        // Read all files in the folder
        const files = fs.readdirSync(folderPath);
        if (files.length === 0) {
            return { success: false, message: 'No files found in the specified folder.' };
        }

        files.forEach(file => {
            const filePath = path.join(folderPath, file);
            
            // Read file content
            const fileData = fs.readFileSync(filePath);

            // Encrypt the file content
            const { encryptedData, iv, authTag } = encryptData(key, fileData);

            // Create the final encrypted file structure
            const encryptedFile = Buffer.concat([salt, iv, authTag, encryptedData]);

            // Save the encrypted file (append `.enc` to the filename to indicate it's encrypted)
            const encryptedFilePath = path.join(folderPath, file + '.enc');
            fs.writeFileSync(encryptedFilePath, encryptedFile);

            // Delete the original file after encryption
            fs.unlinkSync(filePath);
        });

        return { success: true, message: 'Files encrypted and originals deleted successfully.' };

    } catch (error) {
        return { success: false, message: `Encryption failed: ${error.message}` };
    }
}

/**
 * Decrypt RSA key files from a specified folder using a password.
 * Deletes encrypted files after decryption.
 * @param {string} folderPath - The path to the folder containing the encrypted RSA key files.
 * @param {string} password - The password to decrypt the files.
 * @returns {Object} - Operation result containing success status and message.
 */
function decryptRSAKeys(folderPath, password) {
    try {
        // Read all files in the folder
        const files = fs.readdirSync(folderPath);
        if (files.length === 0) {
            return { success: false, message: 'No files found in the specified folder.' };
        }

        let decryptionFailed = false;

        files.forEach(file => {
            const filePath = path.join(folderPath, file);

            if (path.extname(file) !== '.enc') {
                return;
            }

            // Read the encrypted file content
            const encryptedFile = fs.readFileSync(filePath);

            // Extract the salt from the encrypted file (first 16 bytes)
            const salt = encryptedFile.slice(0, 16);
            const key = generateKey(password, salt); // Derive the key from the password and salt

            try {
                // Decrypt the file content
                const decryptedData = decryptData(key, encryptedFile);

                // Save the decrypted data (remove `.enc` extension)
                const decryptedFilePath = path.join(folderPath, path.basename(file, '.enc'));
                fs.writeFileSync(decryptedFilePath, decryptedData);

                // Delete the encrypted file after decryption
                fs.unlinkSync(filePath);

            } catch (error) {
                
                decryptionFailed = true;
            }
        });

        if (decryptionFailed) {
            return { success: false, message: 'Some files failed to decrypt. Check logs for details.' };
        }

        return { success: true, message: 'Files decrypted and encrypted originals deleted successfully.' };

    } catch (error) {
        return { success: false, message: `Decryption failed: ${error.message}` };
    }
}

module.exports = {
    encryptRSAKeys,
    decryptRSAKeys
};
