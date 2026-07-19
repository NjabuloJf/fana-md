const JavaScriptObfuscator = require("javascript-obfuscator");
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
async function getTranslatedButton() {
    const lang = config.LANGUAGE || "en";
    return await translateText("📋 Copy Code", lang);
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

// ── Base button definition (only Copy button) ────────────────────────
async function getButtons() {
    const copyCode = await getTranslatedButton();
    return [
        {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
                display_text: copyCode,
                id: "copy",
                copy_code: "",
            }),
        },
    ];
}

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
    const buttons = await getButtons();
    const buttonsCopy = JSON.parse(JSON.stringify(buttons));
    buttonsCopy[0].buttonParamsJson = JSON.stringify({
        display_text: await getTranslatedButton(),
        id: "copy",
        copy_code: text,
    });
    
    await zk.sendMessage(
        chatId,
        {
            interactiveMessage: {
                header: text,
                buttons: buttonsCopy,
                headerType: 1
            }
        },
        { quoted: ms }
    );
}

// ── Obfuscate command ─────────────────────────────────────────────
fana(
    {
        nomCom: "obt",
        alias: ["obfuscate", "encrypt"],
        categorie: "General",
        reaction: "🔒",
    },
    async (chatId, zk, commandeOptions) => {
        const { ms, arg, repondre } = commandeOptions;
        const lang = config.LANGUAGE || "en";

        // ========== TRANSLATED TEXTS ==========
        const jsObfuscator = await translateText("📌 *JavaScript Obfuscator*", lang);
        const afterCommand = await translateText("After the command, provide a valid JavaScript code for encryption.", lang);
        const example = await translateText("📝 *Example:*", lang);
        const errorMsg = await translateText("❌ *Error*", lang);
        const somethingWrong = await translateText("Something went wrong. Check if your code is logical and has the correct syntax.", lang);
        const validCode = await translateText("Make sure you entered valid JavaScript code.", lang);
        const codeTruncated = await translateText("Code truncated due to length", lang);

        if (!arg[0]) {
            return sendFormattedMessage(
                zk,
                chatId,
                `${jsObfuscator}\n\n${afterCommand}\n\n${example} .obt console.log('Hello World')`,
                ms
            );
        }

        try {
            const code = arg.join(" ");
            const obfuscated = JavaScriptObfuscator.obfuscate(code, {
                compact: true,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 1,
                numbersToExpressions: true,
                simplify: true,
                stringArrayShuffle: true,
                splitStrings: true,
                stringArrayThreshold: 1,
            });

            const obfText = obfuscated.getObfuscatedCode();
            
            // Truncate if too long
            let finalText = obfText;
            if (finalText.length > 3000) {
                finalText = finalText.substring(0, 2970) + `\n\n...*[${await translateText("Code truncated due to length", lang)}]*`;
            }
            
            await sendFormattedMessage(zk, chatId, finalText, ms);
            
        } catch (error) {
            console.error("Obfuscation error:", error);
            sendFormattedMessage(
                zk,
                chatId,
                `${errorMsg}\n\n${somethingWrong}\n\n${validCode}`,
                ms
            );
        }
    }
); 
