const { fana } = require("../njabulo/fana");
const config = require("../set");
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
async function getTranslatedButtons() {
    const lang = config.LANGUAGE || "en";
    const waChannel = await translateText("channel", lang);
    return waChannel;
}

// ── Button definition (used for both help‑msg and the new pic‑msg) ─────
async function getButtons() {
    const waChannel = await getTranslatedButtons();
    return [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: waChannel,
                id: "backup channel",
                url: config.GURL
            }),
        },
    ];
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

// ── Helper that sends an interactive message (image + buttons) ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
    const buttons = await getButtons();
    await zk.sendMessage(
        chatId,
        {
            interactiveMessage: {
                image: { url: randomNjabulourl },
                header: text,
                buttons,
                headerType: 1,
            }
        },
        { quoted: ms }
    );
}

// ── Command: .getpp ─────────────────────────────────────────────
fana({
    nomCom: "getpp",
    categorie: "General",
    reaction: "📷",
}, async (chatId, zk, commandeOptions) => {
    const {
        ms,
        repondre,
        msgRepondu,
        auteurMsgRepondu,
        mybotpic,
        nomAuteurMessage,
    } = commandeOptions;

    const lang = config.LANGUAGE || "en";

    // Translated texts
    const yoText = await translateText("Yo", lang);
    const replyToMessage = await translateText("reply to someone's message to snag their profile pic!", lang);
    const dontMakeMe = await translateText("Don't make Njabulo Jb do extra work!", lang);
    const huntingFor = await translateText("Njabulo Jb's hunting for", lang);
    const profilePic = await translateText("profile pic!", lang);
    const holdTight = await translateText("Hold tight!", lang);
    const lockedTight = await translateText("profile pic is locked tight!", lang);
    const gotMyPic = await translateText("Njabulo Jb's got you my pic instead!", lang);
    const boom = await translateText("BOOM!", lang);
    const snagged = await translateText("Snagged", lang);
    const profilePicOf = await translateText("profile pic!", lang);
    const totalBust = await translateText("TOTAL BUST!", lang);
    const crashed = await translateText("Njabulo Jb crashed while grabbing the pic:", lang);
    const tryAgain = await translateText("Try again or flop!", lang);

    if (!msgRepondu) {
        return sendFormattedMessage(
            zk,
            chatId,
            `${yoText} ${nomAuteurMessage}, ${replyToMessage} 😡 ${dontMakeMe} 🤔`,
            ms
        );
    }

    try {
        await sendFormattedMessage(
            zk,
            chatId,
            `${yoText} ${nomAuteurMessage}, ${huntingFor} @${auteurMsgRepondu.split("@")[0]}’s ${profilePic} 📸 ${holdTight} 🔍`,
            ms
        );

        let ppuser;
        try {
            ppuser = await zk.profilePictureUrl(auteurMsgRepondu, "image");
        } catch {
            ppuser = mybotpic();
            await sendFormattedMessage(
                zk,
                chatId,
                `${yoText} ${nomAuteurMessage}, @${auteurMsgRepondu.split("@")[0]}’s ${lockedTight} 😣 ${gotMyPic} 😎`,
                ms
            );
        }

        // ── Send the picture WITH a button ─────────────────────────────────
        const buttons = await getButtons();
        await zk.sendMessage(
            chatId,
            {
                interactiveMessage: {
                    image: { url: ppuser },
                    header: `${boom} ${nomAuteurMessage}! ${snagged} @${auteurMsgRepondu.split("@")[0]}’s ${profilePicOf} 🔥`,
                    buttons,
                    headerType: 1,
                }
            },
            { quoted: ms }
        );

    } catch (error) {
        console.error("Error in .getpp command:", error);
        await sendFormattedMessage(
            zk,
            chatId,
            `${totalBust} ${nomAuteurMessage}! ${crashed} ${error.message} 😡 ${tryAgain} 😣`,
            ms
        );
    }
});

fana({
    nomCom: "profile",
    categorie: "General",
    reaction: "📷",
}, async (chatId, zk, commandeOptions) => {
    const {
        ms,
        repondre,
        msgRepondu,
        auteurMsgRepondu,
        mybotpic,
        nomAuteurMessage,
    } = commandeOptions;

    const lang = config.LANGUAGE || "en";

    // Translated texts
    const yoText = await translateText("Yo", lang);
    const replyToMessage = await translateText("reply to someone's message to snag their profile pic!", lang);
    const dontMakeMe = await translateText("Don't make Njabulo Jb do extra work!", lang);
    const huntingFor = await translateText("Njabulo Jb's hunting for", lang);
    const profilePic = await translateText("profile pic!", lang);
    const holdTight = await translateText("Hold tight!", lang);
    const lockedTight = await translateText("profile pic is locked tight!", lang);
    const gotMyPic = await translateText("Njabulo Jb's got you my pic instead!", lang);
    const boom = await translateText("BOOM!", lang);
    const snagged = await translateText("Snagged", lang);
    const profilePicOf = await translateText("profile pic!", lang);
    const totalBust = await translateText("TOTAL BUST!", lang);
    const crashed = await translateText("Njabulo Jb crashed while grabbing the pic:", lang);
    const tryAgain = await translateText("Try again or flop!", lang);

    if (!msgRepondu) {
        return sendFormattedMessage(
            zk,
            chatId,
            `${yoText} ${nomAuteurMessage}, ${replyToMessage} 😡 ${dontMakeMe} 🤔`,
            ms
        );
    }

    try {
        await sendFormattedMessage(
            zk,
            chatId,
            `${yoText} ${nomAuteurMessage}, ${huntingFor} @${auteurMsgRepondu.split("@")[0]}’s ${profilePic} 📸 ${holdTight} 🔍`,
            ms
        );

        let ppuser;
        try {
            ppuser = await zk.profilePictureUrl(auteurMsgRepondu, "image");
        } catch {
            ppuser = mybotpic();
            await sendFormattedMessage(
                zk,
                chatId,
                `${yoText} ${nomAuteurMessage}, @${auteurMsgRepondu.split("@")[0]}’s ${lockedTight} 😣 ${gotMyPic} 😎`,
                ms
            );
        }

        // ── Send the picture WITH a button ─────────────────────────────────
        const buttons = await getButtons();
        await zk.sendMessage(
            chatId,
            {
                interactiveMessage: {
                    image: { url: ppuser },
                    header: `${boom} ${nomAuteurMessage}! ${snagged} @${auteurMsgRepondu.split("@")[0]}’s ${profilePicOf} 🔥`,
                    buttons,
                    headerType: 1,
                }
            },
            { quoted: ms }
        );

    } catch (error) {
        console.error("Error in .getpp command:", error);
        await sendFormattedMessage(
            zk,
            chatId,
            `${totalBust} ${nomAuteurMessage}! ${crashed} ${error.message} 😡 ${tryAgain} 😣`,
            ms
        );
    }
});
