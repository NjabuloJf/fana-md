const { fana } = require("../njabulo/fana");
const config = require("../set");
const axios = require("axios");
const os = require('os');
const moment = require("moment-timezone");
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
    return await translateText("channel bot", lang);
}

// ========== TRANSLATED TEXT FUNCTION ==========
async function getTranslatedTexts() {
    const lang = config.LANGUAGE || "en";
    return {
        systemInfo: await translateText("🔍 System Info", lang),
        completed: await translateText("ｃｏｍｐｌｅｔｅｄ✘", lang),
        name: await translateText("ɴᴀᴍᴇ:", lang),
        date: await translateText("ᴅᴀᴛᴇ:", lang),
        time: await translateText("ᴛɪᴍᴇ:", lang),
        totalUsers: await translateText("ᴛᴏᴛᴀʟ ᴜsᴇʀs:", lang),
        users: await translateText("users", lang),
        hallo: await translateText("Hallo family", lang),
        cmd: await translateText("ｃｍｄ", lang),
        menu: await translateText("Ｍｅｎｕ", lang),
        more: await translateText("Ｍｏｒｅ", lang),
        type: await translateText("Ｔｙｐｅ", lang),
        reactionMenu: await translateText(".ʀᴇᴀᴄᴛɪᴏɴ-ᴍᴇɴᴜ", lang),
        logoMenu: await translateText(".ʟᴏɢᴏ-ᴍᴇɴᴜ", lang),
        editMenu: await translateText(".ᴇᴅɪᴛ-ᴍᴇɴᴜ", lang),
        downloadMenu: await translateText(".ᴅᴏᴡɴʟᴏᴀᴅ-ᴍᴇɴᴜ", lang),
        generalMenu: await translateText(".ɢᴇɴᴇʀᴀʟ-ᴍᴇɴᴜ", lang),
        animeMenu: await translateText(".ᴀɴɪᴍᴇ-ᴍᴇɴᴜ", lang),
        bugMenu: await translateText(".ʙᴜɢ-ᴍᴇɴᴜ", lang),
        groupMenu: await translateText(".ɢʀᴏᴜᴘ-ᴍᴇɴᴜ", lang),
        useMenu: await translateText(".ᴜsᴇ-ᴍᴇɴᴜ", lang),
        herokuMenu: await translateText(".ʜᴇʀᴏᴋᴜ-ᴍᴇɴᴜ", lang),
        chatMenu: await translateText(".ᴄʜᴀᴛ-ᴍᴇɴᴜ", lang),
    };
}

