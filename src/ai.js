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

// ── Standard button set (used by all modules) ────────────────────────
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

// ── NEW AI APIS (replaced bk9.fun) ─────────────────────────────────
const AI_APIS = [
    (q) => `https://mistral.stacktoy.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`,
    (q) => `https://llama.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`,
    (q) => `https://mistral.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`
];

const askAI = async (query) => {
    for (const apiUrl of AI_APIS) {
        try {
            const { data } = await axios.get(apiUrl(query), { timeout: 15000 });
            const response = data?.data?.response || data?.response || data?.BK9 || data?.message;
            if (response && typeof response === 'string' && response.trim()) {
                return response.trim();
            }
        } catch {
            continue;
        }
    }
    throw new Error('All AI APIs failed');
};

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
    const buttons = JSON.parse(JSON.stringify(baseButtons));
    buttons[1].buttonParamsJson = JSON.stringify({
        display_text: "📋 Copy",
        id: "copy",
        copy_code: text,
    });

    await zk.sendMessage(
        chatId,
        {
            interactiveMessage: {
                image: { url: randomNjabulourl },
                header: { title: "🤖 NJABULO MD AI", hasMediaAttachment: false },
                body: { text: text },
                footer: { text: "💫 Powered by NJABULO MD" },
                buttons: buttons,
                headerType: 1,
            },
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

    try {
        let response = await askAI(query);
        
        if (systemPrompt && response) {
            response = `${systemPrompt}\n\n${response}`;
        }
        
        if (response.length > 4000) {
            response = response.substring(0, 3970) + "...\n\n📌 *Response truncated due to length*";
        }
        
        await sendFormattedMessage(zk, dest, response, params.ms);
    } catch (error) {
        console.error("Error generating AI response:", error);
        await repondre("❌ Sorry, I couldn't process your request. Please try again later.");
    }
};

// ── COMMAND HANDLERS ─────────────────────────────────────────────────

// Chat command
fana({
    nomCom: "chat",
    alias: ["chatbot", "chatai"],
    reaction: '⚔️',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "", "📌 *Usage:* .chat <message>\n\n📝 *Example:* .chat Hello, how are you?");
});

// Njabulo command
fana({
    nomCom: "njabulo",
    alias: ["njabulomd", "njabulbot"],
    reaction: '⚔️',
    categorie: "AI"
}, async (dest, zk, params) => {
    const systemPrompt = "🤖 *NJABULO MD AI* 🤖\n\n";
    handleAiCommand(dest, zk, params, systemPrompt, "📌 *Usage:* .njabulo <message>\n\n📝 *Example:* .njabulo What can you do?");
});

// GPT command
fana({
    nomCom: "gpt",
    alias: ["chatgpt", "gptai"],
    reaction: '👻',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "", "📌 *Usage:* .gpt <message>\n\n📝 *Example:* .gpt Tell me a joke");
});

// Gemini command
fana({
    nomCom: "gemini",
    alias: ["gemini4", "geminiai"],
    reaction: '👻',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "", "📌 *Usage:* .gemini <message>\n\n📝 *Example:* .gemini Write a poem");
});

// Ilama command
fana({
    nomCom: "ilama",
    alias: ["llama", "llamaai"],
    reaction: '🤖',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "", "📌 *Usage:* .ilama <message>\n\n📝 *Example:* .ilama Explain AI");
});
