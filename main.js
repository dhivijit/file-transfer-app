const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();
const crypto = require("crypto");

const keyGen = require("./functions/generateKeys");
const { encryptFile, decryptFile } = require("./functions/fileEncryptDecrypt");
const IPFSUploader = require("./functions/web3storageinteractor");
const { newUploadUpdater } = require("./functions/dbinteractor");
const hashPublicKey = require("./functions/keyhasher");
const clearDirectory = require("./functions/dircleaner");

let aboutWindow;
let win;

const userDir = app.getPath('userData');

if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir);
}

const tempDir = path.join(userDir, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

const createWindow = () => {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'blockchain.png')
    });

    win.loadFile('index.html');

    const menuTemplate = [
        {
            label: 'File',
            submenu: [
                { label: 'Exit', role: 'quit' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { label: 'Reload', role: 'reload' },
                { label: 'Toggle Developer Tools', role: 'toggleDevTools' }
            ]
        },
        {
            label: "Help",
            submenu: [
                {
                    label: "About",
                    click: () => {
                        if (!aboutWindow) {
                            aboutWindow = new BrowserWindow({
                                width: 400,
                                height: 300,
                                resizable: false,
                                minimizable: false,
                                maximizable: false,
                                parent: win,
                                modal: true,
                                webPreferences: {
                                    nodeIntegration: true,
                                }
                            });

                            aboutWindow.setMenu(null);
                            aboutWindow.loadFile(path.join(__dirname, 'about.html'));

                            aboutWindow.on('closed', () => {
                                aboutWindow = null;
                            });
                        }
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
};

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

ipcMain.handle('show-alert', async (event, { title, message }) => {
    win.setEnabled(false);
    const options = {
        type: 'info',
        buttons: ['OK'],
        title: title,
        message: message,
        parent: win,
        modal: true
    };

    await dialog.showMessageBox(options);
    win.focus();
    win.setEnabled(true);
});

ipcMain.handle('show-prompt', async (event, { title, message }) => {
    win.setEnabled(false);
    const options = {
        type: 'question',
        buttons: ['Yes', 'No'],
        defaultId: 0,
        cancelId: 1,
        title: title,
        message: message,
        parent: win,
        modal: true
    };

    const result = await dialog.showMessageBox(options);
    win.focus();
    win.setEnabled(true);
    return result.response === 0;
});

ipcMain.handle('generate-keys', async () => {
    const output = keyGen();
    return output;
});

function validateKeys() {
    try {
        const keysDir = path.join(userDir, 'keys');

        const testPrivateKey = Buffer.from(
            fs.readFileSync(path.join(keysDir, 'private_key.pem'), { encoding: "utf-8" })
        );
        const testPublicKey = Buffer.from(
            fs.readFileSync(path.join(keysDir, 'public_key.pem'), { encoding: "utf-8" })
        );

        // Check if both keys exist
        if (!fs.existsSync(path.join(keysDir, 'public_key.pem')) || !fs.existsSync(path.join(keysDir, 'private_key.pem'))) {
            return { success: false, message: "Keys do not exist" };
        }

        // Validate the keys by attempting to import them
        try {
            const testMessage = "test-message";
            const encryptedData = crypto.publicEncrypt(
                {
                    key: testPublicKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: "sha256",
                },
                testMessage
            );

            const decryptedData = crypto.privateDecrypt(
                {
                    key: testPrivateKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: "sha256",
                },
                encryptedData
            );

            if (decryptedData.toString() !== testMessage) {
                throw new Error("Private and public keys do not match");
            }

            return { success: true, message: "Keys are valid and match" };
        } catch (err) {
            return { success: false, message: "Invalid key format or mismatch: " + err.message };
        }
    } catch (err) {
        return { success: false, message: "Error reading keys: " + err.message };
    }
}

ipcMain.handle('save-files', async (event, files) => {
    const userDir = app.getPath('userData');
    const keysDirectory = path.join(userDir, 'keys');
    if (!fs.existsSync(keysDirectory)) {
        fs.mkdirSync(keysDirectory);
    }

    try {
        for (const file of files) {
            const sourceFilePath = file.path;
            const destinationFilePath = path.join(keysDirectory, file.name);
            await fs.promises.copyFile(sourceFilePath, destinationFilePath);
        }

        var validationOutput = validateKeys();
        if (!validationOutput.success) {
            console.log(validationOutput);
            return { success: false, message: validationOutput.message };
        }

        return { success: true, message: 'Files saved successfully.' };
    } catch (err) {
        return { success: false, message: err.message };
    }
});

ipcMain.handle('key-check', async () => {
    const userDir = app.getPath('userData');
    const keysDirectory = path.join(userDir, 'keys');
    const privateKeyFile = path.join(keysDirectory, 'private_key.pem');
    const publicKeyFile = path.join(keysDirectory, 'public_key.pem');

    try {
        if (fs.existsSync(privateKeyFile) && fs.existsSync(publicKeyFile)) {
            var validationOutput = validateKeys();
            if (!validationOutput.success) {
                console.log(validationOutput);
                return { success: false, message: validationOutput.message };
            }
            return { success: true, message: 'Key found.' };
        } else {
            return { success: false, message: 'Key not found.' };
        }

    } catch (err) {
        return { success: false, message: err.message };
    }
});

ipcMain.handle('delete-keys', async () => {
    const userDir = app.getPath('userData');
    const keysDirectory = path.join(userDir, 'keys');
    const privateKeyFile = path.join(keysDirectory, 'private_key.pem');
    const publicKeyFile = path.join(keysDirectory, 'public_key.pem');

    try {
        if (fs.existsSync(privateKeyFile)) {
            fs.unlinkSync(privateKeyFile);
        }

        if (fs.existsSync(publicKeyFile)) {
            fs.unlinkSync(publicKeyFile);
        }

        return { success: true, message: 'Keys deleted successfully.' };
    } catch (err) {
        return { success: false, message: err.message };
    }
});



ipcMain.handle("SaveUserFiles", async (event, files) => {
    try {
        for (const file of files) {
            const sourceFilePath = file.path;
            const destinationFilePath = path.join(tempDir, file.name);
            await fs.promises.copyFile(sourceFilePath, destinationFilePath);
        }

        return { success: true, message: 'Files saved successfully.' };
    } catch (err) {
        return { success: false, message: err.message };
    }
});

ipcMain.handle("encrypt-file", async () => {
    try {
        // let receiverPublicKeyPath;
        // let filetoEncryptPath;

        // .pem file in the temp directory becomes receiverPublicKeyPath
        // the remaining file in the temp directory becomes filetoEncryptPath
        const files = fs.readdirSync(tempDir);
        let receiverPublicKeyPath;
        let filetoEncryptPath;
        for (const file of files) {
            if (file.endsWith('.pem')) {
                receiverPublicKeyPath = path.join(tempDir, file);
            } else {
                filetoEncryptPath = path.join(tempDir, file);
            }
        }

        const output = await encryptFile(filetoEncryptPath, filetoEncryptPath + '.enc', fs.readFileSync(receiverPublicKeyPath, { encoding: 'utf-8' }));

        return output;
    } catch (err) {
        return { success: false, message: err.message };
    }
})

ipcMain.handle("uploadFiletoIPFS", async () => {
    // check for .enc file in the temp directory and upload it using the IPFSUploader function
    const files = fs.readdirSync(tempDir);
    let filetoUploadPath;
    let fileName
    for (const file of files) {
        if (file.endsWith('.enc')) {
            filetoUploadPath = path.join(tempDir, file);
            fileName = file;
        }
    }

    const result = await IPFSUploader(filetoUploadPath);
    if (result.success) {
        const finalLink = "https://" + result.directoryCid + ".ipfs.w3s.link/" + fileName;
        console.log(result);
        console.log(finalLink);
        return { finalLink, ...result };
    } else {
        return result;
    }
});

ipcMain.handle("mongoDbupload", async (event, link, message) => {

    console.log(link, message)
    const receiverPublicKeyPath = fs.readdirSync(tempDir).filter(file => file.endsWith('.pem'))[0];
    const receiverHash = hashPublicKey(path.join(tempDir, receiverPublicKeyPath));
    const senderHash = hashPublicKey(path.join(userDir, 'keys', 'public_key.pem'));
    console.log(link, )

    const result = await newUploadUpdater(senderHash, receiverHash, link, message);
    console.log(result);

    return result;
});

ipcMain.handle("cleanDir", async () => {
    return clearDirectory(tempDir);
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
