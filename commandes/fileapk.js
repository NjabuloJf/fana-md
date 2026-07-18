const { fana } = require("../njabulo/fana");
const axios = require("axios");
const config = require("../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

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
    return await translateText("🌐channel", lang);
}

async function getTranslatedButtons() {
    const lang = config.LANGUAGE || "en";
    const copyPackage = await translateText("📋 Copy Package", lang);
    const copyCommand = await translateText("📋 Copy Command", lang);
    const copyAppName = await translateText("📋 Copy App Name", lang);
    const waChannel = await translateText("🌐channel", lang);
    
    return {
        copyPackage,
        copyCommand,
        copyAppName,
        waChannel
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

function formatFileSize(bytes) {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

async function sendErrorMessage(zk, chatId, text, ms) {
    const buttons = await getTranslatedButtons();
    const waChannel = await getTranslatedButton();
    
    const errorButtons = [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: waChannel,
                id: "backup channel",
                url: config.GURL
            }),
        },
    ];
    
    await zk.sendMessage(chatId, {
        interactiveMessage: {
            header: text,
            buttons: errorButtons,
            headerType: 1
        }
    }, { quoted: ms });
}

async function sendMessage(zk, chatId, text, ms) {
    const waChannel = await getTranslatedButton();
    
    const buttons = [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: waChannel,
                id: "backup channel",
                url: config.GURL
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

fana(
    {
        nomCom: "apk",
        alias: ["app", "apkdownload", "downloadapk"],
        categorie: "Tools",
        reaction: "📦",
    },
    async (chatId, zk, commandeOptions) => {
        const { ms, repondre, arg } = commandeOptions;
        const lang = config.LANGUAGE || "en";

        const provideAppName = await translateText("📌 *Please provide an app name*", lang);
        const example = await translateText("📝 *Example:*", lang);
        const apkFinder = await translateText("📦 NJABULO MD APK FINDER", lang);
        const searchResults = await translateText("📂 Search Results for:", lang);
        const appInfo = await translateText("📦 APP INFO", lang);
        const downloadText = await translateText("📥 DOWNLOAD", lang);
        const toDownload = await translateText("📌 *To download:*", lang);
        const note = await translateText("⚠️ *Note:* Enable 'Unknown Sources' in settings to install!", lang);
        const noApkFound = await translateText("❌ *No APK found*", lang);
        const couldNotFind = await translateText("Could not find", lang);
        const pleaseTry = await translateText("Please try a different app name.", lang);
        const searching = await translateText("🔍 *Searching for", lang);
        const downloading = await translateText("⏳ *Downloading", lang);
        const size = await translateText("📦 Size:", lang);
        const pleaseWait = await translateText("⏱️ Please wait...", lang);
        const downloadComplete = await translateText("✅ *Download complete!*", lang);
        const installationTips = await translateText("⚠️ *Installation Tips:*", lang);
        const enableUnknown = await translateText("• Enable 'Unknown Sources' in Settings", lang);
        const openFile = await translateText("• Open the downloaded file", lang);
        const clickInstall = await translateText("• Click 'Install'", lang);
        const sentSuccessfully = await translateText("✅ *APK sent successfully!*", lang);
        const checkDocument = await translateText("Check the document above to download and install.", lang);
        const downloadFailed = await translateText("❌ *Download failed*", lang);
        const couldNotDownload = await translateText("Could not download", lang);
        const reason = await translateText("Reason:", lang);
        const tryAgain = await translateText("Please try again later.", lang);
        const errorSearching = await translateText("❌ *Error searching APK*", lang);
        const appNameText = await translateText("📱 *Name:*", lang);
        const packageText = await translateText("📦 *Package:*", lang);
        const sizeText = await translateText("🏋️ *Size:*", lang);
        const updatedText = await translateText("📅 *Updated:*", lang);
        const developerText = await translateText("👨‍💻 *Developer:*", lang);
        const versionText = await translateText("📊 *Version:*", lang);
        const ratingText = await translateText("⭐ *Rating:*", lang);
        const downloadsText = await translateText("📥 *Downloads:*", lang);

        if (!arg || !arg[0]) {
            return sendErrorMessage(zk, chatId, `${provideAppName}\n\n${example} .apk whatsapp\n.apk download whatsapp\n.apk instagram`, ms);
        }

        await zk.sendPresenceUpdate('composing', chatId);

        const query = arg.join(" ");
        const isDownload = query.toLowerCase().includes("download");
        const searchQuery = isDownload ? query.replace(/download/gi, '').trim() : query;

        const loadingMsg = await zk.sendMessage(chatId, { text: `${searching} ${searchQuery} APK...*` }, { quoted: ms });

        try {
            const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(searchQuery)}/limit=1`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            const data = response.data;

            if (!data || !data.datalist || !data.datalist.list || data.datalist.list.length === 0) {
                if (loadingMsg && loadingMsg.key) {
                    await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
                }
                return sendErrorMessage(zk, chatId, `${noApkFound}\n\n${couldNotFind} "${searchQuery}". ${pleaseTry}`, ms);
            }

            const app = data.datalist.list[0];
            const appSize = formatFileSize(app.file?.filesize || app.size);
            const downloadUrl = app.file?.path_alt || app.file?.path || app.obb?.main?.path;

            console.log("Download URL:", downloadUrl);
            console.log("Is Download requested:", isDownload);

            let imageBuffer = null;
            try {
                const iconUrl = app.icon || app.media?.icon || randomNjabulourl;
                const imgRes = await axios.get(iconUrl, { responseType: 'arraybuffer', timeout: 10000 });
                imageBuffer = imgRes.data;
            } catch (err) {}

            const imageMessage = imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null;

            const copyPackage = await translateText("📋 Copy Package", lang);
            const copyCommand = await translateText("📋 Copy Command", lang);
            const waChannel = await translateText("🌐WA channel", lang);

            const cards = [
                {
                    header: {
                        title: appInfo,
                        hasMediaAttachment: true,
                        imageMessage: imageMessage,
                    },
                    body: {
                        text: `${appNameText} ${app.name}
${packageText} ${app.package}
${sizeText} ${appSize}
${updatedText} ${app.updated || "Unknown"}
${developerText} ${app.developer?.name || "Unknown"}
${versionText} ${app.version_name || app.version || "Unknown"}
${ratingText} ${app.stats?.rating?.avg || app.rating || "N/A"}
${downloadsText} ${app.stats?.downloads || "Unknown"}`,
                    },
                    footer: { text: "" },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_copy",
                                buttonParamsJson: JSON.stringify({
                                    display_text: copyPackage,
                                    copy_code: app.package,
                                }),
                            },
                            {
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: waChannel,
                                    url: config.GURL
                                }),
                            },
                        ],
                    },
                },
                {
                    header: {
                        title: downloadText,
                        hasMediaAttachment: true,
                        imageMessage: imageMessage,
                    },
                    body: {
                        text: `${appNameText} ${app.name}
${sizeText} ${appSize}
${versionText} ${app.version_name || app.version || "Unknown"}

${toDownload}
\`.apk download ${app.name}\`
\`.playstore ${app.name}\`

${note}`,
                    },
                    footer: { text: "" },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_copy",
                                buttonParamsJson: JSON.stringify({
                                    display_text: copyCommand,
                                    copy_code: `.apk download ${app.name}`,
                                }),
                            },
                            {
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: waChannel,
                                    url: config.GURL
                                }),
                            },
                        ],
                    },
                },
            ];

            if (loadingMsg && loadingMsg.key) {
                await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
            }

            const message = generateWAMessageFromContent(
                chatId,
                {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2,
                            },
                            interactiveMessage: {
                                header: { text: apkFinder },
                                body: { text: `${searchResults} ${app.name}*` },
                                headerType: 1,
                                carouselMessage: { cards },
                            },
                        },
                    },
                },
                { quoted: ms }
            );

            await zk.relayMessage(chatId, message.message, { messageId: message.key.id });

            // Handle download
            if (isDownload === true) {
                console.log("DOWNLOADING APK...");

                const downloadMsg = await zk.sendMessage(chatId, { text: `${downloading} ${app.name} APK...*\n\n${size} ${appSize}\n${pleaseWait}` }, { quoted: ms });

                try {
                    if (!downloadUrl) {
                        throw new Error("No download URL available");
                    }

                    console.log("Downloading from URL:", downloadUrl);

                    const apkResponse = await axios({
                        method: 'GET',
                        url: downloadUrl,
                        responseType: 'arraybuffer',
                        timeout: 120000
                    });

                    const apkBuffer = Buffer.from(apkResponse.data);

                    console.log("APK downloaded, size:", apkBuffer.length, "bytes");

                    const downloadCompleteMsg = await translateText("✅ *Download complete!*", lang);
                    const installTips = await translateText("⚠️ *Installation Tips:*", lang);
                    const enableUnknown = await translateText("• Enable 'Unknown Sources' in Settings", lang);
                    const openFileMsg = await translateText("• Open the downloaded file", lang);
                    const clickInstallMsg = await translateText("• Click 'Install'", lang);

                    await zk.sendMessage(chatId, {
                        document: apkBuffer,
                        fileName: `${app.name.replace(/[^a-zA-Z0-9]/g, '_')}.apk`,
                        mimetype: "application/vnd.android.package-archive",
                        caption: `📦 *${app.name} APK*

📱 *Name:* ${app.name}
🏋️ *Size:* ${appSize}
📊 *Version:* ${app.version_name || app.version || "Unknown"}

${downloadCompleteMsg}

${installTips}
${enableUnknown}
${openFileMsg}
${clickInstallMsg}

> NJABULO MD`
                    }, { quoted: ms });

                    if (downloadMsg && downloadMsg.key) {
                        await zk.sendMessage(chatId, { delete: downloadMsg.key }).catch(() => {});
                    }

                    const successMsg = await translateText(`✅ *${app.name} APK sent successfully!*`, lang);
                    const checkDoc = await translateText("Check the document above to download and install.", lang);
                    await zk.sendMessage(chatId, { text: `${successMsg}\n\n${checkDoc}` }, { quoted: ms });

                } catch (downloadError) {
                    console.error("Download error:", downloadError.message);
                    if (downloadMsg && downloadMsg.key) {
                        await zk.sendMessage(chatId, { delete: downloadMsg.key }).catch(() => {});
                    }
                    const failedMsg = await translateText(`❌ *Download failed*`, lang);
                    const couldNotDown = await translateText(`Could not download ${app.name}.`, lang);
                    const reasonMsg = await translateText(`Reason:`, lang);
                    const tryAgainMsg = await translateText(`Please try again later.`, lang);
                    await zk.sendMessage(chatId, { text: `${failedMsg}\n\n${couldNotDown}\n\n${reasonMsg} ${downloadError.message}\n\n${tryAgainMsg}` }, { quoted: ms });
                }
            } else {
                console.log("No download requested. Use: .apk download [appname]");
            }

        } catch (error) {
            console.error("APK search error:", error);
            if (loadingMsg && loadingMsg.key) {
                await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
            }
            const errorSearch = await translateText("❌ *Error searching APK*", lang);
            const tryAgainMsg = await translateText("Please try again later.", lang);
            sendErrorMessage(zk, chatId, `${errorSearch}\n\n${tryAgainMsg}`, ms);
        }
    }
);

