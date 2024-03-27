import { app, MenuItemConstructorOptions, BrowserWindow, clipboard, ipcMain, globalShortcut, Menu, PopupOptions } from 'electron';
import Store from 'electron-store';
import path from 'node:path';
import { keyboard, Key } from "@nut-tree/nut-js";
import Icon from './favicon/favicon.png';


declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const KEY_WINDOW_WEBPACK_ENTRY: string;
declare const KEY_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

interface LanguageDict {
  [key: string]: {
    Language: string;
    About: string;
  };
}

let mainWin: BrowserWindow;
let currentLanguage: string;
let menu: Menu;
const configStore = new Store({
  encryptionKey: '1?dnG23dd/sAnd3.d|'
});
const languageDict: LanguageDict = {
  'English': {
    'Language':'Language',
    'About':'About'
  },
  'Chinese': {
    'Language':'语言',
    'About':'关于'
  },
  'Spanish': {
    'Language':'Idioma',
    'About':'Acerca de'
  }
}

function languageConvert(locale: string): string {
  if (locale.startsWith('zh')) {
      return 'Chinese'
  }else if (locale.startsWith('en')) {
      return 'English'
  }else if (locale.startsWith('es')) {
      return 'Spanish'
  }else {
    return 'English'
  }
}

function readConfig(): void {
  try {
    mainWin.webContents.send('key-update', configStore.get('apiKey'));
  } catch (error) {
    console.error('Error reading config:', error);
  }
}

function saveConfig(event: any, key: string): void {
  try {
    configStore.set('apiKey', key);
    mainWin.webContents.send('key-update', key);
    event.sender.close();
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

function buildMenu(language: string): Menu {
  const languageSet = languageDict[language];

  const template: MenuItemConstructorOptions[] = [
    {
      label: languageSet['Language'],
      submenu: [
        { label: 'English', click: () => switchLanguage('English')},
        { label: '中文', click: () => switchLanguage('Chinese')},
        { label: 'Español', click: () => switchLanguage('Spanish')}
      ]
    },
    { label: 'OpenAI key', click: () => createKeyWindow()},
    {
      label: "Application",
      submenu: [
          { role: 'about', label: languageSet['About'] },
          { type: "separator" },
          { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
      ]
    },
    {
      label: "Edit",
      submenu: [
          { label: "Undo", accelerator: "CmdOrCtrl+Z", role: "undo" },
          { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", role: "redo" },
          { type: "separator" },
          { label: "Cut", accelerator: "CmdOrCtrl+X", role: "cut" },
          { label: "Copy", accelerator: "CmdOrCtrl+C", role: "copy" },
          { label: "Paste", accelerator: "CmdOrCtrl+V", role: "paste" },
          { label: "Select All", accelerator: "CmdOrCtrl+A", role: "selectAll" }  
      ]
    }
  ];

  return Menu.buildFromTemplate(template);
}

function switchLanguage(language: string): Menu {
  currentLanguage = language;
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('language', currentLanguage);
  });
  menu = buildMenu(language); 
  return menu;
}

const createMainWindow = (): BrowserWindow => {
  // Create the browser window.
  const mainWin = new BrowserWindow({
    width: 800,
    height: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#000000',
      height: 25
    },
    webPreferences: {
      contextIsolation: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
    }
  })

  mainWin.setIcon(path.join(__dirname,Icon));
  // and load the index.html of the app.
  mainWin.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWin.webContents.openDevTools();

  return mainWin;
};

function createKeyWindow (): BrowserWindow {
  const win = new BrowserWindow({
    width: 400,
    height: 73,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#000000',
      height: 25
    },
    webPreferences: {
      contextIsolation: true,
      preload: KEY_WINDOW_PRELOAD_WEBPACK_ENTRY
    }
  })
  // win.webContents.openDevTools()
  win.setIcon(path.join(__dirname,Icon));
  win.setAlwaysOnTop(true)
  win.loadURL(KEY_WINDOW_WEBPACK_ENTRY)
  win.webContents.on('dom-ready', () => win.webContents.send('language', currentLanguage))
  
  return win
}

async function translateSelected(timeout=500): Promise<void> {
  if (process.platform !== 'darwin'){
    // win
    // const oldClipboardContent = clipboard.readText();
    // new Promise<void>(async (resolve)=>{
    //   await keyboard.releaseKey(Key.LeftShift,Key.LeftControl,Key.C);
    //   await keyboard.type(Key.LeftControl,Key.C);
    //   resolve();});
    // const clipboardUpdate = function ():string {
    //   let clipboardContent:string;
    //   const intID = setInterval(()=>{
    //     clipboardContent = clipboard.readText();
    //     if (clipboardContent!=oldClipboardContent){
    //       clearInterval(intID);
    //       return clipboardContent;
    //     }
    //   },100)
    //   setTimeout(()=>{return clipboardContent;},timeout)
    // }
    // const result = await clipboardUpdate;
    // mainWin.show();
    // mainWin.webContents.send('shortcut', result);

    // win
    await keyboard.releaseKey(Key.LeftShift,Key.LeftControl,Key.C);
    await keyboard.type(Key.LeftControl,Key.C);
    setTimeout(()=>{
      let clipboardContent = clipboard.readText();
      mainWin.show();
      mainWin.webContents.send('shortcut', clipboardContent);
    },100);
  }else{
    // darwin
    new Promise<void>(async (resolve)=>{
      await keyboard.type(Key.LeftCmd,Key.C);
      resolve();});
    setTimeout(()=>{
      let clipboardContent = clipboard.readText();
      mainWin.show();
      mainWin.webContents.send('shortcut', clipboardContent);
    },100);
  }
}

app.whenReady().then(() => {
  ipcMain.handle('read-clipboard', () => {
    var clipboardContent = clipboard.readText()
    return clipboardContent
  })

  mainWin = createMainWindow()
  mainWin.webContents.on('dom-ready', () => {
    readConfig();
    const systemLanguage = app.getLocale();
    menu = switchLanguage(languageConvert(systemLanguage))
    Menu.setApplicationMenu(menu); 
    const winConfig:PopupOptions = {
        window:mainWin
    };
    ipcMain.on('menu', () => menu.popup(winConfig))
  });

  ipcMain.on('key-send', saveConfig);

  if (process.platform !== 'darwin') {
    globalShortcut.register('CommandOrControl+Shift+C', translateSelected);
  }else{
    globalShortcut.register('Alt+Space', translateSelected);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
  
  mainWin.on('closed', () => {
    app.quit();
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})