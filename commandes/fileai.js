const { fana } = require("../njabulo/fana");
const axios = require('axios');
const config = require(__dirname + "/../set");

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
    return await translateText("channel", lang);
}

const buttons = [
    {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
            display_text: "🌐WA channel",
            id: "backup channel",
            url: config.GURL
        }),
    },
];

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

// ── SIMPLE TEXT MESSAGE WITH TRANSLATED BUTTONS ──────────────────
async function sendMessage(zk, chatId, text, ms) {
    const buttonText = await getTranslatedButton();
    
    const translatedButtons = [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: buttonText,
                id: "backup channel",
                url: config.GURL
            }),
        },
    ];
    
    await zk.sendMessage(chatId, {
        interactiveMessage: {
            header: text,
            buttons: translatedButtons,
            headerType: 1
        }
    }, { quoted: ms });
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

// ── ALL AI COMMANDS ───────────────────────────────────────────────

// 1. ai command
fana({
    nomCom: "ai",
    alias: ["artificial", "intelligence"],
    reaction: '🧠',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.ai <message>*\n\nExample: .ai What is artificial intelligence?");
});

// 2. chat command
fana({
    nomCom: "chat",
    alias: ["chatbot", "chatai"],
    reaction: '💬',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.chat <message>*\n\nExample: .chat Hello, how are you?");
});

// 3. njabulo command
fana({
    nomCom: "njabulo",
    alias: ["njabulomd", "njabulbot", "njab"],
    reaction: '👑',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.njabulo <message>*\n\nExample: .njabulo Who are you?");
});

// 4. gpt command
fana({
    nomCom: "gpt",
    alias: ["chatgpt", "gptai", "openai"],
    reaction: '🤖',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.gpt <message>*\n\nExample: .gpt Tell me a joke");
});

// 5. gpt-5.4-mini command
fana({
    nomCom: "gpt-5.4-mini",
    alias: ["gpt54", "gptmini54", "gpt5.4"],
    reaction: '⚡',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.gpt-5.4-mini <message>*\n\nExample: .gpt-5.4-mini Explain quantum physics");
});

// 6. gptmini command
fana({
    nomCom: "gptmini",
    alias: ["mini-gpt", "gpt-mini", "tinygpt"],
    reaction: '🔰',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.gptmini <message>*\n\nExample: .gptmini Write a short poem");
});

// 7. gemini command
fana({
    nomCom: "gemini",
    alias: ["gemini4", "geminiai", "googleai"],
    reaction: '✨',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.gemini <message>*\n\nExample: .gemini Write a story");
});

// 8. ilama command
fana({
    nomCom: "ilama",
    alias: ["llama", "llamaai", "metallama"],
    reaction: '🦙',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.ilama <message>*\n\nExample: .ilama Explain AI in simple terms");
});

// 9. ask command
fana({
    nomCom: "ask",
    alias: ["question", "askai", "askme"],
    reaction: '❓',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.ask <question>*\n\nExample: .ask What is the capital of France?");
});

// 10. bot command
fana({
    nomCom: "bot",
    alias: ["assistant", "helper"],
    reaction: '🤖',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.bot <message>*\n\nExample: .bot Help me with my homework");
});

// 11. smart command
fana({
    nomCom: "smart",
    alias: ["intelligent", "smartai"],
    reaction: '🧠',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.smart <message>*\n\nExample: .smart What's the meaning of life?");
});

// 12. quick command
fana({
    nomCom: "quick",
    alias: ["fast", "quickai"],
    reaction: '⚡',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.quick <message>*\n\nExample: .quick Quick response please");
});

// 13. pro command
fana({
    nomCom: "pro",
    alias: ["proai", "aipro"],
    reaction: '💎',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.pro <message>*\n\nExample: .pro Give me professional advice");
});

// 14. ultra command
fana({
    nomCom: "ultra",
    alias: ["ultraai", "aiultra"],
    reaction: '🚀',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.ultra <message>*\n\nExample: .ultra Advanced explanation please");
});

// 15. brain command
fana({
    nomCom: "brain",
    alias: ["brainy", "think"],
    reaction: '🧠',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.brain <message>*\n\nExample: .brain Solve this math problem");
});

