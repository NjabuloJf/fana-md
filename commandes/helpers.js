// helpers.js
const conf = require("../set");
const axios = require("axios");

async function translateText(text, targetLang) {
    try {
        if (!targetLang || targetLang === 'en') return text;
        try {
            const { translate } = require('@vitalets/google-translate-api');
            const result = await translate(text, { to: targetLang });
            return result.text;
        } catch (e) {
            const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`, {
                timeout: 5000
            });
            if (response.data && response.data.responseData) {
                return response.data.responseData.translatedText || text;
            }
            return text;
        }
    } catch (error) {
        return text;
    }
}

async function getTranslatedButton() {
    const lang = conf.LANGUAGE || "en";
    const text = await translateText("🌐 WA Channel", lang);
    return text;
}

module.exports = { translateText, getTranslatedButton };
