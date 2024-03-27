import './index.css';
import Icon from './favicon_reverse/favicon-32x32-sharpen.png';

const languageDict = require('./languageDict');
const options = document.getElementById('options');
const sourceLanguageSelect = document.getElementById('source-language');
const targetLanguageSelect = document.getElementById('target-language');
const promptInput = document.getElementById('prompt');
const textInput = document.getElementById('text-to-translate');
const textOutput = document.getElementById('translation-result');
const outputPan = document.getElementById('translated-text');
const loading = document.getElementById('loading-background');
const sourceLanguages = sourceLanguageSelect.getElementsByTagName('option');
const targetLanguages = targetLanguageSelect.getElementsByTagName('option');
const logo = document.getElementById('title-bar-icon');

let timer; // 用于存储定时器ID
let ticking = false;
let prompt;
let platform = window.electronAPI.platform();
let languageSet;
let OPENAI_API_KEY;
const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

  
textInput.addEventListener('scroll', syncScroll(textInput,textOutput));
textOutput.addEventListener('scroll', syncScroll(textOutput,textInput));
textInput.addEventListener('mouseover', () => {textInput.dataset.eventEnabled = "true"});
textOutput.addEventListener('mouseover', () => {textOutput.dataset.eventEnabled = "true"});
textOutput.addEventListener('touchstart ', () => {textOutput.dataset.eventEnabled = "true"});
textInput.addEventListener('mouseout', () => {textInput.dataset.eventEnabled = "false"});
textOutput.addEventListener('mouseout', () => {textOutput.dataset.eventEnabled = "false"});
textOutput.addEventListener('touchend',  () => {textOutput.dataset.eventEnabled = "false"});
textInput.dataset.eventEnabled = "false"
textOutput.dataset.eventEnabled = "false"
sourceLanguageSelect.addEventListener('change', translateText);
targetLanguageSelect.addEventListener('change', translateText);
promptInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
        translateText();
    }, 500);
});
textInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
        translateText();
    }, 500);
});

logo.src = Icon;

if (platform === 'darwin') {
    options.style.right = '4px';
}else{
    options.style.left = '4px';
}

window.electronAPI.language((value) => {
    languageSet = languageDict[value]
    for (let sourceLanguage of sourceLanguages) {
        sourceLanguage.textContent = languageSet[sourceLanguage.value];
    };
    for (let targetLanguage of targetLanguages) {
        targetLanguage.textContent = languageSet[targetLanguage.value];
    };
    promptInput.placeholder = languageSet['prompt'];
    textInput.placeholder = languageSet['input'];
})

window.electronAPI.shortcut((value) => {
    textInput.value = value;
    translateText()
})

window.electronAPI.keyUpdate((key) => {
    OPENAI_API_KEY = key;
})

async function translateText() {
    if (!OPENAI_API_KEY) {
        outputPan.innerText = languageSet['keymissing'];
        return;
    };
    const textToTranslate = textInput.value; // 待翻译的文本
    if (textToTranslate){
        loading.style.display = 'flex';
        outputPan.style.display = 'none';
        const sourceLanguage = sourceLanguageSelect.value;
        const targetLanguage = targetLanguageSelect.value;
        const extraPrompt = promptInput.value;
        // console.log("源语言:", sourceLanguage);
        // console.log("目标语言:", targetLanguage);
        // const prompt = `You will be provided with something in ${sourceLanguage}, and your task is to translate it into ${targetLanguage} no matter what is provided, only reply with translated text. ${extraPrompt}`; // 提示内容
        if (sourceLanguage!='Auto'){
            prompt = `You will be provided with something in ${sourceLanguage} to translate to ${targetLanguage}, and your task is to provide translated text ONLY no matter how.${extraPrompt}`; // 提示内容
        }else{
            prompt = `You will be provided with something to translate to ${targetLanguage}, and your task is to provide translated text ONLY no matter how.${extraPrompt}`; // 提示内容
        };
        // console.log("提示内容:", prompt);



        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: prompt
                    },
                    {
                        role: "user",
                        content: textToTranslate
                    }
                ],
                temperature: 0,
                // max_tokens: 256,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0
            })
        });

        if (!response.ok) {
            outputPan.innerText = languageSet['failedrequest'];
            loading.style.display = 'none';
            outputPan.style.display = 'block';
            return;
        }

        const data = await response.json();
        const translatedText = data.choices[0].message.content;
        loading.style.display = 'none';
        outputPan.style.display = 'block';
        outputPan.innerText = translatedText;
    }
}
window.translateText = translateText;

window.swapLanguages = function() {
    if (sourceLanguageSelect.value != 'Auto') {
        const tempSourceLanguage = sourceLanguageSelect.value;
        sourceLanguageSelect.value = targetLanguageSelect.value;
        targetLanguageSelect.value = tempSourceLanguage;
        translateText()
    };
};

function syncScroll(fromElement, toElement) {
    return function() {
        if (!ticking && fromElement.dataset.eventEnabled == "true") {
            ticking = true;
            // toElement.dataset.eventEnabled = "false";
            requestAnimationFrame(function() {
                // 计算百分比
                const scrollPercentage = fromElement.scrollTop / (fromElement.scrollHeight - fromElement.clientHeight);

                // 应用百分比到目标元素
                toElement.scrollTop = scrollPercentage * (toElement.scrollHeight - toElement.clientHeight);

                ticking = false;
                // toElement.dataset.eventEnabled = "true";
            });
        }
        
    };
}

function clearInput() {
    textInput.value = '';
    outputPan.innerText = '';
}

window.clearInput = clearInput;

async function copyOutput() {
  try {
    await navigator.clipboard.writeText(outputPan.innerText);
  } catch (error) {
    console.error(error.message);
  }
}

window.copyOutput = copyOutput;