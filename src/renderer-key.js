import  './index.css'
import Icon from './favicon_reverse/ms-icon-144x144.png';

const languageDict = require('./languageDict');
const title = document.getElementById('title');
const key = document.getElementById('key');
const logo = document.getElementById('title-bar-icon');
let languageSet;

window.electronAPI.language((value) => {
    languageSet = languageDict[value]
    title.textContent = languageSet['title'];
    key.placeholder = languageSet['keyplaceholder'];
})

logo.src = Icon;

window.saveConfig = function() {
    window.electronAPI.keySend(key.value);
}