const { fana } = require("../njabulo/fana");
const axios = require("axios");
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
async function getTranslatedButton() {
    const lang = config.LANGUAGE || "en";
    return await translateText("📋 Copy", lang);
}

async function getTranslatedCopyCode() {
    const lang = config.LANGUAGE || "en";
    return await translateText("📋 Copy Code", lang);
}

// ── Random image list from GitHub ─────────────────────────────────────────────
const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Base button definition (only Copy button) ────────────────────────
async function getBaseButtons() {
    const copyText = await getTranslatedButton();
    return [
        {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
                display_text: copyText,
                id: "copy",
                copy_code: "",
            }),
        },
    ];
}

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
    const baseButtons = await getBaseButtons();
    const buttons = JSON.parse(JSON.stringify(baseButtons));
    const copyCodeText = await getTranslatedCopyCode();
    buttons[0].buttonParamsJson = JSON.stringify({
        display_text: copyCodeText,
        id: "copy",
        copy_code: text,
    });

    await zk.sendMessage(
        chatId,
        {
            interactiveMessage: {
                image: { url: randomNjabulourl },
                header: text,
                buttons: buttons,
                headerType: 1,
            },
        },
        { quoted: ms }
    );
}

// ── Pair code command ─────────────────────────────────────────────
fana({
    nomCom: "pair",
    aliases: ["session", "code", "paircode", "qrcode"],
    reaction: "📡",
    categorie: "system",
}, async (chatId, zk, commandeOptions) => {
    const { repondre, arg, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    // ========== TRANSLATED TEXTS ==========
    const enterNumber = await translateText("📌 *Enter your number like:*", lang);
    const generating = await translateText("⏳ *Wait, generating your pairing code...*", lang);
    const yourPairCode = await translateText("🔐 *YOUR PAIRING CODE* 🔐", lang);
    const copyAndPaste = await translateText("✅ *Here is your pair code, copy and paste it to the notification above or link devices.*", lang);
    const errorMsg = await translateText("❌ Error getting response from API.", lang);
    const copyCode = await translateText("📋 Copy Code", lang);

    if (!arg || arg.length === 0) {
        return sendFormattedMessage(
            zk,
            chatId,
            `${enterNumber}\n\n.pair 26777821911`,
            ms
        );
    }

    try {
        await sendFormattedMessage(
            zk,
            chatId,
            generating,
            ms
        );

        const encodedNumber = encodeURIComponent(arg.join(" "));
        const apiUrl = `https://site-code-bv0o.onrender.com/code?number=${encodedNumber}`;

        const response = await axios.get(apiUrl);
        const data = response.data;

        if (data && data.code) {
            const pairingCode = data.code;

            // Send the pairing code with copy button
            const baseButtons = await getBaseButtons();
            const buttons = JSON.parse(JSON.stringify(baseButtons));
            buttons[0].buttonParamsJson = JSON.stringify({
                display_text: copyCode,
                id: "copy",
                copy_code: pairingCode,
            });

            await zk.sendMessage(
                chatId,
                {
                    interactiveMessage: {
                        image: { url: randomNjabulourl },
                        header: `${yourPairCode}\n\n${pairingCode}`,
                        buttons: buttons,
                        headerType: 1,
                    },
                },
                { quoted: ms }
            );

            await sendFormattedMessage(
                zk,
                chatId,
                copyAndPaste,
                ms
            );
        } else {
            throw new Error("Invalid response from API.");
        }
    } catch (error) {
        console.error("Error getting API response:", error.message);
        sendFormattedMessage(zk, chatId, errorMsg, ms);
    }
});
