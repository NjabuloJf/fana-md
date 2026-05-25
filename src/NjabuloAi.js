const { fana } = require("../njabulo/fana");
const axios = require("axios");

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
            const response = await api(query);
            if (response && typeof response === 'string' && response.trim().length > 0) {
                return response.trim();
            }
        } catch (error) {
            continue;
        }
    }
    return null;
};

fana({
    nomCom: "fanaai",
    alias: ["njabuloaai", "naai", "njabulo-ai", "ai"],
    categorie: "AI",
    reaction: "🧠",
}, async (chatId, zk, commandeOptions) => {
    const { ms, repondre, arg } = commandeOptions;
    
    const query = arg.join(' ').trim();
    
    if (!query) {
        return repondre(`📌 *NJABULO AI*

🤖 *How to use:* .njabuloai <question>
📝 *Example:* .njabuloai What is AI?
💫 *Powered by NJABULO MD*`);
    }

    // Send typing indicator
    await zk.sendPresenceUpdate('composing', chatId);

    try {
        // Get AI response
        const response = await askAI(query);
        
        if (!response) {
            return repondre(`❌ *AI Service Unavailable*\n\nPlease try again later.`);
        }

        // ========== 1. FAST INTROTEXT ==========
        const fastIntroText = `╭───(    NJABULO AI    )───
├ 📝 *Q:* ${query.length > 40 ? query.substring(0, 40) + '...' : query}
├ 📊 *Length:* ${response.length} chars
├ 💬 *Preview:* ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}
╰──────────────────☉
> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝐍𝐉𝐀𝐁𝐔𝐋𝐎 𝐌𝐃`;

        // ========== 2. INTROTEXT1 (About NJABULO) ==========
        const introText1 = `╭───(    🤖 NJABULO AI INFO    )───
├ 🤖 *Bot:* NJABULO MD
├ 👨‍💻 *Owner:* Njabulo JB
├ 📱 *Contact:* wa.me/26777821911
├ 
├ 🌟 *What is NJABULO AI?*
├ Advanced AI assistant for WhatsApp
├ 
├ 🧠 *Features:*
├ • Smart AI responses
├ • Multiple API fallback
├ • 24/7 availability
├ 
├ 💡 *Capabilities:*
├ • Answer questions
├ • Help with coding
├ • Natural conversation
├ 
├ 📌 *Commands:*
├ .njabuloai <question>
├ .ai <question>
├ 
├ 💫 *NJABULO MD*
╰──────────────────☉
> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝐍𝐉𝐀𝐁𝐔𝐋𝐎 𝐌𝐃`;

        // Send fast introText first (immediate response)
        await zk.sendMessage(chatId, { text: fastIntroText }, { quoted: ms });

        // ========== 3. CREATE RESPONSE ID ==========
        const responseId = Math.random().toString(36).substring(2);
        
        // ========== 4. CREATE ENCODED DATA WITH BOTH INTROTEXT AND INTROTEXT1 ==========
        const encodedData = Buffer.from(JSON.stringify({
            "response_id": responseId,
            "sections": [
                {
                    "view_model": {
                        "primitive": {
                            "text": fastIntroText,
                            "__typename": "GenAIMarkdownTextUXPrimitive"
                        },
                        "__typename": "GenAISingleLayoutViewModel"
                    }
                },
                {
                    "view_model": {
                        "primitive": {
                            "text": introText1,
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

        // ========== 5. CREATE THE MESSAGE CONTENT ==========
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
                                messageText: fastIntroText
                            },
                            {
                                messageType: 2,
                                messageText: introText1
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

        // ========== 6. SEND ENCODED MESSAGE ==========
        try {
            await zk.relayMessage(chatId, content, {});
            console.log(`✅ AI Response sent with encodedData - ID: ${responseId}`);
            console.log(`📦 Encoded Data includes: fastIntroText + introText1 + Answer`);
        } catch (relayError) {
            console.log("Relay error, sending as fallback:", relayError.message);
            
            // Fallback: Send introText1 and response in code blocks
            await zk.sendMessage(chatId, { text: introText1 }, { quoted: ms });
            
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
            
            for (let i = 0; i < responseChunks.length; i++) {
                const title = responseChunks.length > 1 ? `📝 *Part ${i + 1}/${responseChunks.length}*` : `📝 *Answer*`;
                await zk.sendMessage(chatId, { 
                    text: `\`\`\`\n${title}\n\n${responseChunks[i]}\n\`\`\`` 
                }, { quoted: ms });
            }
        }
        
        // Send success reaction
        await zk.sendMessage(chatId, { react: { text: "✅", key: ms.key } });
        
    } catch (error) {
        console.error('AI Error:', error);
        repondre(`❌ *Error*\n\n${error.message}\n\nPlease try again later.`);
    }
});










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
    const typingMsg = await zk.sendMessage(chatId, { text: `🧠 *ɴᴊᴀʙᴜʟᴏ ᴀɪ ᴛʜɪɴᴋɪɴɢ* ${frames[0]}` }, { quoted: ms });
    
    const interval = setInterval(async () => {
        i = (i + 1) % frames.length;
        try {
            await zk.sendMessage(chatId, { text: `🧠 *ɴᴊᴀʙᴜʟᴏ ᴀɪ ᴛʜɪɴᴋɪɴɢ* ${frames[i]}`, edit: typingMsg.key });
        } catch (e) {}
    }, 500);
    
    return { typingMsg, interval };
}

fana({
    nomCom: "njabuloai",
    alias: ["njabuloaai", "naai", "njabulo-ai", "ai"],
    categorie: "AI",
    reaction: "🧠",
}, async (chatId, zk, commandeOptions) => {
    const { ms, repondre, arg } = commandeOptions;
    
    const query = arg.join(' ').trim();
    
    if (!query) {
        return repondre(`📌 *NJABULO AI*

🤖 *How to use:*
• Ask me anything!
• Get intelligent responses
• Chat and learn

📝 *Example:* 
.njabuloai What is artificial intelligence?

💫 *Powered by NJABULO MD*`);
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
            return repondre(`❌ *AI Service Unavailable*\n\nPlease try again later.`);
        }

        // Split long response for better display
        const maxPreviewLength = 500;
        const responsePreview = response.length > maxPreviewLength ? response.substring(0, maxPreviewLength) + '...' : response;
        
        // Create intro text
        const introText = `*AI Answer Preview:*
${responsePreview}
> ɴᴊᴀʙᴜʟᴏ ᴀɪ ᴀssɪsᴛᴀɴᴛ ᴜɪ`;

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
                                    "content": `📝 ɴᴊᴀʙᴜʟᴏ ᴀɪ ǫᴜᴇsᴛɪᴏɴ:\n${query}\n\n💬 ᴀɴsᴡᴇʀ\n${response}`, 
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
                                            codeContent: `📝 ɴᴊᴀʙᴜʟᴏ ᴀɪ ᴀssɪsᴛᴀɴᴛ ᴜɪ ǫᴜᴇsᴛɪᴏɴ:\n${query}\n\n💬 ᴀɴsᴡᴇʀ:\n${response}`
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

        // Send the AI response
        try {
            await zk.relayMessage(chatId, content, {});
            console.log(`✅ AI response sent with encodedData - Response ID: ${responseId}`);
        } catch (relayError) {
            console.error("Relay error, falling back to simple text:", relayError.message);
            // Fallback to simple text if relay fails
            await repondre(introText);
            await repondre(`📝 *FULL ANSWER:*\n\n${response}`);
        }
        
        // Send success reaction
        await zk.sendMessage(chatId, { react: { text: "✅", key: ms.key } });
        
    } catch (error) {
        console.error('AI Error:', error);
        clearInterval(interval);
        if (typingMsg && typingMsg.key) {
            await zk.sendMessage(chatId, { delete: typingMsg.key }).catch(() => {});
        }
        repondre(`❌ *Error*\n\n${error.message}\n\nPlease try again later.`);
    }
});

                    
