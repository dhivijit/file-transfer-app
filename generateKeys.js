// generateKeys
// This script generates a pair of RSA keys and stores them in the keys folder of the working directory.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function keyGen() {
    try {
        const keysDir = path.join(__dirname, 'keys');

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