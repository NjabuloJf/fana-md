const { fana } = require("../njabulo/fana");
const config = require("../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const axios = require('axios');

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
    const repositoryGit = await translateText("owner repository", lang);
    const getPairCode = await translateText("website site owner", lang);
    const poweredBy = await translateText("Pσɯҽɾ Ⴆყ Ɲנαвυʟσ Jbᯤ", lang);
    const systemInfo = await translateText("🔍 System Info", lang);
    const systemsLoading = await translateText("*📂 sʏsᴛᴇᴍs ʟᴏᴀᴅɪɴɢ.....*", lang);
    const repositoryGitTitle = await translateText("📊 repository git", lang);
    const getPairCodeTitle = await translateText("📊 get pair code", lang);
    const nameLabel = await translateText("*Name :", lang);
    const createdLabel = await translateText("*Created* :", lang);
    const updatedLabel = await translateText("*Updated* :", lang);
    const starsLabel = await translateText("*Stars* :", lang);
    const forksLabel = await translateText("*Forks* :", lang);
    const njabuloName = await translateText("Njabulo Jb", lang);
    const errorMsg = await translateText("An error occurred:", lang);

    return {
        repositoryGit,
        getPairCode,
        poweredBy,
        systemInfo,
        systemsLoading,
        repositoryGitTitle,
        getPairCodeTitle,
        nameLabel,
        createdLabel,
        updatedLabel,
        starsLabel,
        forksLabel,
        njabuloName,
        errorMsg
    };
}

fana({
    nomCom: "rep",
    alias: ["repository"],
    categorie: "General",
    reaction: "⭐",
    use: ".repo",
}, async (dest, zk, commandeOptions) => {
    console.log('Command triggered!');
    const { repondre, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    try {
        const t = await getTranslatedButtons();

        const repo = 'NjabuloJf/Njabulo-Jb';
        const response = await axios.get(`https://api.github.com/repos/${repo}`);
        const data = response.data;
        const created = new Date(data.created_at).toLocaleDateString();
        const updated = new Date(data.updated_at).toLocaleDateString();
        const license = data.license ? data.license.name : 'Not specified';

        const njabulox = [
            "https://files.catbox.moe/mh36c7.jpg",
            "https://files.catbox.moe/bnb3vx.jpg"
        ];

        const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
        if (!randomNjabulourl) {
            console.error("Error: No image URL found.");
            repondre("An error occurred: No image URL found.");
            return;
        }

        const cards = [
            {
                header: {
                    title: t.repositoryGitTitle,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `
${t.nameLabel} ${t.njabuloName}
${t.createdLabel} ${created}
${t.updatedLabel} ${updated}
                    `,
                },
                footer: {
                    text: t.poweredBy,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: t.repositoryGit,
                                url: `https://github.com/${repo}`,
                            }),
                        },
                    ],
                },
            },
            {
                header: {
                    title: t.getPairCodeTitle,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `
${t.nameLabel} ${t.njabuloName}
${t.starsLabel} ${data.stargazers_count}
${t.forksLabel} ${data.forks_count}
                    `,
                },
                footer: {
                    text: t.poweredBy,
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: t.getPairCode,
                                url: `https://github.com/${repo}`,
                            }),
                        },
                    ],
                },
            },
        ];

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
                            header: { text: t.systemInfo },
                            body: { text: t.systemsLoading },
                            carouselMessage: { cards },
                        },
                    },
                },
            },
            { quoted: ms }
        );
        await zk.relayMessage(dest, message.message, { messageId: message.key.id });
    } catch (e) {
        console.error("Error in repo command:", e);
        const t = await getTranslatedButtons();
        repondre(`${t.errorMsg} ${e.message}`);
    }
});
