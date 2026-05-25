const { fana } = require("../njabulo/fana");
const axios = require("axios");
const config = require("../set");

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

    await zk.sendPresenceUpdate('composing', chatId);
    
    const loadingMsg = await zk.sendMessage(chatId, { text: `🧠 *NJABULO AI is thinking...*\n\n"${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"` }, { quoted: ms });

    try {
        const response = await askAI(query);
        
        if (!response || response.includes("unavailable")) {
            if (loadingMsg && loadingMsg.key) {
                await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
            }
            return sendErrorMessage(zk, chatId, `❌ *AI Service Unavailable*\n\nPlease try again later.`, ms);
        }

        // Create intro text
        const introText = `╭───(    NJABULO AI    )───
├───≫ AI RESPONSE ≪───
├ 
├ 📝 *Your Question:*
├ ${query.substring(0, 150)}${query.length > 150 ? '...' : ''}
├ 
├ 💬 *AI Answer:*
├ ${response.substring(0, 500)}${response.length > 500 ? '...' : ''}
├ 
├ 📊 *Response Length:* ${response.length} chars
╰──────────────────☉
> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝐍𝐉𝐀𝐁𝐔𝐋𝐎 𝐌𝐃`;

        // Create response ID
        const responseId = Math.random().toString(36).substring(2);
        
        // Create encoded data with AI response
        const encodedData = Buffer.from(JSON.stringify({
            "response_id": responseId,
            "sections": [
                {
                    "view_model": {
                        "primitive": {
                            "text": introText,
                            "__typename": "GenAIMarkdownTextUXPrimitive"
                        },
                        "__typename": "GenAISingleLayoutViewModel"
                    }
                },
                {
                    "view_model": {
                        "primitive": {
                            "language": "text",
                            "code_blocks": [
                                { 
                                    "content": `📝 *QUESTION:*\n${query}\n\n💬 *ANSWER:*\n${response}`, 
                                    "type": "DEFAULT" 
                                }
                            ],
                            "__typename": "GenAICodeUXPrimitive"
                        },
                        "__typename": "GenAISingleLayoutViewModel"
                    }
                }
            ]
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
                            {
                                messageType: 3,
                                codeMetadata: {
                                    codeLanguage: "text",
                                    codeBlocks: [
                                        {
                                            highlightType: 0,
                                            codeContent: `📝 *QUESTION:*\n${query}\n\n💬 *ANSWER:*\n${response}`
                                        }
                                    ]
                                }
                            }
                        ],
                        messageType: 1,
                        unifiedResponse: {
                            data: encodedData
                        },
                        contextInfo: {
                            mentionedJid: [],
                            groupMentions: [],
                            statusAttributions: [],
                            forwardingScore: 743,
                            isForwarded: true,
                            forwardedAiBotMessageInfo: {
                                botJid: "867051314767696@bot"
                            },
                            forwardOrigin: 4
                        }
                    }
                }
            }
        };

        if (loadingMsg && loadingMsg.key) {
            await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
        }

        // Send the AI response
        await zk.relayMessage(chatId, content, {});
        
        // Also send success reaction
        await zk.sendMessage(chatId, { react: { text: "✅", key: ms.key } });
        
    } catch (error) {
        console.error('AI Error:', error);
        if (loadingMsg && loadingMsg.key) {
            await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
        }
        sendErrorMessage(zk, chatId, `❌ *Error*\n\n${error.message}\n\nPlease try again later.`, ms);
    }
});
