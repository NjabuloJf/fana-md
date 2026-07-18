const { fana } = require("../njabulo/fana");
const axios = require("axios");
const config = require("../set");
const fs = require("fs-extra");
const FormData = require("form-data");

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
async function getTranslatedButton() {
    const lang = config.LANGUAGE || "en";
    return await translateText("🌐 Channel", lang);
}

async function getTranslatedButtons() {
    const lang = config.LANGUAGE || "en";
    const waChannel = await translateText("🌐 WA Channel", lang);
    return { waChannel };
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

// ACRCloud credentials
const ACR_HOST = 'identify-ap-southeast-1.acrcloud.com';
const ACR_ACCESS_KEY = '26afd4eec96b0f5e5ab16a7e6e05ab37';
const ACR_ACCESS_SECRET = 'wXOZIqdMNZmaHJP1YDWVyeQLg579uK2CfY6hWMN8';

async function sendErrorMessage(zk, chatId, text, ms) {
    const waChannel = await getTranslatedButton();
    const buttons = [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: waChannel,
                id: "backup channel",
                url: config.GURL || "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
            }),
        },
    ];
    
    await zk.sendMessage(chatId, {
        interactiveMessage: {
            header: text,
            buttons: buttons,
            headerType: 1
        }
    }, { quoted: ms });
}

// Function to recognize song using ACRCloud
async function recognizeSong(audioBuffer) {
    try {
        const formData = new FormData();
        formData.append('sample', audioBuffer, {
            filename: 'audio.mp3',
            contentType: 'audio/mpeg'
        });

        const response = await axios.post(`https://${ACR_HOST}/v1/identify`, formData, {
            headers: {
                ...formData.getHeaders(),
                'access_key': ACR_ACCESS_KEY,
                'access_secret': ACR_ACCESS_SECRET
            },
            timeout: 30000
        });

        return response.data;
    } catch (error) {
        console.error("ACRCloud error:", error.response?.data || error.message);
        return null;
    }
}

