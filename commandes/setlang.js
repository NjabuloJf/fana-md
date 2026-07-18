const { fana } = require("../njabulo/fana");
const conf = require("../set");
const fs = require("fs-extra");
const axios = require("axios");

// ========== TRANSLATION FUNCTION ==========
let translateText = async (text, targetLang) => {
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
        console.error('Translation error:', error.message);
        return text;
    }
};

// ========== TRANSLATED BUTTON FUNCTION ==========
async function getTranslatedButton() {
    const lang = conf.LANGUAGE || "en";
    return await translateText("🌐 WA Channel", lang);
}

// ========== SEND MESSAGE WITH TRANSLATED BUTTONS ==========
async function sendMessage(zk, chatId, text, ms) {
    const buttonText = await getTranslatedButton();
    
    const buttons = [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: buttonText,
                id: "backup channel",
                url: "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
            }),
        }
    ];
    
    await zk.sendMessage(chatId, {
        interactiveMessage: {
            header: text,
            buttons,
            headerType: 1
        }
    }, { quoted: ms });
}

const languageNames = {
    en: "English",
    sn: "Shona",
    nd: "Ndebele",
    af: "Afrikaans",
    zu: "Zulu",
    xh: "Xhosa",
    pt: "Portuguese",
    sw: "Swahili",
    hi: "Hindi",
    ar: "Arabic",
    fr: "French",
    es: "Spanish",
    zh: "Chinese",
    de: "German",
    ha: "Hausa",
    ig: "Igbo",
    yo: "Yoruba",
    bn: "Bengali",
    ta: "Tamil",
    te: "Telugu",
    mr: "Marathi",
    gu: "Gujarati",
    ku: "Kurdish",
    fa: "Persian",
    he: "Hebrew",
    tr: "Turkish",
    it: "Italian",
    ru: "Russian",
    nl: "Dutch",
    el: "Greek",
    pl: "Polish",
    ja: "Japanese",
    ko: "Korean",
    th: "Thai",
    vi: "Vietnamese",
    id: "Indonesian",
    tl: "Filipino",
    ms: "Malay",
    vmw: "Makua",
    seh: "Sena",
    ts: "Tsonga",
    ki: "Kikuyu",
    luo: "Luo",
    luh: "Luhya",
    kal: "Kalenjin",
    qu: "Quechua"
};

// ========== SETLANG COMMAND ==========
fana({
    nomCom: "setlang",
    alias: ["setlanguage", "changelang"],
    categorie: "Settings",
    reaction: "🔤"
}, async (dest, zk, commandeOptions) => {
    const { ms, repondre, arg, superUser } = commandeOptions;

    const lang = conf.LANGUAGE || "en";
    
    const onlyOwnerMsg = await translateText("❌ *Only bot owner can change language!*", lang);
    const invalidMsg = await translateText("❌ *Invalid language code!*", lang);
    const changedMsg = await translateText("✅ *Language changed successfully!*", lang);
    const availableMsg = await translateText("📌 *Available Languages:*", lang);
    const usageMsg = await translateText("📝 *Usage:* .setlang <code>", lang);
    const restartMsg = await translateText("🔄 *Restart bot for changes to take effect.*", lang);
    const currentMsg = await translateText("📌 *Current Language:*", lang);
    const errorMsg = await translateText("❌ *Error changing language:*", lang);

    if (!superUser) {
        return await sendMessage(zk, dest, onlyOwnerMsg, ms);
    }

    if (!arg || !arg[0]) {
        const currentLangName = languageNames[lang] || "English";
        let langList = `${availableMsg}\n\n${currentMsg} ${currentLangName} (${lang})\n\n`;
        
        Object.entries(languageNames).forEach(([code, name]) => {
            const marker = code === lang ? "👉 " : "   ";
            langList += `${marker}${name} (${code})\n`;
        });
        
        langList += `\n${usageMsg}\n💡 *Example:* .setlang zu`;
        
        return await sendMessage(zk, dest, langList, ms);
    }

    const langCode = arg[0].toLowerCase();
    
    if (!languageNames[langCode]) {
        return await sendMessage(zk, dest, `${invalidMsg}\n\n📌 *Available codes:* ${Object.keys(languageNames).join(', ')}`, ms);
    }

    try {
        const setPath = __dirname + "/../set.js";
        let setContent = fs.readFileSync(setPath, 'utf8');
        
        setContent = setContent.replace(
            /LANGUAGE: process\.env\.LANGUAGE \|\| ".*"/,
            `LANGUAGE: process.env.LANGUAGE || "${langCode}"`
        );
        
        fs.writeFileSync(setPath, setContent);
        
        conf.LANGUAGE = langCode;
        
        const newLangName = languageNames[langCode];
        await sendMessage(zk, dest, `${changedMsg}\n\n🌍 *New Language:* ${newLangName}\n📌 *Code:* ${langCode}\n\n${restartMsg}`, ms);
        
    } catch (error) {
        console.error("Language change error:", error);
        await sendMessage(zk, dest, `${errorMsg} ${error.message}`, ms);
    }
});
