const { fana } = require("../njabulo/fana");
const { getContentType } = require("@whiskeysockets/baileys");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const config = require("../set");
const axios = require("axios");

// ========== GOOGLE TRANSLATE API ==========
let translateText = async (text, targetLang) => {
    try {
        if (!targetLang || targetLang === 'en') return text;
        try {
            const { translate } = require('@vitalets/google-translate-api');
            const result = await translate(text, { to: targetLang });
            return result.text;
        } catch (e) {
            // Fallback to MyMemory API
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

// ========== GET TRANSLATED BUTTONS ==========
async function getTranslatedButtons() {
    const lang = config.LANGUAGE || "en";
    const waChannel = await translateText("🌐WA channel", lang);
    const mentionMessage = await translateText("*Mention the message that you want to save*", lang);
    const errorMessage = await translateText("Error sending message", lang);
    const unsupportedMessage = await translateText("Unsupported message type", lang);
    
    return { 
        waChannel, 
        mentionMessage, 
        errorMessage, 
        unsupportedMessage 
    };
}

// ========== CREATE DYNAMIC BUTTONS ==========
async function createButtons() {
    const btn = await getTranslatedButtons();
    return [{
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
            display_text: btn.waChannel,
            id: "backup channel",
            url: config.GURL
        }),
    }];
}

fana({
    nomCom: "vv",
    aliases: ["send", "keep"],
    categorie: "General"
}, async (dest, zk, commandeOptions) => {
    try {
        const { repondre, msgRepondu, superUser, ms } = commandeOptions;
        const lang = config.LANGUAGE || "en";
        
        // ========== GET TRANSLATED TEXTS ==========
        const translated = await getTranslatedButtons();
        const buttons = await createButtons();

        // ========== CHECK IF REPLY EXISTS ==========
        if (!msgRepondu) {
            await zk.sendMessage(dest, {
                interactiveMessage: {
                    header: translated.mentionMessage,
                    buttons: buttons,
                    headerType: 1
                }
            }, { quoted: ms });
            return;
        }

        const type = getContentType(msgRepondu);
        let message;

        // ========== HANDLE DIFFERENT MESSAGE TYPES ==========
        if (type === 'conversation') {
            message = { text: msgRepondu.conversation };
            
        } else if (type === 'imageMessage') {
            const media = await zk.downloadAndSaveMediaMessage(msgRepondu.imageMessage);
            const caption = msgRepondu.imageMessage.caption || '';
            
            // Translate caption if needed
            let translatedCaption = caption;
            if (lang !== 'en' && caption) {
                translatedCaption = await translateText(caption, lang);
            }
            
            message = {
                interactiveMessage: {
                    image: { url: media },
                    header: translatedCaption,
                    headerType: 1,
                    buttons: buttons,
                },
            };
            
        } else if (type === 'videoMessage') {
            const media = await zk.downloadAndSaveMediaMessage(msgRepondu.videoMessage);
            const caption = msgRepondu.videoMessage.caption || '';
            
            // Translate caption if needed
            let translatedCaption = caption;
            if (lang !== 'en' && caption) {
                translatedCaption = await translateText(caption, lang);
            }
            
            message = {
                interactiveMessage: {
                    video: { url: media },
                    header: translatedCaption,
                    buttons: buttons,
                },
            };
            
        } else if (type === 'stickerMessage') {
            const media = await zk.downloadAndSaveMediaMessage(msgRepondu.stickerMessage);
            
            // Translate sticker pack name
            let packName = '𝚃𝙸𝙼𝙽𝙰𝚂𝙰 𝚃𝙼𝙳';
            if (lang !== 'en') {
                const translatedPack = await translateText('TIMNASA TMD', lang);
                packName = translatedPack;
            }
            
            const stickerMess = new Sticker(media, {
                pack: packName,
                type: StickerTypes.CROPPED,
                categories: ["🤩", "🎉"],
                id: "12345",
                quality: 70,
                background: "transparent",
            });
            const stickerBuffer2 = await stickerMess.toBuffer();
            message = { sticker: stickerBuffer2 };
            
        } else {
            message = { text: translated.unsupportedMessage };
        }

        // ========== SEND THE MESSAGE ==========
        await zk.sendMessage(dest, message, { quoted: ms });
        
    } catch (error) {
        console.error("Error sending message:", error);
        
        // ========== TRANSLATED ERROR MESSAGE ==========
        const errorText = await translateText("Error sending message", config.LANGUAGE || "en");
        const buttons = await createButtons();
        
        await zk.sendMessage(dest, {
            interactiveMessage: {
                header: errorText,
                buttons: buttons,
                headerType: 1
            }
        }, { quoted: ms });
    }
});0
