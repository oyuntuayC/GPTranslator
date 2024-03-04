const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  shortcut: (callback) => ipcRenderer.on('shortcut', (_event, value) => callback(value)),
  menu: () => ipcRenderer.send('menu'),
  language: (callback) => ipcRenderer.on('language', (_event, value) => callback(value)),
  platform: () => process.platform,
  keySend: (key) => ipcRenderer.send('key-send', key),
  keyUpdate: (callback) => ipcRenderer.on('key-update', (_event, key) => callback(key))
})