fana({
    nomCom: "shazam",
    alias: ["whatsong", "recognize", "songid"],
    categorie: "Music",
    reaction: "🎵",
}, async (chatId, zk, commandeOptions) => {
    const { ms, msgRepondu, repondre } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    // Translated texts
    const shazamTitle = await translateText("🎵 *SHAZAM SONG RECOGNIZER*", lang);
    const howToUse = await translateText("📌 *How to use:*", lang);
    const step1 = await translateText("1. Reply to an audio or video message", lang);
    const step2 = await translateText("2. Type: `.shazam`", lang);
    const example = await translateText("📝 *Example:* Reply to a voice note or song, then send `.shazam`", lang);
    const poweredBy = await translateText("> NJABULO MD", lang);
    const invalidMedia = await translateText("❌ *Invalid media*", lang);
    const invalidMediaMsg = await translateText("Please quote an audio, voice note, or video message.", lang);
    const analyzing = await translateText("🎵 *Analyzing audio...*", lang);
    const pleaseWait = await translateText("⏳ This may take a few seconds.", lang);
    const downloadFailed = await translateText("❌ *Failed to download media*", lang);
    const tryAgainDiff = await translateText("Please try again with a different audio file.", lang);
    const notRecognized = await translateText("🎵 *Song not recognized*", lang);
    const couldNotIdentify = await translateText("Could not identify the audio.", lang);
    const tips = await translateText("📌 *Tips:*", lang);
    const tip1 = await translateText("• Use clearer audio", lang);
    const tip2 = await translateText("• Make sure the song is not too quiet", lang);
    const tip3 = await translateText("• Try a different part of the song", lang);
    const shazamResult = await translateText("SHAZAM RESULT", lang);
    const songIdentified = await translateText("SONG IDENTIFIED", lang);
    const titleText = await translateText("🎤 *Title:*", lang);
    const artistText = await translateText("👨‍🎤 *Artist:*", lang);
    const albumText = await translateText("💿 *Album:*", lang);
    const genreText = await translateText("🎸 *Genre:*", lang);
    const releaseText = await translateText("📅 *Release:*", lang);
    const durationText = await translateText("⏱️ *Duration:*", lang);
    const labelText = await translateText("🏷️ *Label:*", lang);
    const confidenceText = await translateText("📊 *Confidence:*", lang);
    const errorText = await translateText("❌ *Error*", lang);
    const tryAgainLater = await translateText("Please try again later.", lang);

    // Send loading reaction
    await zk.sendMessage(chatId, { react: { text: "⌛", key: ms.key } });

    // Check if there's a quoted message
    if (!msgRepondu) {
        await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
        return sendErrorMessage(zk, chatId, `${shazamTitle}\n\n${howToUse}\n${step1}\n${step2}\n\n${example}\n\n${poweredBy}`, ms);
    }

    // Check if quoted message has audio or video
    if (!msgRepondu.audioMessage && !msgRepondu.videoMessage && !msgRepondu.voiceMessage) {
        await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
        return sendErrorMessage(zk, chatId, `${invalidMedia}\n\n${invalidMediaMsg}\n\n${poweredBy}`, ms);
    }

    try {
        // Send analyzing message
        const analyzingMsg = await zk.sendMessage(chatId, { text: `${analyzing}\n\n${pleaseWait}` }, { quoted: ms });

        // Download the media
        let buffer;
        let mediaType = '';

        if (msgRepondu.audioMessage) {
            buffer = await zk.downloadAndSaveMediaMessage(msgRepondu.audioMessage);
            mediaType = 'audio';
        } else if (msgRepondu.voiceMessage) {
            buffer = await zk.downloadAndSaveMediaMessage(msgRepondu.voiceMessage);
            mediaType = 'voice';
        } else if (msgRepondu.videoMessage) {
            buffer = await zk.downloadAndSaveMediaMessage(msgRepondu.videoMessage);
            mediaType = 'video';
        }

        if (!buffer) {
            await zk.sendMessage(chatId, { delete: analyzingMsg.key }).catch(() => {});
            await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
            return sendErrorMessage(zk, chatId, `${downloadFailed}\n\n${tryAgainDiff}\n\n${poweredBy}`, ms);
        }

        // Read file as buffer
        const audioBuffer = fs.readFileSync(buffer);

        // Recognize the song
        const result = await recognizeSong(audioBuffer);

        // Clean up temp file
        fs.unlinkSync(buffer);

        await zk.sendMessage(chatId, { delete: analyzingMsg.key }).catch(() => {});

        if (!result || result.status?.code !== 0 || !result.metadata?.music?.length) {
            await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
            return sendErrorMessage(zk, chatId, `${notRecognized}\n\n${couldNotIdentify}\n\n${tips}\n${tip1}\n${tip2}\n${tip3}\n\n${poweredBy}`, ms);
        }

        const songData = result.metadata.music[0];
        const title = songData.title || "Unknown";
        const artists = songData.artists?.map(v => v.name).join(', ') || "Unknown";
        const album = songData.album?.name || "Unknown";
        const genres = songData.genres?.map(v => v.name).join(', ') || "Unknown";
        const releaseDate = songData.release_date || "Unknown";
        const duration = songData.duration_ms ? `${(songData.duration_ms / 1000).toFixed(2)} seconds` : "Unknown";
        const label = songData.label || "Unknown";
        const score = result.metadata?.music[0]?.score ? `${(result.metadata.music[0].score * 100).toFixed(1)}%` : "Unknown";

        // Get album art URL
        let albumArtUrl = null;
        if (songData.album?.url) {
            albumArtUrl = songData.album.url;
        }

        // Send success reaction
        await zk.sendMessage(chatId, { react: { text: "✅", key: ms.key } });

        // Create response message with translated text
        let responseText = `(    ${shazamResult}    )
≫ ${songIdentified} ≪
├ 
├ ${titleText} ${title}
├ ${artistText} ${artists}
├ ${albumText} ${album}
├ ${genreText} ${genres}
├ ${releaseText} ${releaseDate}
├ ${durationText} ${duration}
├ ${labelText} ${label}
├ ${confidenceText} ${score}

> ©${await translateText("njabulo jb ai bot shazam", lang)}`;

        // Send album art if available
        if (albumArtUrl) {
            try {
                await zk.sendMessage(chatId, {
                    image: { url: albumArtUrl },
                    caption: responseText
                }, { quoted: ms });
            } catch (err) {
                await zk.sendMessage(chatId, { text: responseText }, { quoted: ms });
            }
        } else {
            await zk.sendMessage(chatId, { text: responseText }, { quoted: ms });
        }

    } catch (error) {
        console.error('Shazam error:', error);
        await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
        sendErrorMessage(zk, chatId, `${errorText}\n\n${error.message}\n\n${tryAgainLater}\n\n${poweredBy}`, ms);
    }
});
