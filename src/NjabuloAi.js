const { fana } = require("../njabulo/fana");
const axios = require("axios");
const config = require("../set");

// ── YOUR WORKING APIS ─────────────────────────────────────────────
const AI_APIS = [
    async (q) => {
        const url = `https://mistral.stacktoy.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 30000 });
        return data?.data?.response || null;
    },
    async (q) => {
        const url = `https://llama.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 30000 });
        return data?.data?.response || data?.response || null;
    },
    async (q) => {
        const url = `https://mistral.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 30000 });
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
                console.log(`✅ API Success! Response length: ${response.length} chars`);
                return response.trim();
            }
        } catch (error) {
            console.log(`❌ API failed: ${error.message}`);
            continue;
        }
    }
    return "⚠️ AI service is currently unavailable. Please try again later.";
};

// ── Animated typing indicator ─────────────────────────────────────
async function sendTypingAnimation(zk, chatId, ms) {
    const frames = ['◐', '◓', '◑', '◒'];
    let i = 0;
    const typingMsg = await zk.sendMessage(chatId, { text: `🧠 *NJABULO AI is thinking* ${frames[0]}` }, { quoted: ms });
    
    const interval = setInterval(async () => {
        i = (i + 1) % frames.length;
        try {
            await zk.sendMessage(chatId, { text: `🧠 *NJABULO AI is thinking* ${frames[i]}`, edit: typingMsg.key });
        } catch (e) {}
    }, 500);
    
    return { typingMsg, interval };
}

async function sendErrorMessage(zk, chatId, text, ms) {
  await zk.sendMessage(chatId, { text: text }, { quoted: ms });
}

fana({
    nomCom: "njabuloai",
    alias: ["njabuloaai", "naai", "njabulo-ai"],
    categorie: "AI",
    reaction: "🧠",
}, async (chatId, zk, commandeOptions) => {
    const { ms, repondre, arg } = commandeOptions;
    
    const query = arg.join(' ').trim();
    
    if (!query) {
        return sendErrorMessage(zk, chatId, `📌 *NJABULO AI*

🤖 *How to use:*
• Ask me anything!
• Get intelligent responses
• Chat and learn

📝 *Example:* 
.njabuloai What is artificial intelligence?

💫 *Powered by NJABULO MD*`, ms);
    }

    // Send animated typing indicator
    const { typingMsg, interval } = await sendTypingAnimation(zk, chatId, ms);

    try {
        const response = await askAI(query);
        
        // Clear typing animation
        clearInterval(interval);
        if (typingMsg && typingMsg.key) {
            await zk.sendMessage(chatId, { delete: typingMsg.key }).catch(() => {});
        }
        
        if (!response || response.includes("unavailable")) {
            return sendErrorMessage(zk, chatId, `❌ *AI Service Unavailable*\n\nPlease try again later.`, ms);
        }

        // Split long response into chunks for better display
        const maxChunkSize = 3800;
        const responseChunks = [];
        let remaining = response;
        
        while (remaining.length > 0) {
            let chunk = remaining.substring(0, maxChunkSize);
            const lastNewline = chunk.lastIndexOf('\n');
            if (lastNewline > maxChunkSize - 500 && lastNewline > 0) {
                chunk = chunk.substring(0, lastNewline);
            }
            responseChunks.push(chunk);
            remaining = remaining.substring(chunk.length);
        }
        
        // Create response ID
        const responseId = Math.random().toString(36).substring(2);
        
        // Create intro text with full question
        let introText = `╭───(    NJABULO AI    )───
├───≫ AI RESPONSE ≪───
├ 
├ 📝 *Your Question:*
├ ${query}
├ 
├ 💬 *AI Answer:*
├ ${responseChunks[0].substring(0, 300)}${responseChunks[0].length > 300 ? '...' : ''}
├ 
├ 📊 *Response Length:* ${response.length} chars
├ 📄 *Total Parts:* ${responseChunks.length}
╰──────────────────☉
> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝐍𝐉𝐀𝐁𝐔𝐋𝐎 𝐌𝐃`;

        // Create sections for each chunk
        const sections = [
            {
                "view_model": {
                    "primitive": {
                        "text": introText,
                        "__typename": "GenAIMarkdownTextUXPrimitive"
                    },
                    "__typename": "GenAISingleLayoutViewModel"
                }
            }
        ];
        
        // Add each response chunk as a separate section
        for (let i = 0; i < responseChunks.length; i++) {
            const chunkTitle = responseChunks.length > 1 ? `📝 *ANSWER PART ${i + 1}/${responseChunks.length}*` : `📝 *FULL ANSWER*`;
            sections.push({
                "view_model": {
                    "primitive": {
                        "language": "text",
                        "code_blocks": [
                            { 
                                "content": `${chunkTitle}\n\n${responseChunks[i]}`, 
                                "type": "DEFAULT" 
                            }
                        ],
                        "__typename": "GenAICodeUXPrimitive"
                    },
                    "__typename": "GenAISingleLayoutViewModel"
                }
            });
        }

        // Create encoded data
        const encodedData = Buffer.from(JSON.stringify({
            "response_id": responseId,
            "sections": sections
        })).toString('base64');

        // Create the message content
        const content = {
            messageContextInfo: {
                threadId: [],
                deviceListMetadata: {
                    senderKeyIndexes: [],
                    recipientKeyIndexes: []
                },
                deviceListMetadataVersion: 2,
                botMetadata: {
                    pluginMetadata: {},
                    richResponseSourcesMetadata: {
                        sources: []
                    }
                }
            },
            botForwardedMessage: {
                message: {
                    richResponseMessage: {
                        submessages: [
                            {
                                messageType: 2,
                                messageText: introText
                            },
                            ...responseChunks.map((chunk, index) => ({
                                messageType: 3,
                                codeMetadata: {
                                    codeLanguage: "text",
                                    codeBlocks: [
                                        {
                                            highlightType: 0,
                                            codeContent: `${responseChunks.length > 1 ? `📝 *ANSWER PART ${index + 1}/${responseChunks.length}*\n\n` : '📝 *FULL ANSWER*\n\n'}${chunk}`
                                        }
                                    ]
                                }
                            }))
                        ],
                        messageType: 1,
                        unifiedResponse: {
                            data: encodedData
                        },
                        
                    }
                }
            }
        };

        // Send the AI response
        await zk.relayMessage(chatId, content, {});
        
        // Send success reaction
        await zk.sendMessage(chatId, { react: { text: "✅", key: ms.key } });
        
    } catch (error) {
        console.error('AI Error:', error);
        clearInterval(interval);
        if (typingMsg && typingMsg.key) {
            await zk.sendMessage(chatId, { delete: typingMsg.key }).catch(() => {});
        }
        sendErrorMessage(zk, chatId, `❌ *Error*\n\n${error.message}\n\nPlease try again later.`, ms);
    }
});
