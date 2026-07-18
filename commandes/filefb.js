const { fana } = require('../njabulo/fana');
const fs = require('fs');
const getFBInfo = require("@xaviabot/fb-downloader");
const { default: axios } = require('axios');
const config = require("../set");

// ========== GOOGLE TRANSLATE API ==========
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
async function getTranslatedButtons() {
    const lang = config.LANGUAGE || "en";
    const waChannel = await translateText("🌐 Channel", lang);
    const downloadComplete = await translateText("✅ *Download complete!*", lang);
    const errorDownloading = await translateText("❌ *Error downloading video*", lang);
    const checkLink = await translateText("Please check the link and try again.", lang);
    const pleaseInsert = await translateText("⚠️ *Please insert a public Facebook video link!*", lang);
    const example = await translateText("📌 Example:", lang);
    const videoReady = await translateText("🎬 *Your video is ready!*", lang);
    const facebookVideo = await translateText("📥 *FACEBOOK VIDEO*", lang);
    const title = await translateText("📹 *Title:*", lang);
    const quality = await translateText("📎 *Quality:*", lang);
    const unknown = await translateText("Unknown", lang);
    const hdQuality = await translateText("HD", lang);
    const sdQuality = await translateText("SD", lang);
    
    return {
        waChannel,
        downloadComplete,
        errorDownloading,
        checkLink,
        pleaseInsert,
        example,
        videoReady,
        facebookVideo,
        title,
        quality,
        unknown,
        hdQuality,
        sdQuality
    };
}

// ---------- Buttons ----------
async function getButtons() {
    const lang = config.LANGUAGE || "en";
    const waChannel = await translateText("🌐 WA Channel", lang);
    return [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: waChannel,
                id: "backup channel",
                url: config.GURL || "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
            }),
        },
    ];
}

// ---------- Send formatted message with buttons ----------
async function sendFormattedMessage(zk, chatId, text, ms) {
    const buttons = await getButtons();
    await zk.sendMessage(
        chatId,
        {
            interactiveMessage: {
                header: text,
                buttons,
                headerType: 1
            }
        },
        { quoted: ms }
    );
}

// ---------- Facebook Video Downloader (HD) ----------
fana({
    nomCom: "facebook",
    alias: ["fbdown", "fbvideo"],
    categorie: "Download",
    reaction: "🖥️"
}, async (dest, zk, commandeOptions) => {
    const { repondre, ms, arg } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const t = await getTranslatedButtons();

    if (!arg[0]) {
        return await sendFormattedMessage(zk, dest, `${t.pleaseInsert}\n\n${t.example} .facebook https://www.facebook.com/.../video`, ms);
    }

    const queryURL = arg.join(" ");
    await zk.sendPresenceUpdate('composing', dest);

    try {
        const result = await getFBInfo(queryURL);

        if (!result || !result.hd) {
            throw new Error("No video found");
        }

        // Send thumbnail first
        if (result.thumbnail) {
            const buttons = await getButtons();
            await zk.sendMessage(dest, {
                interactiveMessage: {
                    image: { url: result.thumbnail },
                    header: `${t.facebookVideo}\n\n${t.title} ${result.title || t.unknown}\n${t.quality} ${t.hdQuality}`,
                    buttons,
                    headerType: 1
                }
            }, { quoted: ms });
        }

        // Send the HD video
        await zk.sendMessage(dest, {
            video: { url: result.hd },
            caption: t.videoReady
        }, { quoted: ms });

        // Send button message after video
        await sendFormattedMessage(zk, dest, t.downloadComplete, ms);

    } catch (error) {
        console.error("Error:", error);
        await sendFormattedMessage(zk, dest, `${t.errorDownloading}\n\n${t.checkLink}`, ms);
    }
});

// ---------- Facebook Video Downloader (SD) ----------
fana({
    nomCom: "fb",
    alias: ["facebook2", "fbsd"],
    categorie: "Download",
    reaction: "🖥️"
}, async (dest, zk, commandeOptions) => {
    const { repondre, ms, arg } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const t = await getTranslatedButtons();

    if (!arg[0]) {
        return await sendFormattedMessage(zk, dest, `${t.pleaseInsert}\n\n${t.example} .fb https://www.facebook.com/.../video`, ms);
    }

    const queryURL = arg.join(" ");
    await zk.sendPresenceUpdate('composing', dest);

    try {
        const result = await getFBInfo(queryURL);

        if (!result || !result.sd) {
            throw new Error("No video found");
        }

        // Send thumbnail first
        if (result.thumbnail) {
            const buttons = await getButtons();
            await zk.sendMessage(dest, {
                interactiveMessage: {
                    image: { url: result.thumbnail },
                    header: `${t.facebookVideo}\n\n${t.title} ${result.title || t.unknown}\n${t.quality} ${t.sdQuality}`,
                    buttons,
                    headerType: 1
                }
            }, { quoted: ms });
        }

        // Send the SD video
        await zk.sendMessage(dest, {
            video: { url: result.sd },
            caption: t.videoReady
        }, { quoted: ms });

        // Send button message after video
        await sendFormattedMessage(zk, dest, t.downloadComplete, ms);

    } catch (error) {
        console.error("Error:", error);
        await sendFormattedMessage(zk, dest, `${t.errorDownloading}\n\n${t.checkLink}`, ms);
    }
});
