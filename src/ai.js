const { fana } = require("../njabulo/fana");
const axios = require('axios');
const fs = require('fs');
const conf = require(__dirname + "/../set");

// ── Random image list ─────────────────────────────────────────────
const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png"
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Standard button set ────────────────────────────────────────────
const baseButtons = [
    {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
            display_text: "🌐 WA Channel",
            id: "backup channel",
            url: "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u",
        }),
    },
    {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
            display_text: "📋 Copy",
            id: "copy",
            copy_code: "",
        }),
    },
];

// ── YOUR WORKING APIS (FIXED PARSING) ─────────────────────────────
const AI_APIS = [
    async (q) => {
        const url = `https://mistral.stacktoy.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 15000 });
        // CORRECTED: extracts the response from data.data.response
        return data?.data?.response || null;
    },
    async (q) => {
        const url = `https://llama.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 15000 });
        // Adjust if this API returns a different structure
        return data?.data?.response || data?.response || null;
    },
    async (q) => {
        const url = `https://mistral.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 15000 });
        // Adjust if this API returns a different structure
        return data?.data?.response || data?.response || null;
    }
];

// ── AI FETCHER WITH FALLBACK ──────────────────────────────────────
const askAI = async (query) => {
    for (const api of AI_APIS) {
        try {
            console.log(`🔄 Trying API...`);
            const response = await api(query);
            if (response && typeof response === 'string' && response.trim().length > 0) {
                console.log(`✅ API Success! Response length: ${response.length}`);
                return response.trim();
            }
        } catch (error) {
            console.log(`❌ API failed: ${error.message}`);
            continue;
        }
    }
    return "🤖 *AI Service temporarily unavailable* 🤖\n\nPlease try again in a few moments.\n\n> 💫 NJABULO MD";
};

// ── Helper that sends interactive message ──────────────────────────
async function sendFormattedMessage(zk, chatId, text, ms) {
    const buttons = JSON.parse(JSON.stringify(baseButtons));
    buttons[1].buttonParamsJson = JSON.stringify({
        display_text: "📋 Copy",
        id: "copy",
        copy_code: text,
    });

    let finalText = text;
    if (finalText.length > 3000) {
        finalText = finalText.substring(0, 2970) + "\n\n...*[Message truncated due to length]*";
    }

    await zk.sendMessage(
        chatId,
        {
            text: finalText,
            buttons: buttons.map(btn => ({
                buttonId: btn.name === "cta_url" ? "url" : btn.name,
                buttonText: { displayText: JSON.parse(btn.buttonParamsJson).display_text },
                type: btn.name === "cta_url" ? 2 : 1
            })),
            viewOnce: false
        },
        { quoted: ms }
    );
}

// General handler for AI commands
const handleAiCommand = async (dest, zk, params, systemPrompt, usageExample) => {
    const { repondre, arg } = params;
    const query = arg.join(" ").trim();

    if (!query) {
        return repondre(usageExample);
    }

    // Send typing indicator
    await zk.sendPresenceUpdate('composing', dest);
    
    try {
        let response = await askAI(query);
        
        if (systemPrompt && response && !response.includes("unavailable")) {
            response = `${systemPrompt}\n${response}`;
        }
        
        await sendFormattedMessage(zk, dest, response, params.ms);
    } catch (error) {
        console.error("Error:", error);
        await repondre("❌ *Error* ❌\n\nSorry, I couldn't process your request. Please try again later.\n\n> 💫 NJABULO MD");
    }
};

// ── COMMAND HANDLERS ───────────────────────────────────────────────

fana({
    nomCom: "chat",
    alias: ["chatbot", "chatai"],
    reaction: '⚔️',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "", "📌 *.chat <message>*\n\nExample: .chat Hello, how are you?");
});

fana({
    nomCom: "njabulo",
    alias: ["njabulomd", "njabulbot"],
    reaction: '⚔️',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "🤖 *NJABULO MD:*\n\n", "📌 *.njabulo <message>*\n\nExample: .njabulo What can you do?");
});

fana({
    nomCom: "gpt",
    alias: ["chatgpt", "gptai"],
    reaction: '👻',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "", "📌 *.gpt <message>*\n\nExample: .gpt Tell me a joke");
});

fana({
    nomCom: "gemini",
    alias: ["gemini4", "geminiai"],
    reaction: '👻',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "", "📌 *.gemini <message>*\n\nExample: .gemini Write a poem");
});

fana({
    nomCom: "ilama",
    alias: ["llama", "llamaai"],
    reaction: '🤖',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "", "📌 *.ilama <message>*\n\nExample: .ilama Explain AI");
});
