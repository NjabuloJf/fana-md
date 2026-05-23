const { fana } = require("../njabulo/fana");
const config = require("../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const axios = require("axios");

// Helper function to get image buffer safely
async function getSafeImageBuffer(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return Buffer.from(response.data);
    } catch (error) {
        console.log("Image fetch failed, using fallback");
        return null;
    }
}

fana({
    nomCom: "pinn",
    alias: ["speed", "pong"],
    categorie: "General",
    reaction: "📌",
    use: ".ping",
}, async (dest, zk, commandeOptions) => {
    console.log('Ping command triggered!');
    const { repondre, ms } = commandeOptions;
    
    try {
        // Calculate ping
        const start = Date.now();
        await zk.sendPresenceUpdate('composing', dest);
        const pingTime = Date.now() - start;
        
        // Format uptime
        const uptimeSeconds = process.uptime();
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = Math.floor(uptimeSeconds % 60);
        const uptimeString = `${days > 0 ? days + "d " : ""}${hours > 0 ? hours + "h " : ""}${minutes > 0 ? minutes + "m " : ""}${seconds}s`;
        
        // Try to get image (won't crash if fails)
        let imageMessage = null;
        const imageUrl = "https://i.imgur.com/4M6Y6qT.png";
        const imageBuffer = await getSafeImageBuffer(imageUrl);
        
        if (imageBuffer) {
            const content = await generateWAMessageContent(
                { image: imageBuffer },
                { upload: zk.waUploadToServer }
            );
            imageMessage = content.imageMessage;
        }
        
        // Create message with buttons
        const message = generateWAMessageFromContent(dest, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: imageMessage ? {
                            title: "📊 PING SYSTEM",
                            hasMediaAttachment: true,
                            imageMessage: imageMessage
                        } : {
                            title: "📊 PING SYSTEM",
                            hasMediaAttachment: false
                        },
                        body: {
                            text: `🏓 *PONG!*\n\n📡 *Ping:* ${pingTime}ms\n⏱️ *Response:* ${(pingTime / 1000).toFixed(2)}s\n🕐 *Uptime:* ${uptimeString}\n🤖 *Bot:* Fana-MD\n✅ *Status:* Online`
                        },
                        footer: {
                            text: "Powered by Njabulo-Jb"
                        },
                        nativeFlowMessage: {
                            buttons: [
                                {
                                    name: "quick_reply",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "🏓 Ping Again",
                                        id: `${config.PREFIXE}ping`
                                    })
                                },
                                {
                                    name: "cta_url",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "🌐 WA Channel",
                                        url: config.GURL || "https://whatsapp.com/channel/0029Vaa8nZkK"
                                    })
                                }
                            ]
                        }
                    }
                }
            }
        });
        
        await zk.relayMessage(dest, message.message, { messageId: message.key.id });
        
    } catch (e) {
        console.error("Error in ping command:", e);
        // Fallback to simple text if carousel fails
        repondre(`🏓 *PONG!*\n\n📡 Ping: ${Date.now() - start}ms\n\n> Bot is online!`);
    }
}); 
