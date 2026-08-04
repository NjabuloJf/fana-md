const { fana } = require("../njabulo/fana");
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { ajouterOuMettreAJourJid, mettreAJourAction, verifierEtatJid } = require("../bdd/antilien");
const { atbajouterOuMettreAJourJid, atbverifierEtatJid } = require("../bdd/antibot");
const { search, download } = require("aptoide-scraper");
const fs = require("fs-extra");
const config = require("../set");
const { default: axios } = require('axios');

// ========== GOOGLE TRANSLATE API ==========
let translateText = async (text, targetLang) => {
    try {
        // ========== FIX: Validate targetLang ==========
        if (!targetLang || targetLang === 'en' || typeof targetLang !== 'string') {
            return text;
        }
        targetLang = targetLang.toString().toLowerCase().trim();
        if (targetLang.length > 5 || targetLang.length < 2) {
            return text;
        }
        if (!text) return text;
        
        try {
            const { translate } = require('@vitalets/google-translate-api');
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
    // ========== FIX: Validate targetLang ==========
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

// ========== GET LANGUAGE SAFELY ==========
function getLanguage() {
    const lang = config.LANGUAGE || "en";
    if (typeof lang === 'string') {
        return lang;
    }
    console.log('⚠️ LANGUAGE is not a string, using default "en"');
    return "en";
}

// ========== TRANSLATED BUTTON FUNCTION ==========
async function getTranslatedButton() {
    const lang = getLanguage();
    return await translateTextWithCache("🌐 bot Channel", lang);
}

// ── Random image list ─────────────────────────────────────────────
const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Base button definition ────────────────────────────────────────
async function getButtons() {
    const waChannel = await getTranslatedButton();
    return [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: waChannel,
                id: "backup channel",
                url: config.GURL,
            }),
        },
    ];
}

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
    try {
        const buttons = await getButtons();
        await zk.sendMessage(
            chatId,
            {
                interactiveMessage: {
                    image: { url: randomNjabulourl },
                    header: text,
                    buttons,
                    headerType: 1
                }
            },
            { quoted: ms }
        );
    } catch (error) {
        console.error("Error sending formatted message:", error);
        // Fallback: send as text
        try {
            await zk.sendMessage(chatId, { text: text }, { quoted: ms });
        } catch (e) {
            console.error("Fallback message also failed:", e);
        }
    }
}

// ========== TRANSLATED TEXTS FUNCTION ==========
async function getTranslatedTexts(lang) {
    return {
        groupsOnly: await translateTextWithCache("❌ For groups only", lang),
        antilinkCommands: await translateTextWithCache("📌 *ANTILINK COMMANDS*\n\nantilink on - Activate anti-link\nantilink off - Deactivate anti-link\nantilink action/remove - Remove user\nantilink action/warn - Give warning\nantilink action/delete - Delete link only", lang),
        alreadyActivated: await translateTextWithCache("❌ Anti-link is already activated for this group", lang),
        activatedSuccess: await translateTextWithCache("✅ Anti-link activated successfully", lang),
        deactivatedSuccess: await translateTextWithCache("✅ Anti-link deactivated successfully", lang),
        notActivated: await translateTextWithCache("❌ Anti-link is not activated for this group", lang),
        actionUpdated: await translateTextWithCache("✅ Anti-link action updated to:", lang),
        availableActions: await translateTextWithCache("❌ Available actions: warn, remove, delete", lang),
        invalidCommand: await translateTextWithCache("📌 Invalid command. Use antilink on/off or antilink action/remove/warn/delete", lang),
        errorMsg: await translateTextWithCache("❌ Error:", lang),
        notAuthorized: await translateTextWithCache("❌ You are not authorized to use this command", lang),
    };
}

// ── AntiLink command ─────────────────────────────────────────────
fana({ nomCom: "antilink", categorie: 'Group', reaction: "🔗" }, async (dest, zk, commandeOptions) => {
    var { repondre, arg, verifGroupe, superUser, verifAdmin, ms } = commandeOptions;
    const lang = getLanguage();
    
    // ========== GET TRANSLATED TEXTS ==========
    const texts = await getTranslatedTexts(lang);

    if (!verifGroupe) {
        return await sendFormattedMessage(zk, dest, texts.groupsOnly, ms);
    }
    
    if (superUser || verifAdmin) {
        const enetatoui = await verifierEtatJid(dest);
        try {
            if (!arg || !arg[0] || arg === ' ') {
                await sendFormattedMessage(zk, dest, texts.antilinkCommands, ms);
                return;
            };
            
            if (arg[0] === 'on') {
                if (enetatoui) {
                    await sendFormattedMessage(zk, dest, texts.alreadyActivated, ms);
                } else {
                    await ajouterOuMettreAJourJid(dest, "oui");
                    await sendFormattedMessage(zk, dest, texts.activatedSuccess, ms);
                }
            } else if (arg[0] === "off") {
                if (enetatoui) {
                    await ajouterOuMettreAJourJid(dest, "non");
                    await sendFormattedMessage(zk, dest, texts.deactivatedSuccess, ms);
                } else {
                    await sendFormattedMessage(zk, dest, texts.notActivated, ms);
                }
            } else if (arg.join('').split("/")[0] === 'action') {
                let action = (arg.join('').split("/")[1])?.toLowerCase();
                if (action == 'remove' || action == 'warn' || action == 'delete') {
                    await mettreAJourAction(dest, action);
                    await sendFormattedMessage(zk, dest, `${texts.actionUpdated} ${action}`, ms);
                } else {
                    await sendFormattedMessage(zk, dest, texts.availableActions, ms);
                }
            } else {
                await sendFormattedMessage(zk, dest, texts.invalidCommand, ms);
            }
        } catch (error) {
            console.error("Anti-link error:", error);
            await sendFormattedMessage(zk, dest, `${texts.errorMsg} ${error.message}`, ms);
        }
    } else {
        await sendFormattedMessage(zk, dest, texts.notAuthorized, ms);
    }
});
