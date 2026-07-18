const { fana } = require("../njabulo/fana");
const conf = require("../set");
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

// ========== LANGUAGE NAMES ==========
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
    de: "German"
};

// ========== LANGUAGE SECTIONS ==========
const languageSections = [
    {
        title: "🌍 Southern Africa",
        rows: [
            { title: "English", description: "🇬🇧 English", rowId: ".setlang en" },
            { title: "Shona", description: "🇿🇼 Shona", rowId: ".setlang sn" },
            { title: "Ndebele", description: "🇿🇼 Ndebele", rowId: ".setlang nd" },
            { title: "Afrikaans", description: "🇿🇦 Afrikaans", rowId: ".setlang af" },
            { title: "Zulu", description: "🇿🇦 Zulu", rowId: ".setlang zu" },
            { title: "Xhosa", description: "🇿🇦 Xhosa", rowId: ".setlang xh" }
        ]
    },
    {
        title: "🌍 Mozambique",
        rows: [
            { title: "Portuguese", description: "🇵🇹 Portuguese", rowId: ".setlang pt" },
            { title: "Makua", description: "🇲🇿 Makua", rowId: ".setlang vmw" },
            { title: "Sena", description: "🇲🇿 Sena", rowId: ".setlang seh" },
            { title: "Tsonga", description: "🇲🇿 Tsonga", rowId: ".setlang ts" }
        ]
    },
    {
        title: "🌍 Kenya",
        rows: [
            { title: "Swahili", description: "🇰🇪 Swahili", rowId: ".setlang sw" },
            { title: "Kikuyu", description: "🇰🇪 Kikuyu", rowId: ".setlang ki" },
            { title: "Luo", description: "🇰🇪 Luo", rowId: ".setlang luo" },
            { title: "Luhya", description: "🇰🇪 Luhya", rowId: ".setlang luh" },
            { title: "Kalenjin", description: "🇰🇪 Kalenjin", rowId: ".setlang kal" }
        ]
    },
    {
        title: "🌍 Nigeria",
        rows: [
            { title: "Hausa", description: "🇳🇬 Hausa", rowId: ".setlang ha" },
            { title: "Igbo", description: "🇳🇬 Igbo", rowId: ".setlang ig" },
            { title: "Yoruba", description: "🇳🇬 Yoruba", rowId: ".setlang yo" }
        ]
    },
    {
        title: "🌍 India",
        rows: [
            { title: "Hindi", description: "🇮🇳 Hindi", rowId: ".setlang hi" },
            { title: "Bengali", description: "🇮🇳 Bengali", rowId: ".setlang bn" },
            { title: "Tamil", description: "🇮🇳 Tamil", rowId: ".setlang ta" },
            { title: "Telugu", description: "🇮🇳 Telugu", rowId: ".setlang te" },
            { title: "Marathi", description: "🇮🇳 Marathi", rowId: ".setlang mr" },
            { title: "Gujarati", description: "🇮🇳 Gujarati", rowId: ".setlang gu" }
        ]
    },
    {
        title: "🌍 Middle East",
        rows: [
            { title: "Arabic", description: "🇮🇶 Arabic", rowId: ".setlang ar" },
            { title: "Kurdish", description: "🇮🇶 Kurdish", rowId: ".setlang ku" },
            { title: "Persian", description: "🇮🇷 Persian", rowId: ".setlang fa" },
            { title: "Hebrew", description: "🇮🇱 Hebrew", rowId: ".setlang he" },
            { title: "Turkish", description: "🇹🇷 Turkish", rowId: ".setlang tr" }
        ]
    },
    {
        title: "🌍 Europe",
        rows: [
            { title: "French", description: "🇫🇷 French", rowId: ".setlang fr" },
            { title: "Spanish", description: "🇪🇸 Spanish", rowId: ".setlang es" },
            { title: "German", description: "🇩🇪 German", rowId: ".setlang de" },
            { title: "Italian", description: "🇮🇹 Italian", rowId: ".setlang it" },
            { title: "Russian", description: "🇷🇺 Russian", rowId: ".setlang ru" },
            { title: "Dutch", description: "🇳🇱 Dutch", rowId: ".setlang nl" },
            { title: "Greek", description: "🇬🇷 Greek", rowId: ".setlang el" },
            { title: "Polish", description: "🇵🇱 Polish", rowId: ".setlang pl" }
        ]
    },
    {
        title: "🌍 Asia",
        rows: [
            { title: "Chinese", description: "🇨🇳 Chinese", rowId: ".setlang zh" },
            { title: "Japanese", description: "🇯🇵 Japanese", rowId: ".setlang ja" },
            { title: "Korean", description: "🇰🇷 Korean", rowId: ".setlang ko" },
            { title: "Thai", description: "🇹🇭 Thai", rowId: ".setlang th" },
            { title: "Vietnamese", description: "🇻🇳 Vietnamese", rowId: ".setlang vi" },
            { title: "Indonesian", description: "🇮🇩 Indonesian", rowId: ".setlang id" },
            { title: "Filipino", description: "🇵🇭 Filipino", rowId: ".setlang tl" },
            { title: "Malay", description: "🇲🇾 Malay", rowId: ".setlang ms" }
        ]
    },
    {
        title: "🌍 South America",
        rows: [
            { title: "Spanish", description: "🇪🇸 Spanish", rowId: ".setlang es" },
            { title: "Portuguese", description: "🇵🇹 Portuguese", rowId: ".setlang pt" },
            { title: "Quechua", description: "🇵🇪 Quechua", rowId: ".setlang qu" }
        ]
    }
];

