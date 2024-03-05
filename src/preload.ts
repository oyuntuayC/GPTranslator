import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  shortcut: (callback: (value: any) => void) => ipcRenderer.on('shortcut', (_event, value) => callback(value)),
  menu: () => ipcRenderer.send('menu'),
  language: (callback: (value: any) => void) => ipcRenderer.on('language', (_event, value) => callback(value)),
  platform: () => process.platform,
  keySend: (key: string) => ipcRenderer.send('key-send', key),
  keyUpdate: (callback: (key: any) => void) => ipcRenderer.on('key-update', (_event, key) => callback(key))
});