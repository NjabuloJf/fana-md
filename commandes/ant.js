const { fana } = require("../njabulo/fana")
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const fs = require("fs-extra");
const conf = require("../set");
const axios = require('axios');
const { translate } = require('@vitalets/google-translate-api');

// ========== GOOGLE TRANSLATE API ==========
let translateText = async (text, targetLang) => {
    try {
        if (!targetLang || targetLang === 'en' || typeof targetLang !== 'string') {
            return text;
        }
        targetLang = targetLang.toString().toLowerCase().trim();
        if (targetLang.length > 5 || targetLang.length < 2) {
            return text;
        }
        if (!text) return text;
        
        try {
            const result = await translate(text, { to: targetLang });
            return result.text;
        } catch (e) {
            console.log('⚠️ Google Translate failed, using fallback...');
            try {
                const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`, {
                    timeout: 5000
                });
                if (response.data && response.data.responseData) {
                    return response.data.responseData.translatedText || text;
                }
                return text;
            } catch (fallbackError) {
                console.error('⚠️ Fallback translation failed:', fallbackError.message);
                return text;
            }
        }
    } catch (error) {
        console.error('⚠️ Translation error:', error.message);
        return text;
    }
};

// ========== TRANSLATION CACHE ==========
const translationCache = new Map();

let translateTextWithCache = async (text, targetLang) => {
    if (!targetLang || targetLang === 'en' || typeof targetLang !== 'string') return text;
    targetLang = targetLang.toString().toLowerCase().trim();
    if (targetLang.length > 5 || targetLang.length < 2) return text;
    if (!text) return text;
    
    const cacheKey = `${text}_${targetLang}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }
    
    try {
        const result = await translateText(text, targetLang);
        translationCache.set(cacheKey, result);
        setTimeout(() => translationCache.delete(cacheKey), 3600000);
        return result;
    } catch (error) {
        console.error('⚠️ Translation error:', error.message);
        return text;
    }
};

// ========== TRANSLATED TEXTS ==========
async function getTranslatedTexts() {
    const lang = conf.LANGUAGE || "en";
    return {
        groupOnly: await translateTextWithCache("❌ This command only works in groups!", lang),
        notAdmin: await translateTextWithCache("❌ You need to be an admin or super user to use this command!", lang),
        tagMember: await translateTextWithCache("📌 Please tag the member to be removed", lang),
        notInGroup: await translateTextWithCache("❌ This user is not part of the group.", lang),
        isAdmin: await translateTextWithCache("❌ This member cannot be removed because they are an administrator of the group.", lang),
        botNotAdmin: await translateTextWithCache("❌ Sorry, I cannot perform this action because I am not an administrator of the group.", lang),
        removed: await translateTextWithCache("was removed from the group.", lang),
        removedBy: await translateTextWithCache("Removed by:", lang),
        error: await translateTextWithCache("❌ An error occurred while processing your request.", lang),
        poweredBy: await translateTextWithCache("Powered by NJABULO JB", lang),
        chooseOption: await translateTextWithCache("Reply with number 1, 2, or 3 to choose:", lang),
        invalidChoice: await translateTextWithCache("❌ Invalid choice! Please reply with 1, 2, or 3.", lang),
        timeoutMsg: await translateTextWithCache("⏰ Timeout! Please try again.", lang),
        waChannel: await translateTextWithCache("🌐 WA Channel", lang),
        removeTitle: await translateTextWithCache("👨🏿‍💼 REMOVE MEMBER", lang),
        howToUse: await translateTextWithCache("📌 HOW TO USE", lang),
        usage: await translateTextWithCache("Usage:", lang),
        example: await translateTextWithCache("Example:", lang),
        instructions: await translateTextWithCache("📋 Instructions", lang),
        needHelp: await translateTextWithCache("Need help? Contact the owner.", lang),
        removeNow: await translateTextWithCache("👨🏿‍💼 Remove Now", lang),
    };
}

// ========== RANDOM IMAGE ==========
const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ========== ACTIVE REQUESTS ==========
const activeRequests = {};

// ========== IS NUMBER SELECTION ==========
const isNumberSelection = (text) => {
    const num = parseInt(text);
    return num >= 1 && num <= 3 && !isNaN(num);
};

// ========== CREATE 3 CARDS ==========
async function createRemoveCards(zk, ms, lang) {
    const t = await getTranslatedTexts();
    
    let imageMessage = null;
    try {
        const { generateWAMessageContent } = require('@whiskeysockets/baileys');
        imageMessage = (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage;
    } catch (e) {
        console.log('⚠️ Could not load image');
    }

    // Card 1: Remove Member
    const card1 = {
        header: {
            title: `👨🏿‍💼 ${t.removeTitle}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `${t.howToUse}\n\n` +
                  `📌 ${t.usage}\n` +
                  `.remove @username\n\n` +
                  `📌 ${t.example}\n` +
                  `.remove @user123\n\n` +
                  `⚠️ Only admins and super users can remove members\n\n` +
                  `${t.chooseOption}`,
        },
        footer: {
            text: `🔹 ${t.poweredBy}`,
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: t.waChannel,
                        url: conf.GURL
                    }),
                },
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Example",
                        copy_code: ".remove @username",
                    }),
                },
            ],
        },
    };

    // Card 2: Quick Remove
    const card2 = {
        header: {
            title: `👨🏿‍💼 ${t.removeTitle}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `📌 *Quick Remove*\n\n` +
                  `🔹 Tag the member to remove\n` +
                  `🔹 Auto-detect admin status\n` +
                  `🔹 Shows removal confirmation\n` +
                  `🔹 Super users can remove anyone\n\n` +
                  `${t.chooseOption}`,
        },
        footer: {
            text: `🔹 ${t.poweredBy}`,
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Copy Format",
                        copy_code: ".remove @username",
                    }),
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: t.waChannel,
                        url: conf.GURL
                    }),
                },
            ],
        },
    };

    // Card 3: Instructions
    const card3 = {
        header: {
            title: `📋 ${t.instructions}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `📌 *${t.instructions}*\n\n` +
                  `1️⃣ ${t.removeNow}\n` +
                  `   ${t.usage}: .remove @username\n\n` +
                  `2️⃣ Only admins can remove members\n` +
                  `3️⃣ Super users can remove anyone\n` +
                  `4️⃣ ${t.needHelp}\n\n` +
                  `${t.chooseOption}`,
        },
        footer: {
            text: `🔹 ${t.poweredBy}`,
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: t.waChannel,
                        url: conf.GURL
                    }),
                },
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Copy Help",
                        copy_code: `REMOVE COMMAND HELP:\n.remove @username\nOnly admins can remove members`,
                    }),
                },
            ],
        },
    };

    return { cards: [card1, card2, card3] };
}

// ========== SEND CAROUSEL MESSAGE ==========
async function sendCarouselMessage(zk, dest, cards, ms) {
    const t = await getTranslatedTexts();
    const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
    const message = generateWAMessageFromContent(
        dest,
        {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2,
                    },
                    interactiveMessage: {
                        body: { text: `👨🏿‍💼 *Remove Members System*` },
                        footer: { text: `🔹 ${t.poweredBy}` },
                        carouselMessage: { cards },
                    },
                },
            },
        },
        { quoted: ms }
    );

    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
    return message;
}

fana({ 
    nomCom: "remove", 
    aliases: ["kick", "removemember", "deleteuser"],
    categorie: 'Group', 
    reaction: "👨🏿‍💼" 
}, async (dest, zk, commandeOptions) => {
    let { ms, repondre, msgRepondu, infosGroupe, auteurMsgRepondu, verifGroupe, nomAuteurMessage, auteurMessage, superUser, idBot, arg, messageType } = commandeOptions;
    const lang = conf.LANGUAGE || "en";
    const t = await getTranslatedTexts();

    // ========== FIX: IGNORE REACTION MESSAGES ==========
    if (messageType === 'reactionMessage') {
        console.log('⏭️ Ignoring reaction message');
        return;
    }

    // Check if it's a group
    if (!verifGroupe) { 
        return repondre(t.groupOnly); 
    }

    // Get group participants
    let membresGroupe = verifGroupe ? await infosGroupe.participants : "";
    
    // Helper functions
    const verifMember = (user) => {
        for (const m of membresGroupe) {
            if (m.id === user) {
                return true;
            }
        }
        return false;
    }

    const memberAdmin = (membresGroupe) => {
        let admin = [];
        for (const m of membresGroupe) {
            if (m.admin == null) continue;
            admin.push(m.id);
        }
        return admin;
    }

    const a = verifGroupe ? memberAdmin(membresGroupe) : [];
    let admin = verifGroupe ? a.includes(auteurMsgRepondu) : false;
    let membre = verifMember(auteurMsgRepondu);
    let autAdmin = verifGroupe ? a.includes(auteurMessage) : false;
    
    // ========== FIX: BOT ADMIN CHECK ==========
    // Get bot's full JID (with @s.whatsapp.net)
    const botJid = idBot.includes('@') ? idBot : idBot + '@s.whatsapp.net';
    let zkad = verifGroupe ? a.includes(botJid) : false;
    
    // Debug log to check
    console.log('Bot JID:', botJid);
    console.log('Admin list:', a);
    console.log('Is bot admin?', zkad);

    // ========== CHECK FOR NUMBER SELECTION REPLY ==========
    const replyText = arg ? arg.join(' ') : '';
    if (replyText && isNumberSelection(replyText)) {
        const selectedNumber = parseInt(replyText);
        const senderJid = ms.key.remoteJid;
        
        if (!activeRequests[senderJid]) {
            await repondre(t.invalidChoice);
            return;
        }

        delete activeRequests[senderJid];

        if (zk._replyListener) {
            zk.ev.off('messages.upsert', zk._replyListener);
            zk._replyListener = null;
        }

        try {
            await zk.sendMessage(dest, {
                react: { text: "📥", key: ms.key }
            });
        } catch (e) {}

        switch(selectedNumber) {
            case 1:
                await repondre(`📌 *${t.howToUse}*\n\n` +
                    `${t.usage}: .remove @username\n\n` +
                    `${t.example}: .remove @user123\n\n` +
                    `${t.instructions}\n\n` +
                    `${t.poweredBy}`);
                break;
            case 2:
                await repondre(`📌 *${t.removeNow}*\n\n` +
                    `${t.usage}: .remove @username\n\n` +
                    `${t.example}: .remove @user123\n\n` +
                    `👨🏿‍💼 Only admins and super users can remove members\n\n` +
                    `${t.poweredBy}`);
                break;
            case 3:
                await repondre(`📋 *${t.instructions}*\n\n` +
                    `1️⃣ ${t.removeNow}\n` +
                    `   ${t.usage}: .remove @username\n\n` +
                    `2️⃣ Only admins can remove members\n` +
                    `3️⃣ Super users can remove anyone\n` +
                    `4️⃣ ${t.needHelp}\n\n` +
                    `${t.poweredBy}`);
                break;
            default:
                await repondre(t.invalidChoice);
                return;
        }
        return;
    }

    // ========== IF NO ARGUMENTS, SHOW 3 CARDS ==========
    if (arg.length === 0 && !msgRepondu) {
        const { cards } = await createRemoveCards(zk, ms, lang);
        await sendCarouselMessage(zk, dest, cards, ms);

        const senderJid = ms.key.remoteJid;
        activeRequests[senderJid] = {
            timestamp: Date.now()
        };

        if (zk._replyListener) {
            zk.ev.off('messages.upsert', zk._replyListener);
        }

        zk._replyListener = async (update) => {
            try {
                const msg = update.messages[0];
                if (!msg || !msg.message) return;
                
                // ========== FIX: IGNORE REACTION MESSAGES IN REPLY HANDLER ==========
                const msgType = Object.keys(msg.message)[0];
                if (msgType === 'reactionMessage') {
                    console.log('⏭️ Ignoring reaction in reply handler');
                    return;
                }
                
                const sender = msg.key.remoteJid;
                const content = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                
                if (!activeRequests[sender]) return;
                if (!isNumberSelection(content)) return;
                
                const selectedNumber = parseInt(content);
                delete activeRequests[sender];
                zk.ev.off('messages.upsert', zk._replyListener);
                zk._replyListener = null;

                try {
                    await zk.sendMessage(dest, {
                        react: { text: "📥", key: msg.key }
                    });
                } catch (e) {}

                switch(selectedNumber) {
                    case 1:
                        await repondre(`📌 *${t.howToUse}*\n\n` +
                            `${t.usage}: .remove @username\n\n` +
                            `${t.example}: .remove @user123\n\n` +
                            `${t.instructions}\n\n` +
                            `${t.poweredBy}`);
                        break;
                    case 2:
                        await repondre(`📌 *${t.removeNow}*\n\n` +
                            `${t.usage}: .remove @username\n\n` +
                            `${t.example}: .remove @user123\n\n` +
                            `👨🏿‍💼 Only admins and super users can remove members\n\n` +
                            `${t.poweredBy}`);
                        break;
                    case 3:
                        await repondre(`📋 *${t.instructions}*\n\n` +
                            `1️⃣ ${t.removeNow}\n` +
                            `   ${t.usage}: .remove @username\n\n` +
                            `2️⃣ Only admins can remove members\n` +
                            `3️⃣ Super users can remove anyone\n` +
                            `4️⃣ ${t.needHelp}\n\n` +
                            `${t.poweredBy}`);
                        break;
                    default:
                        await repondre(t.invalidChoice);
                        return;
                }
            } catch (err) {
                console.error('[REPLY HANDLER ERROR]', err);
            }
        };

        zk.ev.on('messages.upsert', zk._replyListener);

        setTimeout(async () => {
            const senderJid = ms.key.remoteJid;
            if (activeRequests[senderJid]) {
                delete activeRequests[senderJid];
            }
            if (zk._replyListener) {
                zk.ev.off('messages.upsert', zk._replyListener);
                zk._replyListener = null;
            }
        }, 60000);

        return;
    }

    // ========== REMOVE MEMBER LOGIC ==========
    try {
        // Check if user is admin or super user
        if (!autAdmin && !superUser) {
            return repondre(t.notAdmin);
        }

        // Check if a member was tagged
        if (!msgRepondu) {
            return repondre(t.tagMember);
        }

        // Check if bot is admin
        if (!zkad) {
            return repondre(t.botNotAdmin);
        }

        // Check if target is in group
        if (!membre) {
            return repondre(t.notInGroup);
        }

        // Check if target is admin (and user is not super user)
        if (admin && !superUser) {
            return repondre(t.isAdmin);
        }

        // REMOVE THE MEMBER
        const gifLink = "https://raw.githubusercontent.com/djalega8000/Zokou-MD/main/media/remover.gif";
        var sticker = new Sticker(gifLink, {
            pack: 'NJABULO-MD',
            author: nomAuteurMessage || 'NJABULO',
            type: StickerTypes.FULL,
            categories: ['🤩', '🎉'],
            id: '12345',
            quality: 50,
            background: '#000000'
        });

        await sticker.toFile("st.webp");

        let removedBy = superUser ? 'Super User' : `@${auteurMessage.split("@")[0]}`;
        var txt = `@${auteurMsgRepondu.split("@")[0]} ${t.removed}\n${t.removedBy} ${removedBy}`;
        
        await zk.groupParticipantsUpdate(dest, [auteurMsgRepondu], "remove");
        
        await zk.sendMessage(dest, { 
            text: txt, 
            mentions: [auteurMsgRepondu, auteurMessage],
            sticker: fs.readFileSync("st.webp")
        });
        
        fs.unlinkSync("st.webp");

    } catch (e) {
        console.error('Remove command error:', e);
        repondre(`${t.error}\n\n${t.poweredBy}`);
    }
});