fana({
    nomCom: "menu",
    alias: ["help", "cmds"],
    categorie: "General",
    reaction: "📚",
    use: ".menu",
}, async (dest, zk, commandeOptions) => {
    console.log('Command triggered!');
    const { repondre, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const fetchGitHubStats = async () => {
        try {
            const response = await axios.get("https://api.github.com/repos/NjabuloJf/Njabulo-Jb");
            const forksCount = response.data.forks_count;
            const starsCount = response.data.stargazers_count;
            const totalUsers = forksCount * 2 + starsCount * 2;
            return { forks: forksCount, stars: starsCount, totalUsers };
        } catch (error) {
            console.error("Error fetching GitHub stats:", error);
            return { forks: 0, stars: 0, totalUsers: 0 };
        }
    };

    const quotes = [
        "Dream big, work hard.",
        "Stay humble, hustle hard.",
        "Believe in yourself.",
        "Success is earned, not given.",
        "Actions speak louder than words.",
        "The best is yet to come.",
        "Keep pushing forward.",
        "Do more than just exist.",
        "Progress, not perfection.",
        "Stay positive, work hard.",
        "Be the change you seek.",
        "Never stop learning.",
        "Chase your dreams.",
        "Be your own hero.",
        "Life is what you make of it.",
        "Do it with passion or not at all.",
        "You are stronger than you think.",
        "Create your own path.",
        "Make today count.",
        "Embrace the journey.",
        "The best way out is always through.",
        "Strive for progress, not perfection.",
        "Don't wish for it, work for it.",
        "Live, laugh, love.",
        "Keep going, you're getting there.",
        "Don’t stop until you’re proud.",
        "Success is a journey, not a destination.",
        "Take the risk or lose the chance.",
        "It’s never too late.",
        "Believe you can and you're halfway there.",
        "Small steps lead to big changes.",
        "Happiness depends on ourselves.",
        "Take chances, make mistakes.",
        "Be a voice, not an echo.",
        "The sky is the limit.",
        "You miss 100% of the shots you don’t take.",
        "Start where you are, use what you have.",
        "The future belongs to those who believe.",
        "Don’t count the days, make the days count.",
        "Success is not the key to happiness. Happiness is the key to success."
    ];

    const getRandomQuote = () => {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        return quotes[randomIndex];
    };

    const emojis = ["😅", "🤕", "😔", "🙄", "😂", "🤔", "😲", "😩"];
    const reactionEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const randomQuote = getRandomQuote();

    const { totalUsers } = await fetchGitHubStats();
    const formattedTotalUsers = totalUsers.toLocaleString();

    moment.tz.setDefault("Africa/Botswana");
    const temps = moment().format('HH:mm:ss');
    const date = moment().format('DD/MM/YYYY');

    const hour = moment().hour();
    let greeting = "Good Mornιng";
    if (hour >= 12 && hour < 18) {
        greeting = "Good ᥲftᥱrnnon!";
    } else if (hour >= 18) {
        greeting = "Good Evᥱrnιng!";
    } else if (hour >= 22 || hour < 5) {
        greeting = "Good Nιght";
    }

    const waChannel = await getTranslatedButton();
    const texts = await getTranslatedTexts();

    try {
        const njabulox = [
            "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
            "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
            "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png"
        ];

        const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
        if (!randomNjabulourl) {
            console.error("Error: No image URL found.");
            repondre("An error occurred: No image URL found.");
            return;
        }

        // Create card with translated text
        const cards = [
            {
                header: {
                    title: `╭───────────⊷
┊▢ *${texts.name} ɳʝαႦυʅσ ʝႦ*
┊▢ *${texts.date} ${date}*
┊▢ *${texts.time} ${temps}*
┊▢ *${texts.totalUsers} ${formattedTotalUsers} ${texts.users}*
┌┤`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `
╔
 *${texts.cmd}* 27 
 *${texts.menu}* Ｒｅａｃｔｉｏｎ 
 *${texts.more}* ᴏɴ
 *${texts.type}* ${texts.reactionMenu}
╚`,
                },
                footer: {
                    text: `┌┤🌇 *${texts.hallo} ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            "buttonId": "uptime-btn",
                            "buttonText": { "displayText": waChannel },
                            "type": 1,
                        },
                    ],
                },
            },
            {
                header: {
                    title: `╭───────────⊷
┊▢ *${texts.name} ɳʝαႦυʅσ ʝႦ*
┊▢ *${texts.date} ${date}*
┊▢ *${texts.time} ${temps}*
┊▢ *${texts.totalUsers} ${formattedTotalUsers} ${texts.users}*
┌┤`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `
╔
 *${texts.cmd}* 23
 *${texts.menu}* Ｌｏｇｏ
 *${texts.more}* ᴏɴ
 *${texts.type}* ${texts.logoMenu}
╚`,
                },
                footer: {
                    text: `┌┤🌇 *${texts.hallo} ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            "buttonId": "uptime-btn",
                            "buttonText": { "displayText": waChannel },
                            "type": 1,
                        },
                    ],
                },
            },
            {
                header: {
                    title: `╭───────────⊷
┊▢ *${texts.name} ɳʝαႦυʅσ ʝႦ*
┊▢ *${texts.date} ${date}*
┊▢ *${texts.time} ${temps}*
┊▢ *${texts.totalUsers} ${formattedTotalUsers} ${texts.users}*
┌┤`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `
╔
 *${texts.cmd}* 18
 *${texts.menu}* Ｅｄｉｔ
 *${texts.more}* ᴏɴ
 *${texts.type}* ${texts.editMenu}
╚`,
                },
                footer: {
                    text: `┌┤🌇 *${texts.hallo} ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            "buttonId": "uptime-btn",
                            "buttonText": { "displayText": waChannel },
                            "type": 1,
                        },
                    ],
                },
            },
            {
                header: {
                    title: `╭───────────⊷
┊▢ *${texts.name} ɳʝαႦυʅσ ʝႦ*
┊▢ *${texts.date} ${date}*
┊▢ *${texts.time} ${temps}*
┊▢ *${texts.totalUsers} ${formattedTotalUsers} ${texts.users}*
┌┤`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `
╔
 *${texts.cmd}* 27 
 *${texts.menu}* Ｄｏｗｎｌｏａｄ
 *${texts.more}* ᴏɴ
 *${texts.type}* ${texts.downloadMenu}
╚`,
                },
                footer: {
                    text: `┌┤🌇 *${texts.hallo} ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            "buttonId": "uptime-btn",
                            "buttonText": { "displayText": waChannel },
                            "type": 1,
                        },
                    ],
                },
            },
            {
                header: {
                    title: `╭───────────⊷
┊▢ *${texts.name} ɳʝαႦυʅσ ʝႦ*
┊▢ *${texts.date} ${date}*
┊▢ *${texts.time} ${temps}*
┊▢ *${texts.totalUsers} ${formattedTotalUsers} ${texts.users}*
┌┤`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `
╔
 *${texts.cmd}* 11
 *${texts.menu}* Ｇｅｎｅｒａｌ
 *${texts.more}* ᴏɴ
 *${texts.type}* ${texts.generalMenu}
╚`,
                },
                footer: {
                    text: `┌┤🌇 *${texts.hallo} ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            "buttonId": "uptime-btn",
                            "buttonText": { "displayText": waChannel },
                            "type": 1,
                        },
                    ],
                },
            },
            {
                header: {
                    title: `╭───────────⊷
┊▢ *${texts.name} ɳʝαႦυʅσ ʝႦ*
┊▢ *${texts.date} ${date}*
┊▢ *${texts.time} ${temps}*
┊▢ *${texts.totalUsers} ${formattedTotalUsers} ${texts.users}*
┌┤`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `
╔
 *${texts.cmd}* 12
 *${texts.menu}* Ａｎｉｍｅ
 *${texts.more}* ᴏɴ
 *${texts.type}* ${texts.animeMenu}
╚`,
                },
                footer: {
                    text: `┌┤🌇 *${texts.hallo} ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            "buttonId": "uptime-btn",
                            "buttonText": { "displayText": waChannel },
                            "type": 1,
                        },
                    ],
                },
            },
            {
                header: {
                    title: `╭───────────⊷
┊▢ *${texts.name} ɳʝαႦυʅσ ʝႦ*
┊▢ *${texts.date} ${date}*
┊▢ *${texts.time} ${temps}*
┊▢ *${texts.totalUsers} ${formattedTotalUsers} ${texts.users}*
┌┤`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `
╔
 *${texts.cmd}* 18
 *${texts.menu}* Ｂｕｇ
 *${texts.more}* ᴏɴ
 *${texts.type}* ${texts.bugMenu}
╚`,
                },
                footer: {
                    text: `┌┤🌇 *${texts.hallo} ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            "buttonId": "uptime-btn",
                            "buttonText": { "displayText": waChannel },
                            "type": 1,
                        },
                    ],
                },
            },
            {
                header: {
                    title: `╭───────────⊷
┊▢ *${texts.name} ɳʝαႦυʅσ ʝႦ*
┊▢ *${texts.date} ${date}*
┊▢ *${texts.time} ${temps}*
┊▢ *${texts.totalUsers} ${formattedTotalUsers} ${texts.users}*
┌┤`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `
╔
 *${texts.cmd}* 23
 *${texts.menu}* Ｇｒｏｕｐ
 *${texts.more}* ᴏɴ
 *${texts.type}* ${texts.groupMenu}
╚`,
                },
                footer: {
                    text: `┌┤🌇 *${texts.hallo} ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            "buttonId": "uptime-btn",
                            "buttonText": { "displayText": waChannel },
                            "type": 1,
                        },
                    ],
                },
            },
            {
                header: {
                    title: `╭───────────⊷
┊▢ *${texts.name} ɳʝαႦυʅσ ʝႦ*
┊▢ *${texts.date} ${date}*
┊▢ *${texts.time} ${temps}*
┊▢ *${texts.totalUsers} ${formattedTotalUsers} ${texts.users}*
┌┤`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `
╔
 *${texts.cmd}* 19
 *${texts.menu}* Ｕｓｅ
 *${texts.more}* ᴏɴ
 *${texts.type}* ${texts.useMenu}
╚`,
                },
                footer: {
                    text: `┌┤🌇 *${texts.hallo} ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            "buttonId": "uptime-btn",
                            "buttonText": { "displayText": waChannel },
                            "type": 1,
                        },
                    ],
                },
            },
            {
                header: {
                    title: `╭───────────⊷
┊▢ *${texts.name} ɳʝαႦυʅσ ʝႦ*
┊▢ *${texts.date} ${date}*
┊▢ *${texts.time} ${temps}*
┊▢ *${texts.totalUsers} ${formattedTotalUsers} ${texts.users}*
┌┤`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `
╔
 *${texts.cmd}* 20
 *${texts.menu}* Ｈｅｒｏｋｕ
 *${texts.more}* ᴏɴ
 *${texts.type}* ${texts.herokuMenu}
╚`,
                },
                footer: {
                    text: `┌┤🌇 *${texts.hallo} ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            "buttonId": "uptime-btn",
                            "buttonText": { "displayText": waChannel },
                            "type": 1,
                        },
                    ],
                },
            },
            {
                header: {
                    title: `╭───────────⊷
┊▢ *${texts.name} ɳʝαႦυʅσ ʝႦ*
┊▢ *${texts.date} ${date}*
┊▢ *${texts.time} ${temps}*
┊▢ *${texts.totalUsers} ${formattedTotalUsers} ${texts.users}*
┌┤`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `
╔
 *${texts.cmd}* 5
 *${texts.menu}* Ｃｈａｔ
 *${texts.more}* ᴏɴ
 *${texts.type}* ${texts.chatMenu}
╚`,
                },
                footer: {
                    text: `┌┤🌇 *${texts.hallo} ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            "buttonId": "uptime-btn",
                            "buttonText": { "displayText": waChannel },
                            "type": 1,
                        },
                    ],
                },
            },
        ];

        const audioUrl = "https://files.catbox.moe/bf8mnv.mp3";

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
                            header: { text: texts.systemInfo },
                            body: { text: texts.completed },
                            carouselMessage: { cards },
                        },
                    },
                },
            },
            {
                quoted: {
                    key: {
                        fromMe: false,
                        participant: `0@s.whatsapp.net`,
                        remoteJid: "status@broadcast"
                    },
                    message: {
                        contactMessage: {
                            displayName: "ɳʝαႦυʅσ ʝႦ",
                            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=26777821911:+26777821911\nitem1.X-ABLabel:Bot\nEND:VCARD`
                        }
                    }
                }
            }
        );

        await zk.relayMessage(dest, message.message, { messageId: message.key.id });

        await zk.sendMessage(dest, {
            audio: { url: audioUrl },
            mimetype: 'audio/mp4',
            ptt: true
        }, {
            quoted: {
                key: {
                    fromMe: false,
                    participant: `0@s.whatsapp.net`,
                    remoteJid: "status@broadcast"
                },
                message: {
                    contactMessage: {
                        displayName: "ɳʝαႦυʅσ ʝႦ",
                        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=26777821911:+26777821911\nitem1.X-ABLabel:Bot\nEND:VCARD`
                    }
                }
            }
        });

    } catch (e) {
        console.error("Error in menu command:", e);
        repondre(`An error occurred: ${e.message}`);
    }
});
