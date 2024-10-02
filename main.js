const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require("path");
const fs = require("fs");

const keyGen = require("./generateKeys");

let aboutWindow;
let win;

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

ipcMain.handle('save-files', async (event, files) => {
    const keysDirectory = path.join(__dirname, 'keys');
    if (!fs.existsSync(keysDirectory)) {
        fs.mkdirSync(keysDirectory);
    }

    try {
        for (const file of files) {
            const sourceFilePath = file.path;
            const destinationFilePath = path.join(keysDirectory, file.name);
            await fs.promises.copyFile(sourceFilePath, destinationFilePath);
        }
        return { success: true, message: 'Files saved successfully.' };
    } catch (err) {
        return { success: false, message: err.message };
    }
});

ipcMain.handle('key-check', async () => {
    const keysDirectory = path.join(__dirname, 'keys');
    const privateKeyFile = path.join(keysDirectory, 'private_key.pem');
    const publicKeyFile = path.join(keysDirectory, 'public_key.pem');

    try {
        if (fs.existsSync(privateKeyFile) && fs.existsSync(publicKeyFile)) {
            return { success: true, message: 'Key found.' };
        } else {
            return { success: false, message: 'Key not found.' };
        }
    } catch (err) {
        return { success: false, message: err.message };
    }
});

ipcMain.handle('delete-keys', async () => {
    const keysDirectory = path.join(__dirname, 'keys');
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

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
