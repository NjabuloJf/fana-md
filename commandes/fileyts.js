const { fana } = require("../njabulo/fana");
const yts = require("yt-search");
const config = require(__dirname + "/../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
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

// ========== GET TRANSLATED TEXT TEMPLATES ==========
async function getTranslatedTexts() {
    const lang = config.LANGUAGE || "en";
    
    return {
        noQuery: await translateText("Please provide a search query.", lang),
        searching: await translateText("🔍 Searching for", lang),
        noResults: await translateText("No results found.", lang),
        error: await translateText("An error occurred while searching for videos.", lang),
        title: await translateText("Title", lang),
        url: await translateText("URL", lang),
        views: await translateText("Views", lang),
        uploaded: await translateText("Uploaded", lang),
        duration: await translateText("Duration", lang),
        viewOnYouTube: await translateText("🌐 View on YouTube", lang),
        searchResultsFor: await translateText("Search Results for", lang),
        foundResults: await translateText("Found", lang),
        resultCount: await translateText("results", lang),
        youtubeDownload: await translateText("Njabulo JB YouTube Download", lang),
        searchResult: await translateText("YouTube Search Result", lang)
    };
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

// ── Standard button set (used by all modules) ────────────────────────
async function getBaseButtons(copyCode) {
    const lang = config.LANGUAGE || "en";
    const copyText = await translateText("Copy", lang);
    
    return [{
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
            display_text: copyText,
            id: "copy",
            copy_code: copyCode || config.GURL
        }),
    }];
}

// ── Helper that sends an *interactive* message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms, copyCode) {
    const buttons = await getBaseButtons(copyCode || text);
    
    await zk.sendMessage(
        chatId,
        {
            interactiveMessage: {
                image: { url: randomNjabulourl },
                header: text,
                buttons: buttons,
                headerType: 1,
            }
        }, 
        { quoted: ms }
    );
}

// ── YouTube search command ─────────────────────────────────────────────
fana(
    {
        nomCom: "yts",
        aliases: ["ytsearch"],
        categorie: "Search",
        reaction: "🔍",
        description: "Search for YouTube videos.",
    },
    async (dest, zk, commandeOptions) => {
        const { repondre, ms, arg } = commandeOptions;
        const lang = config.LANGUAGE || "en";
        const texts = await getTranslatedTexts();
        
        try {
            if (!arg[0]) {
                await sendFormattedMessage(zk, dest, texts.noQuery, ms);
                return;
            }
            
            const searchQuery = arg.join(" ");
            await sendFormattedMessage(zk, dest, `${texts.searching} "${searchQuery}"...`, ms);
            
            const results = await yts(searchQuery);
            
            if (!results.videos.length) {
                await sendFormattedMessage(zk, dest, texts.noResults, ms);
                return;
            }
            
            // ========== BUILD TRANSLATED CARDS ==========
            const cards = await Promise.all(
                results.videos.slice(0, 5).map(async (video, i) => {
                    // Translate the YouTube button text
                    const viewOnYouTube = await translateText("🌐 View on YouTube", lang);
                    
                    // Build result text with translated labels
                    let resultText = `*${texts.searchResult} ${i+1}*\n\n`;
                    resultText += `*🎧${texts.title}:* ${video.title}\n`;
                    resultText += `🖇️*${texts.url}:* ${video.url}\n`;
                    resultText += `*👁️${texts.views}:* ${video.views.toLocaleString()}\n`;
                    resultText += `*📅${texts.uploaded}:* ${video.ago}\n`;
                    resultText += `*⏲️${texts.duration}:* ${video.timestamp}`;
                    
                    return {
                        header: {
                            title: `📸 ${video.title}`,
                            hasMediaAttachment: true,
                            imageMessage: (await generateWAMessageContent({ image: { url: video.thumbnail } }, { upload: zk.waUploadToServer })).imageMessage,
                        },
                        body: {
                            text: resultText,
                        },
                        footer: {
                            text: `*${await translateText("Njabulo JB YouTube Download", lang)}*`,
                        },
                        nativeFlowMessage: {
                            buttons: [{
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: viewOnYouTube,
                                    url: `https://youtu.be/${video.videoId}`,
                                }),
                            }],
                        },
                    };
                })
            );
            
            // ========== TRANSLATE CAROUSEL HEADER AND FOOTER ==========
            const headerText = await translateText(`🔍 Search Results for "${searchQuery}"`, lang);
            const footerText = await translateText(`📂 Found ${results.videos.length} results`, lang);
            
            const message = generateWAMessageFromContent(
                dest,
                {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                            interactiveMessage: {
                                header: { text: headerText },
                                footer: { text: footerText },
                                carouselMessage: { cards },
                            },
                        },
                    },
                },
                { quoted: ms }
            );
            
            await zk.relayMessage(dest, message.message, { messageId: message.key.id });
            
        } catch (err) {
            console.error(err);
            await sendFormattedMessage(zk, dest, texts.error, ms);
        }
    }
);
