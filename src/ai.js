const { fana } = require("../njabulo/fana");
const axios = require('axios');
const conf = require(__dirname + "/../set");

// ── YOUR WORKING APIS ─────────────────────────────────────────────
const AI_APIS = [
    async (q) => {
        const url = `https://mistral.stacktoy.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 15000 });
        return data?.data?.response || null;
    },
    async (q) => {
        const url = `https://llama.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 15000 });
        return data?.data?.response || data?.response || null;
    },
    async (q) => {
        const url = `https://mistral.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 15000 });
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
                console.log(`✅ API Success!`);
                return response.trim();
            }
        } catch (error) {
            console.log(`❌ API failed: ${error.message}`);
            continue;
        }
    }
    return "⚠️ AI service is currently unavailable. Please try again later.";
};

// ── SIMPLE TEXT MESSAGE (NO BUTTONS) ──────────────────────────────
async function sendMessage(zk, chatId, text, ms) {
    await zk.sendMessage(chatId, { text: text }, { quoted: ms });
}

// General handler for AI commands
const handleAiCommand = async (dest, zk, params, usageExample) => {
    const { repondre, arg } = params;
    const query = arg.join(" ").trim();

    if (!query) {
        return repondre(usageExample);
    }

    // Send typing indicator
    await zk.sendPresenceUpdate('composing', dest);
    
    try {
        let response = await askAI(query);
        
        // Truncate if too long
        if (response.length > 4000) {
            response = response.substring(0, 3970) + "\n\n...*[Message truncated]*";
        }
        
        await sendMessage(zk, dest, response, params.ms);
    } catch (error) {
        console.error("Error:", error);
        await repondre("❌ Error: Could not process your request. Please try again.");
    }
};

// ── COMMAND HANDLERS (NO BUTTONS) ─────────────────────────────────

fana({
    nomCom: "chat",
    alias: ["chatbot", "chatai", "ai"],
    reaction: '⚔️',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.chat <message>*\n\nExample: .chat Hello, how are you?");
});

fana({
    nomCom: "njabulo",
    alias: ["njabulomd", "njabulbot"],
    reaction: '⚔️',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.njabulo <message>*\n\nExample: .njabulo What can you do?");
});

fana({
    nomCom: "gpt",
    alias: ["chatgpt", "gptai"],
    reaction: '👻',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.gpt <message>*\n\nExample: .gpt Tell me a joke");
});

fana({
    nomCom: "gemini",
    alias: ["gemini4", "geminiai"],
    reaction: '👻',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.gemini <message>*\n\nExample: .gemini Write a poem");
});

fana({
    nomCom: "ilama",
    alias: ["llama", "llamaai"],
    reaction: '🤖',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.ilama <message>*\n\nExample: .ilama Explain AI");
});

// Test command
fana({
    nomCom: "aitest",
    alias: ["testai"],
    reaction: '🔧',
    categorie: "AI"
}, async (dest, zk, params) => {
    const { repondre } = params;
    await repondre("🔧 *AI System Ready* 🔧\n\nSend .chat <message> to test the AI.\n\n> NJABULO MD");
});
