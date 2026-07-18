const { fana } = require("../njabulo/fana");
const config = require("../set");
const fancy = require("../njabulo/style");
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
    return await translateText("Copy", lang);
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

// ── Helper that builds the button list for a given copy‑text ─────
async function buildButtons(copyText) {
    const copyTextTranslated = await getTranslatedButton();
    return [
        {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
                display_text: copyTextTranslated,
                id: "copy",
                copy_code: copyText,
            }),
        },
    ];
}

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
    const buttons = await buildButtons(text);

    await zk.sendMessage(
        chatId,
        {
            interactiveMessage: {
                image: { url: randomNjabulourl },
                header: text,
                buttons,
                headerType: 1,
            },
        },
        { quoted: ms }
    );
}

// ── Command: .fancy ─────────────────────────────────────────────
fana({
    nomCom: "fancy",
    categorie: "Fun",
    reaction: "✍️",
}, async (dest, zk, commandeOptions) => {
    const { arg, repondre, prefixe, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    // Translated texts
    const exampleText = await translateText("Exemple :", lang);
    const styleNotFound = await translateText("_Style not found :(_", lang);
    const errorOccurred = await translateText("_An error occurred :(_", lang);
    const copyText = await translateText("Copy", lang);

    const id = arg[0]?.match(/\d+/)?.join("");
    const text = arg.slice(1).join(" ");

    try {
        if (!id || !text) {
            const helpText =
                `\n${exampleText} ${prefixe}fancy 10 Njabulo Jb\n` +
                String.fromCharCode(8206).repeat(4001) +
                fancy.list("Njabulo Jb 2025", fancy);

            const buttons = await buildButtons(helpText);
            await zk.sendMessage(dest, {
                interactiveMessage: {
                    image: { url: randomNjabulourl },
                    header: helpText,
                    buttons,
                    headerType: 1,
                },
            }, { quoted: ms });
            return;
        }

        const selectedStyle = fancy[parseInt(id) - 1];
        if (selectedStyle) {
            const styled = fancy.apply(selectedStyle, text);
            await sendFormattedMessage(zk, dest, styled, ms);
        } else {
            await sendFormattedMessage(zk, dest, styleNotFound, ms);
        }
    } catch (error) {
        console.error(error);
        await sendFormattedMessage(zk, dest, errorOccurred, ms);
    }
}); 
