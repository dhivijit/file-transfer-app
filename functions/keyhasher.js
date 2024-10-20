const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generates a SHA-256 hash of a public key from a given .pem file. This hash is used as an identifier of the person.
 *
 * @param {string} pemFilePath - The file path to the .pem file containing the public key.
 * @returns {string} The SHA-256 hash of the public key in hexadecimal format.
 */
function hashPublicKey(pemFilePath) {
    const publicKey = fs.readFileSync(pemFilePath, 'utf8');

    const hash = crypto.createHash('sha256');
    hash.update(publicKey);

    const hashedKey = hash.digest('hex');

    return hashedKey;
}

module.exports = hashPublicKey;