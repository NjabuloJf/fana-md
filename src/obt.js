const JavaScriptObfuscator = require("javascript-obfuscator");
const { fana } = require("../njabulo/fana");
const config = require("../set");

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
const buttons = [
    {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
            display_text: "📋 Copy Code",
            id: "copy",
            copy_code: "",
        }),
    },
];

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
    const buttonsCopy = JSON.parse(JSON.stringify(buttons));
    buttonsCopy[0].buttonParamsJson = JSON.stringify({
        display_text: "📋 Copy Code",
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

        if (!arg[0]) {
            return sendFormattedMessage(
                zk,
                chatId,
                "📌 *JavaScript Obfuscator*\n\nAfter the command, provide a valid JavaScript code for encryption.\n\n📝 *Example:* `.obt console.log('Hello World')`",
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
                finalText = finalText.substring(0, 2970) + "\n\n...*[Code truncated due to length]*";
            }
            
            await sendFormattedMessage(zk, chatId, finalText, ms);
            
        } catch (error) {
            console.error("Obfuscation error:", error);
            sendFormattedMessage(
                zk,
                chatId,
                "❌ *Error*\n\nSomething went wrong. Check if your code is logical and has the correct syntax.\n\nMake sure you entered valid JavaScript code.",
                ms
            );
        }
    }
);
