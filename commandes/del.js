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

// ========== SEND MESSAGE WITH TRANSLATED BUTTONS ==========
async function sendMessage(zk, chatId, text, ms) {
    const lang = conf.LANGUAGE || "en";
    
    // Translate button text
    const buttonText = await translateText("🌐 WA Channel", lang);
    
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

// ========== DEL COMMAND ==========
fana(
    { nomCom: "del", categorie: "Group", reaction: "🗑️" },
    async (dest, zk, commandeOptions) => {
        const {
            ms,
            repondre,
            verifGroupe,
            auteurMsgRepondu,
            idBot,
            msgRepondu,
            verifAdmin,
            superUser,
        } = commandeOptions;

        const lang = conf.LANGUAGE || "en";
        
        const replyMsg = await translateText("⚠️ *Please reply to the message you want to delete.*", lang);
        const successMsg = await translateText("✅ *Message deleted successfully.*", lang);
        const adminRightsMsg = await translateText("❌ *I need admin rights to delete messages.*", lang);
        const onlyAdminsMsg = await translateText("❌ *Sorry, only group admins can delete messages.*", lang);

        if (!msgRepondu) {
            return await sendMessage(zk, dest, replyMsg, ms);
        }

        if (superUser && auteurMsgRepondu === idBot) {
            const key = {
                remoteJid: dest,
                fromMe: true,
                id: ms.message.extendedTextMessage.contextInfo.stanzaId,
            };
            await zk.sendMessage(dest, { delete: key });
            await sendMessage(zk, dest, successMsg, ms);
            return;
        }

        if (verifGroupe) {
            if (verifAdmin || superUser) {
                try {
                    const key = {
                        remoteJid: dest,
                        id: ms.message.extendedTextMessage.contextInfo.stanzaId,
                        fromMe: false,
                        participant: ms.message.extendedTextMessage.contextInfo.participant,
                    };
                    await zk.sendMessage(dest, { delete: key });
                    await sendMessage(zk, dest, successMsg, ms);
                } catch (e) {
                    await sendMessage(zk, dest, adminRightsMsg, ms);
                }
            } else {
                await sendMessage(zk, dest, onlyAdminsMsg, ms);
            }
        }
    }
);