// ========== LANG COMMAND ==========
fana({
    nomCom: "lang",
    alias: ["language", "langs"],
    categorie: "Settings",
    reaction: "🌍"
}, async (dest, zk, commandeOptions) => {
    const { ms } = commandeOptions;

    const lang = conf.LANGUAGE || "en";
    const currentLangName = languageNames[lang] || "English";
    
    // Translate button text
    const buttonText = await getTranslatedButton();
    
    // Translate the choose text
    const chooseText = await translateText("Choose your preferred language from the list below.", lang);
    const poweredBy = await translateText("Powered by NJABULO MD", lang);
    const currentLabel = await translateText("Current Language:", lang);

    await zk.sendPresenceUpdate('composing', dest);
    await new Promise(r => setTimeout(r, 800));
    await zk.sendPresenceUpdate('paused', dest);

    // Send as button with list
    const messageText = `╭━━━━━━━━━━━━━━━━━━━━╮
┃   🌍 *BOT LANGUAGE* 🌍
┣━━━━━━━━━━━━━━━━━━━━┫
┃
┃ ${chooseText}
┃
┃ 📌 *${currentLabel}* 
┃ ${currentLangName} (${lang})
┃
┃ 📋 *Tap the button below*
┃
┣━━━━━━━━━━━━━━━━━━━━┫
┃ 💫 ${poweredBy}
╰━━━━━━━━━━━━━━━━━━━━╯`;

    // Send simple message with button
    await zk.sendMessage(dest, {
        text: messageText,
        buttons: [
            {
                buttonId: "open_lang_menu",
                buttonText: { displayText: "🌍 Change Language" },
                type: 1
            }
        ],
        viewOnce: false
    }, { quoted: ms });

    // Send the list message
    try {
        await zk.sendMessage(dest, {
            listMessage: {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃   🌍 *CHOOSE LANGUAGE* 🌍
┣━━━━━━━━━━━━━━━━━━━━┫
┃
┃ ${await translateText("Select your preferred language from the list below.", lang)}
┃
┃ 📌 *${await translateText("Current Language:", lang)}* 
┃ ${currentLangName} (${lang})
┃
┣━━━━━━━━━━━━━━━━━━━━┫
┃ 💫 ${poweredBy}
╰━━━━━━━━━━━━━━━━━━━━╯`,
                footer: "✨ NJABULO MD",
                title: "🌍 Language Settings",
                buttonText: await translateText("📋 Choose Language", lang),
                sections: languageSections,
                listType: 1
            }
        }, { quoted: ms });
    } catch (error) {
        console.error("List message error:", error);
        // Fallback: Send as text
        let langList = `${await translateText("📌 *Available Languages:*", lang)}\n\n`;
        languageSections.forEach(section => {
            langList += `*${section.title}*\n`;
            section.rows.forEach(row => {
                langList += `  • ${row.title} - ${row.description}\n`;
            });
            langList += "\n";
        });
        langList += `📝 *${await translateText("Usage:", lang)}* .setlang <code>\n💡 *${await translateText("Example:", lang)}* .setlang zu`;
        
        await zk.sendMessage(dest, { text: langList }, { quoted: ms });
    }
});