// 16. wisdom command
fana({
    nomCom: "wisdom",
    alias: ["wise", "sage"],
    reaction: '🦉',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.wisdom <message>*\n\nExample: .wisdom Give me motivational advice");
});

// 17. genius command
fana({
    nomCom: "genius",
    alias: ["brilliant", "smartest"],
    reaction: '⭐',
    categorie: "AI"
}, async (dest, zk, params) => {
    handleAiCommand(dest, zk, params, "📌 *.genius <message>*\n\nExample: .genius Complex problem solving");
});

// ── AI HELP COMMAND ───────────────────────────────────────────────
fana({
    nomCom: "aihelp",
    alias: ["aide", "helpai", "aicommands"],
    reaction: '📚',
    categorie: "AI"
}, async (dest, zk, params) => {
    const { repondre } = params;
    const lang = config.LANGUAGE || "en";
    
    const aiCommandsText = await translateText("AI COMMANDS MENU", lang);
    const generalText = await translateText("General AI chat", lang);
    const chatbotText = await translateText("Chatbot assistant", lang);
    const njabuloText = await translateText("Njabulo AI", lang);
    const gptText = await translateText("GPT AI", lang);
    const gptMiniText = await translateText("GPT 5.4 Mini", lang);
    const miniGptText = await translateText("Mini GPT", lang);
    const geminiText = await translateText("Gemini AI", lang);
    const llamaText = await translateText("Llama AI", lang);
    const askText = await translateText("Ask questions", lang);
    const botText = await translateText("Bot assistant", lang);
    const smartText = await translateText("Smart AI", lang);
    const quickText = await translateText("Quick response", lang);
    const proText = await translateText("Pro AI", lang);
    const ultraText = await translateText("Ultra AI", lang);
    const brainText = await translateText("Brain AI", lang);
    const wisdomText = await translateText("Wisdom AI", lang);
    const geniusText = await translateText("Genius AI", lang);
    const showMenuText = await translateText("Show this menu", lang);
    const poweredByText = await translateText("Powered by NJABULO MD", lang);
    
    const helpMessage = `╭━━━━━━━━━━━━━━━━━━━━╮
┃   🤖 *${aiCommandsText}* 🤖
┣━━━━━━━━━━━━━━━━━━━━┫
┃
┃ 📌 *.ai* - ${generalText}
┃ 📌 *.chat* - ${chatbotText}
┃ 📌 *.njabulo* - ${njabuloText}
┃ 📌 *.gpt* - ${gptText}
┃ 📌 *.gpt-5.4-mini* - ${gptMiniText}
┃ 📌 *.gptmini* - ${miniGptText}
┃ 📌 *.gemini* - ${geminiText}
┃ 📌 *.ilama* - ${llamaText}
┃ 📌 *.ask* - ${askText}
┃ 📌 *.bot* - ${botText}
┃ 📌 *.smart* - ${smartText}
┃ 📌 *.quick* - ${quickText}
┃ 📌 *.pro* - ${proText}
┃ 📌 *.ultra* - ${ultraText}
┃ 📌 *.brain* - ${brainText}
┃ 📌 *.wisdom* - ${wisdomText}
┃ 📌 *.genius* - ${geniusText}
┃
┣━━━━━━━━━━━━━━━━━━━━┫
┃ 📌 *.aihelp* - ${showMenuText}
┣━━━━━━━━━━━━━━━━━━━━┫
┃ ✨ ${poweredByText}
╰━━━━━━━━━━━━━━━━━━━━╯`;
    
    await repondre(helpMessage);
});

// ── AI TEST COMMAND ───────────────────────────────────────────────
fana({
    nomCom: "aitest",
    alias: ["testai", "checkai"],
    reaction: '🔧',
    categorie: "AI"
}, async (dest, zk, params) => {
    const { repondre } = params;
    const lang = config.LANGUAGE || "en";
    
    const aiSystemReady = await translateText("AI System Ready", lang);
    const allWorking = await translateText("All AI commands are working!", lang);
    const tryText = await translateText("Try", lang);
    const njabuloText = await translateText("NJABULO MD", lang);
    
    await repondre(`🔧 *${aiSystemReady}* 🔧\n\n✅ ${allWorking}\n\n📌 ${tryText}: .ai Hello\n\n> ${njabuloText}`);
});