fana(
    {
        nomCom: "playstore",
        alias: ["ps", "play"],
        categorie: "Tools",
        reaction: "📦",
    },
    async (chatId, zk, commandeOptions) => {
        const { ms, repondre, arg } = commandeOptions;
        const lang = config.LANGUAGE || "en";

        const provideAppName = await translateText("📌 *Please provide an app name*", lang);
        const example = await translateText("📝 *Example:*", lang);
        const apkFinder = await translateText("📦 apk Finder", lang);
        const searchResults = await translateText("📂 Search Results for:", lang);
        const appInfo = await translateText("📦 APP INFO", lang);
        const downloadText = await translateText("📥 Download", lang);
        const note = await translateText("⚠️ *Note:* Enable 'Unknown Sources' in settings to install!", lang);
        const noApkFound = await translateText("❌ *No APK found*", lang);
        const couldNotFind = await translateText("Could not find", lang);
        const pleaseTry = await translateText("Please try a different app name.", lang);
        const searching = await translateText("🔍 *Searching for", lang);
        const downloading = await translateText("⏳ *Downloading", lang);
        const size = await translateText("📦 Size:", lang);
        const pleaseWait = await translateText("⏱️ Please wait...", lang);
        const downloadComplete = await translateText("✅ *Download complete!*", lang);
        const installationTips = await translateText("⚠️ *Installation Tips:*", lang);
        const enableUnknown = await translateText("• Enable 'Unknown Sources' in Settings", lang);
        const openFile = await translateText("• Open the downloaded file", lang);
        const clickInstall = await translateText("• Click 'Install'", lang);
        const sentSuccessfully = await translateText("✅ *APK sent successfully!*", lang);
        const checkDocument = await translateText("Check the document above to download and install.", lang);
        const downloadFailed = await translateText("❌ *Download failed*", lang);
        const couldNotDownload = await translateText("Could not download", lang);
        const reason = await translateText("Reason:", lang);
        const tryAgain = await translateText("Please try again later.", lang);
        const errorSearching = await translateText("❌ *Error searching APK*", lang);
        const appNameText = await translateText("📱 *Name:*", lang);
        const packageText = await translateText("📦 *Package:*", lang);
        const sizeText = await translateText("🏋️ *Size:*", lang);
        const updatedText = await translateText("📅 *Updated:*", lang);
        const developerText = await translateText("👨‍💻 *Developer:*", lang);
        const versionText = await translateText("📊 *Version:*", lang);
        const ratingText = await translateText("⭐ *Rating:*", lang);
        const downloadsText = await translateText("📥 *Downloads:*", lang);

        if (!arg || !arg[0]) {
            return sendErrorMessage(zk, chatId, `${provideAppName}\n\n${example} .playstore whatsapp\n.playstore instagram\n.playstore spotify`, ms);
        }

        await zk.sendPresenceUpdate('composing', chatId);

        const searchQuery = arg.join(" ").trim();
        const cleanQuery = searchQuery.replace(/download/gi, '').trim();

        const loadingMsg = await zk.sendMessage(chatId, { text: `${searching} ${cleanQuery} APK...*` }, { quoted: ms });

        try {
            const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(cleanQuery)}/limit=1`;
            const response = await axios.get(apiUrl, { timeout: 15000 });
            const data = response.data;

            if (!data || !data.datalist || !data.datalist.list || data.datalist.list.length === 0) {
                if (loadingMsg && loadingMsg.key) {
                    await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
                }
                return sendErrorMessage(zk, chatId, `${noApkFound}\n\n${couldNotFind} "${cleanQuery}". ${pleaseTry}`, ms);
            }

            const app = data.datalist.list[0];
            const appSize = formatFileSize(app.file?.filesize || app.size);
            const downloadUrl = app.file?.path_alt || app.file?.path || app.obb?.main?.path;

            console.log("Download URL:", downloadUrl);

            let imageBuffer = null;
            try {
                const iconUrl = app.icon || app.media?.icon || randomNjabulourl;
                const imgRes = await axios.get(iconUrl, { responseType: 'arraybuffer', timeout: 10000 });
                imageBuffer = imgRes.data;
            } catch (err) {}

            const imageMessage = imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null;

            const copyPackage = await translateText("📋 Copy Package", lang);
            const copyAppName = await translateText("📋 Copy App Name", lang);
            const waChannel = await translateText("🌐WA channel", lang);

            const cards = [
                {
                    header: {
                        title: appInfo,
                        hasMediaAttachment: true,
                        imageMessage: imageMessage,
                    },
                    body: {
                        text: `${appNameText} ${app.name}
${packageText} ${app.package}
${sizeText} ${appSize}
${updatedText} ${app.updated || "Unknown"}
${developerText} ${app.developer?.name || "Unknown"}
${versionText} ${app.version_name || app.version || "Unknown"}
${ratingText} ${app.stats?.rating?.avg || app.rating || "N/A"}
${downloadsText} ${app.stats?.downloads || "Unknown"}`,
                    },
                    footer: { text: "" },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_copy",
                                buttonParamsJson: JSON.stringify({
                                    display_text: copyPackage,
                                    copy_code: app.package,
                                }),
                            },
                            {
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: waChannel,
                                    url: config.GURL
                                }),
                            },
                        ],
                    },
                },
                {
                    header: {
                        title: downloadText,
                        hasMediaAttachment: true,
                        imageMessage: imageMessage,
                    },
                    body: {
                        text: `${appNameText} ${app.name}
${sizeText} ${appSize}
${versionText} ${app.version_name || app.version || "Unknown"}

✅ *APK will be sent automatically!*

${note}`,
                    },
                    footer: { text: "" },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_copy",
                                buttonParamsJson: JSON.stringify({
                                    display_text: copyAppName,
                                    copy_code: app.name,
                                }),
                            },
                            {
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: waChannel,
                                    url: config.GURL
                                }),
                            },
                        ],
                    },
                },
            ];

            if (loadingMsg && loadingMsg.key) {
                await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
            }

            const message = generateWAMessageFromContent(
                chatId,
                {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2,
                            },
                            interactiveMessage: {
                                header: { text: apkFinder },
                                body: { text: `${searchResults} ${app.name}*` },
                                headerType: 1,
                                carouselMessage: { cards },
                            },
                        },
                    },
                },
                { quoted: ms }
            );

            await zk.relayMessage(chatId, message.message, { messageId: message.key.id });

            // ALWAYS DOWNLOAD APK
            console.log("DOWNLOADING APK...");

            const downloadMsg = await zk.sendMessage(chatId, { text: `${downloading} ${app.name} APK...*\n\n${size} ${appSize}\n${pleaseWait}` }, { quoted: ms });

            try {
                if (!downloadUrl) {
                    throw new Error("No download URL available");
                }

                console.log("Downloading from URL:", downloadUrl);

                const apkResponse = await axios({
                    method: 'GET',
                    url: downloadUrl,
                    responseType: 'arraybuffer',
                    timeout: 120000
                });

                const apkBuffer = Buffer.from(apkResponse.data);

                console.log("APK downloaded, size:", apkBuffer.length, "bytes");

                await zk.sendMessage(chatId, {
                    document: apkBuffer,
                    fileName: `${app.name.replace(/[^a-zA-Z0-9]/g, '_')}.apk`,
                    mimetype: "application/vnd.android.package-archive",
                    caption: `📦 *${app.name} APK*

📱 *Name:* ${app.name}
🏋️ *Size:* ${appSize}
📊 *Version:* ${app.version_name || app.version || "Unknown"}

${downloadComplete}

${installationTips}
${enableUnknown}
${openFile}
${clickInstall}
`
                }, { quoted: ms });

                if (downloadMsg && downloadMsg.key) {
                    await zk.sendMessage(chatId, { delete: downloadMsg.key }).catch(() => {});
                }

                await zk.sendMessage(chatId, { text: `${sentSuccessfully}\n\n${checkDocument}` }, { quoted: ms });

            } catch (downloadError) {
                console.error("Download error:", downloadError.message);
                if (downloadMsg && downloadMsg.key) {
                    await zk.sendMessage(chatId, { delete: downloadMsg.key }).catch(() => {});
                }
                await zk.sendMessage(chatId, { text: `${downloadFailed}\n\n${couldNotDownload} ${app.name}.\n\n${reason} ${downloadError.message}\n\n${tryAgain}` }, { quoted: ms });
            }

        } catch (error) {
            console.error("APK search error:", error);
            if (loadingMsg && loadingMsg.key) {
                await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
            }
            sendErrorMessage(zk, chatId, `${errorSearching}\n\n${tryAgain}`, ms);
        }
    }
);
