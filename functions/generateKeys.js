const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Generates RSA key pairs and saves them to the user's data directory.
 * 
 * This function creates a 'keys' directory within the user's data directory if it does not already exist.
 * It then generates a 4096-bit RSA key pair and exports the public and private keys in PEM format.
 * The keys are saved as 'public_key.pem' and 'private_key.pem' respectively.
 * 
 * @returns {Object} An object containing a success status and a message.
 * @property {string} success - "true" if keys were generated successfully, "false" otherwise.
 * @property {string} message - A message indicating the result of the key generation process.
 */
function keyGen() {
    try {
        const userDir = app.getPath('userData');
        const keysDir = path.join(userDir, 'keys');

        if (!fs.existsSync(keysDir)) {
            fs.mkdirSync(keysDir);
        }

        const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
            modulusLength: 4096,
        });

        const exportedPublicKeyBuffer = publicKey.export({
            type: "pkcs1",
            format: "pem",
        });

        fs.writeFileSync(path.join(keysDir, 'public_key.pem'), exportedPublicKeyBuffer, { encoding: "utf-8" });

        const exportedPrivateKeyBuffer = privateKey.export({
            type: "pkcs1",
            format: "pem",
        });

        fs.writeFileSync(path.join(keysDir, 'private_key.pem'), exportedPrivateKeyBuffer, {
            encoding: "utf-8",
        });

        return { success: "true", message: "Keys generated successfully" };
    } catch (error) {
        return { success: "false", message: error.message };
    }
}

module.exports = keyGen;