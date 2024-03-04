import Icon from './favicon/favicon.png';

const { app, BrowserWindow, clipboard, ipcMain, globalShortcut, Menu } = require('electron')
const Store = require('electron-store');
const path = require('node:path');
const {keyboard, Key} = require("@nut-tree/nut-js");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
};

let mainWin;
let currentLanguage;
let menu;
const configStore = new Store({
  encryptionKey: '1?dnG23dd/sAnd3.d|'
});
const languageDict = {
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


function languageConvert(locale) {
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

function readConfig() {
  try {
    mainWin.webContents.send('key-update', configStore.get('apiKey'));
  } catch (error) {
    console.error('Error reading config:', error);
  }
}

function saveConfig(event, key) {
  try {
    configStore.set('apiKey', key);
    mainWin.webContents.send('key-update', key);
    event.sender.close();
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

function buildMenu(language) {
  const languageSet = languageDict[language];

  const template = [
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
          { role: 'about', label: languageSet['About'], selector: "orderFrontStandardAboutPanel:" },
          { type: "separator" },
          { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
      ]
    },
    {
      label: "Edit",
      submenu: [
          { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
          { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
          { type: "separator" },
          { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
          { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
          { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
          { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }  
      ]
    }
  ];

  return Menu.buildFromTemplate(template);
}

function switchLanguage(language) {
  currentLanguage = language;
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('language', currentLanguage);
  });
  menu = buildMenu(language); 
  return menu;
}

const createMainWindow = () => {
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
  // mainWin.webContents.openDevTools();

  return mainWin;
};

function createKeyWindow () {
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

async function translateSelected(timeout=500){
  const oldClipboardContent = clipboard.readText();
  await keyboard.type(Key.LeftControl,Key.C);
  const clipboardUpdate = new Promise((resolve) =>{
    const intID = setInterval(()=>{
      const clipboardContent = clipboard.readText();
      if (clipboardContent!=oldClipboardContent){
        resolve(clipboardContent);
        clearInterval(intID);
      }
    },100)
    setTimeout(()=>{resolve(oldClipboardContent)},timeout)
  })
  
  const result = await clipboardUpdate;
  mainWin.show();
  mainWin.webContents.send('shortcut', result);
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
    ipcMain.on('menu', () => menu.popup(mainWin))
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
