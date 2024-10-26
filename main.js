const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();
const crypto = require("crypto");

const keyGen = require("./functions/generateKeys");
const { encryptFile, decryptFile } = require("./functions/fileEncryptDecrypt");
const { IPFSUploader, IPFSFileDeleter } = require("./functions/web3storageinteractor");
const { newUploadUpdater, getNewFiles, deleteFile } = require("./functions/dbinteractor");
const hashPublicKey = require("./functions/keyhasher");
const clearDirectory = require("./functions/dircleaner");
const downloadFile = require("./functions/ipfsdownloader");
const { encryptRSAKeys, decryptRSAKeys } = require("./functions/keysSecured");

let aboutWindow;
let authWindow;
let win;

const userDir = app.getPath('userData');

if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir);
}

const tempDir = path.join(userDir, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

var isPasswordRequired;
var receivedPassword;

const createWindow = () => {
    win = new BrowserWindow({
        autoHideMenuBar: true,
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js'),
            devTools: false
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
                // { label: 'Toggle Developer Tools', role: 'toggleDevTools' }
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

function createAuthWindow() {
    authWindow = new BrowserWindow({
        autoHideMenuBar: true,
        width: 400,
        height: 200,
        frame: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js'),
            devTools: false
        },
        icon: path.join(__dirname, 'blockchain.png')
    });

    authWindow.loadFile('auth.html');
}

app.whenReady().then(() => {

    // check if files exist in the keys directory
    const keysDir = path.join(userDir, 'keys');
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir);
    }

    // check if the files in keysDir ending with .enc. if two files in it have .enc extension, then password is required
    const files = fs.readdirSync(keysDir);
    let encFiles = 0;
    for (const file of files) {
        if (file.endsWith('.enc')) {
            encFiles++;
        }
    }

    isPasswordRequired = (encFiles === 2) ? true : false;


    if (isPasswordRequired) {
        createAuthWindow();
    } else {
        createWindow();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

ipcMain.handle('authenticate', async (event, hashedPassword) => {
    const keysDir = path.join(userDir, 'keys');
    const authresponse = await decryptRSAKeys(keysDir, hashedPassword);

    if (authresponse.success) {
        receivedPassword = hashedPassword;
        // Password is correct, close the auth window and open the main window
        if (authWindow) authWindow.close();
        createWindow();
    } else {
        // Send a failure message back to the auth window
        return { success: false, message: 'Incorrect password' };
    }
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

        isPasswordRequired = false;

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
        return { finalLink, ...result };
    } else {
        return result;
    }
});

ipcMain.handle("mongoDbupload", async (event, link, message) => {
    const receiverPublicKeyPath = fs.readdirSync(tempDir).filter(file => file.endsWith('.pem'))[0];
    const receiverHash = hashPublicKey(path.join(tempDir, receiverPublicKeyPath));
    const senderHash = hashPublicKey(path.join(userDir, 'keys', 'public_key.pem'));

    const result = await newUploadUpdater(senderHash, receiverHash, link, message);

    return result;
});

ipcMain.handle("cleanDir", async () => {
    return clearDirectory(tempDir);
});

ipcMain.handle("checkNewFiles", async () => {
    const userHash = hashPublicKey(path.join(userDir, 'keys', 'public_key.pem'));
    const result = await getNewFiles(userHash);
    return result;
})

ipcMain.handle("downloadFile", async (event, url) => {
    const output = await downloadFile(url, tempDir);
    return output;
});

ipcMain.handle("decrypt-file", async () => {
    try {
        const files = fs.readdirSync(tempDir);
        let filetoDecryptPath;
        let fileName;

        // Find the .enc file in the temp directory
        for (const file of files) {
            if (file.endsWith('.enc')) {
                filetoDecryptPath = path.join(tempDir, file);
                fileName = file;
                break;
            }
        }

        // If no .enc file is found, return an error
        if (!filetoDecryptPath) {
            throw new Error('No encrypted file found to decrypt');
        }

        // Decrypt the file
        const decryptedFilePath = filetoDecryptPath.slice(0, -4); // Remove the '.enc' extension
        const output = await decryptFile(filetoDecryptPath, decryptedFilePath, fs.readFileSync(path.join(userDir, 'keys', 'private_key.pem'), { encoding: 'utf-8' }));

        // Delete the encrypted file
        fs.unlinkSync(filetoDecryptPath);

        // Show the save dialog to let the user choose where to save the decrypted file
        const result = await dialog.showSaveDialog({
            title: "Save Decrypted File",
            defaultPath: path.basename(decryptedFilePath), // Default file name without the ".enc"
            filters: [
                { name: 'All Files', extensions: ['*'] } // You can modify this based on file type if needed
            ]
        });

        // If user cancels the dialog
        if (result.canceled) {
            fs.unlinkSync(decryptedFilePath);
            return { success: false, message: 'File save cancelled.' };
        }

        // Copy the decrypted file to the chosen path
        fs.copyFileSync(decryptedFilePath, result.filePath);

        // Optionally, you can delete the decrypted file from tempDir after saving
        fs.unlinkSync(decryptedFilePath);

        return { success: true, message: 'File saved successfully.', fileName: path.basename(result.filePath) };
    } catch (err) {
        return { success: false, message: err.message };
    }
});

ipcMain.handle("deleteFile", async (event, fileURL) => {

    const result = await deleteFile(fileURL);

    // if (result.success) {
    //     const deletedElement = fileURL;
    //     const cidRegex = /https:\/\/([^\.]+)\.ipfs\.w3s\.link/;

    //     const match = deletedElement.match(cidRegex);

    //     if (match && match[1]) {
    //         const extractedPart = match[1];
    //         console.log("Extracted:" + extractedPart);
    //         const deleteAck = await IPFSFileDeleter(extractedPart);

    //         if (deleteAck.success) {
    //             return result;
    //         } else {
    //             return { success: false, message: 'Error deleting file from IPFS' };
    //         }
    //     } else {
    //         return { success: false, message: 'Regex Check Failed' };
    //     }
    // } else {
    //     return result
    // }

    return result;
});

ipcMain.handle('share-public-key', async (event) => {
    const keysDir = path.join(userDir, 'keys');

    const defaultSaveDirectory = app.getPath('desktop');

    const result = await dialog.showSaveDialog({
        title: 'Share Public Key',
        defaultPath: path.join(defaultSaveDirectory, 'public_key.pem'),
        buttonLabel: 'Save Key',
        filters: [
            { name: 'Public Key File', extensions: ['pem'] }
        ]
    });

    if (result.canceled) {
        return;
    } else {
        fs.copyFileSync(path.join(keysDir, 'public_key.pem'), result.filePath);
    }
});

ipcMain.handle("isAuthRequired", async (event) => {
    return isPasswordRequired;
});

ipcMain.handle("set-password", async (event, password) => {
    isPasswordRequired = true;
    receivedPassword = password;
    return { success: true, message: 'Password set successfully.' };
});

ipcMain.handle("unset-password", async (event) => {
    isPasswordRequired = false;
    return { success: true, message: 'Password removed successfully.' };
});

app.on('window-all-closed', async () => {
    if (isPasswordRequired) {
        const keysDir = path.join(userDir, 'keys');
        await encryptRSAKeys(keysDir, receivedPassword);
    }
    if (process.platform !== 'darwin') app.quit();
});
