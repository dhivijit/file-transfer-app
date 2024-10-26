const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    generateKey: () => ipcRenderer.invoke('generate-keys'),
    saveFiles: (files) => ipcRenderer.invoke('save-files', files),
    checkKey: (key) => ipcRenderer.invoke('key-check'),
    deleteKeys: () => ipcRenderer.invoke('delete-keys'),
    alertInvoke: (data) => ipcRenderer.invoke('show-alert', data),
    promptInvoke: (data) => ipcRenderer.invoke('show-prompt', data),
    SaveUserFiles: (files) => ipcRenderer.invoke('SaveUserFiles', files),
    encryptFile: (file) => ipcRenderer.invoke('encrypt-file'),
    uploadFiletoIPFS: () => ipcRenderer.invoke('uploadFiletoIPFS'),
    mongoDbupload: (link, message) => ipcRenderer.invoke('mongoDbupload', link, message),
    cleanDir: () => ipcRenderer.invoke('cleanDir'),
    checkNewFiles: () => ipcRenderer.invoke('checkNewFiles'),
    downloadFile: (url) => ipcRenderer.invoke('downloadFile', url),
    decryptFile: () => ipcRenderer.invoke('decrypt-file'),
    deleteFile: (fileId) => ipcRenderer.invoke('deleteFile', fileId),
    sharePublicKey: () => ipcRenderer.invoke('share-public-key'),
    authenticate: (key) => ipcRenderer.invoke('authenticate', key),
    setPassword: (password) => ipcRenderer.invoke('set-password', password),
    unsetPassword: () => ipcRenderer.invoke('unset-password'),
    isAuthRequired: () => ipcRenderer.invoke('isAuthRequired'),
});
