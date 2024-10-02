window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const dependency of ['chrome', 'node', 'electron']) {
        replaceText(`${dependency}-version`, process.versions[dependency])
    }
})

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    generateKey: () => ipcRenderer.invoke('generate-keys'),
    saveFiles: (files) => ipcRenderer.invoke('save-files', files),
    checkKey: (key) => ipcRenderer.invoke('key-check'),
    deleteKeys: () => ipcRenderer.invoke('delete-keys'),
    alertInvoke: (data) => ipcRenderer.invoke('show-alert', data),
    promptInvoke: (data) => ipcRenderer.invoke('show-prompt', data),
});
