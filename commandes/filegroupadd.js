const { fana } = require("../njabulo/fana");
const { delay, generateWAMessageContent, generateWAMessageFromContent } = require("@whiskeysockets/baileys");
const config = require("../set");

// ========== GOOGLE TRANSLATE API ==========
let translateText = async (text, targetLang) => {
    try {
        if (!targetLang || targetLang === 'en' || typeof targetLang !== 'string') {
            return text;
        }
        targetLang = targetLang.toString().toLowerCase().trim();
        if (targetLang.length > 5 || targetLang.length < 2) {
            return text;
        }
        if (!text) return text;
        
        try {
            const { translate } = require('@vitalets/google-translate-api');
            const result = await translate(text, { to: targetLang });
            return result.text;
        } catch (e) {
            console.log('⚠️ Google Translate failed, using fallback...');
            try {
                const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`, {
                    timeout: 5000
                });
                if (response.data && response.data.responseData) {
                    return response.data.responseData.translatedText || text;
                }
                return text;
            } catch (fallbackError) {
                console.error('⚠️ Fallback translation failed:', fallbackError.message);
                return text;
            }
        }
    } catch (error) {
        console.error('⚠️ Translation error:', error.message);
        return text;
    }
};

// ========== TRANSLATION CACHE ==========
const translationCache = new Map();

let translateTextWithCache = async (text, targetLang) => {
    if (!targetLang || targetLang === 'en' || typeof targetLang !== 'string') return text;
    targetLang = targetLang.toString().toLowerCase().trim();
    if (targetLang.length > 5 || targetLang.length < 2) return text;
    if (!text) return text;
    
    const cacheKey = `${text}_${targetLang}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }
    
    try {
        const result = await translateText(text, targetLang);
        translationCache.set(cacheKey, result);
        setTimeout(() => translationCache.delete(cacheKey), 3600000);
        return result;
    } catch (error) {
        console.error('⚠️ Translation error:', error.message);
        return text;
    }
};

// ========== TRANSLATED TEXTS ==========
async function getTranslatedTexts() {
    const lang = config.LANGUAGE || "en";
    return {
        waChannel: await translateTextWithCache("bot Channel", lang),
        addTitle: await translateTextWithCache("➕ ADD MEMBERS", lang),
        addDesc: await translateTextWithCache("Add up to 30 members to this group at once.", lang),
        howToUse: await translateTextWithCache("📌 HOW TO USE", lang),
        usage: await translateTextWithCache("Usage:", lang),
        example: await translateTextWithCache("Example:", lang),
        maxNote: await translateTextWithCache("Maximum: 30 numbers at once", lang),
        poweredBy: await translateTextWithCache("Powered by NJABULO JB", lang),
        addNow: await translateTextWithCache("➕ Add Now", lang),
        inviteLink: await translateTextWithCache("📎 Invite Link", lang),
        instructions: await translateTextWithCache("📋 Instructions", lang),
        needHelp: await translateTextWithCache("Need help? Contact the owner.", lang),
        groupOnly: await translateTextWithCache("❌ This command only works in groups!", lang),
        adminOnly: await translateTextWithCache("❌ You need to be admin to use this command!", lang),
        noNumbers: await translateTextWithCache("❌ No valid numbers found!", lang),
        adding: await translateTextWithCache("⏳ Adding", lang),
        participants: await translateTextWithCache("participant(s)...", lang),
        pleaseWait: await translateTextWithCache("Please wait, this may take a few moments", lang),
        progress: await translateTextWithCache("📊 Progress:", lang),
        added: await translateTextWithCache("✅ Added:", lang),
        failed: await translateTextWithCache("❌ Failed:", lang),
        alreadyIn: await translateTextWithCache("👥 Already in:", lang),
        rateLimit: await translateTextWithCache("⏳ Rate limit detected, waiting 10 seconds...", lang),
        addResults: await translateTextWithCache("ADD RESULTS", lang),
        group: await translateTextWithCache("Group:", lang),
        requested: await translateTextWithCache("Requested:", lang),
        errorAdding: await translateTextWithCache("❌ Error adding participants!", lang),
        useInviteLink: await translateTextWithCache("Use .invitelink for those who failed.", lang),
        chooseOption: await translateTextWithCache("Reply with number 1, 2, or 3 to choose:", lang),
        invalidChoice: await translateTextWithCache("❌ Invalid choice! Please reply with 1, 2, or 3.", lang),
        timeoutMsg: await translateTextWithCache("⏰ Timeout! Please try again.", lang),
    };
}

// ========== RANDOM IMAGE ==========
const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ========== CREATE 3 CARDS ==========
async function createAddCards(zk, ms, lang) {
    const t = await getTranslatedTexts();
    
    let imageMessage = null;
    try {
        imageMessage = (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage;
    } catch (e) {
        console.log('⚠️ Could not load image');
        imageMessage = (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage;
    }

    // Card 1: Add Members
    const card1 = {
        header: {
            title: `➕ ${t.addTitle}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `${t.addDesc}\n\n` +
                  `${t.howToUse}\n` +
                  `━━━━━━━━━━━━\n` +
                  `📌 ${t.usage}\n` +
                  `.add 267XXXXXX,2547XXXXXX\n\n` +
                  `📌 ${t.example}\n` +
                  `.add 26712345678,26798765432\n\n` +
                  `📌 ${t.maxNote}\n\n` +
                  `${t.chooseOption}`,
        },
        footer: {
            text: ` `,
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: t.waChannel,
                        url: config.GURL
                    }),
                },
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Example",
                        copy_code: ".add 254712345678,254798765432",
                    }),
                },
            ],
        },
    };

    // Card 2: Quick Add
    const card2 = {
        header: {
            title: `➕ ${t.addTitle}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `📌 *Quick Add*\n\n` +
                  ` Add up to 30 members\n` +
                  ` Auto-detect valid numbers\n` +
                  ` Shows progress in real-time\n` +
                  ` Detailed results report\n\n` +
                  `${t.chooseOption}`,
        },
        footer: {
            text: ` `,
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Copy Format",
                        copy_code: ".add 2547XXXXXX,2547XXXXXX,2547XXXXXX",
                    }),
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: t.waChannel,
                        url: config.GURL
                    }),
                },
            ],
        },
    };

    // Card 3: Instructions
    const card3 = {
        header: {
            title: `📋 ${t.instructions}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `📌 *${t.instructions}*\n\n` +
                  `1️⃣ ${t.addNow}\n` +
                  `   ${t.usage}: .add 2547XXXXXX\n\n` +
                  `2️⃣ ${t.inviteLink}\n` +
                  `   Use .invitelink for failed\n\n` +
                  `3️⃣ ${t.needHelp}\n\n` +
                  `${t.chooseOption}`,
        },
        footer: {
            text: ` `,
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: t.waChannel,
                        url: config.GURL
                    }),
                },
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Copy Help",
                        copy_code: `ADD COMMAND HELP:\n.add 267XXXXXX,267XXXXXX\nMax 30 numbers`,
                    }),
                },
            ],
        },
    };

    return { cards: [card1, card2, card3] };
}

// ========== SEND CAROUSEL ==========
async function sendCarouselMessage(zk, dest, cards, ms) {
    const t = await getTranslatedTexts();
    const message = generateWAMessageFromContent(
        dest,
        {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2,
                    },
                    interactiveMessage: {
                        body: { text: `➕ *Add Members System*` },
                        footer: { text: `🔹 ${t.poweredBy}` },
                        carouselMessage: { cards },
                    },
                },
            },
        },
        { quoted: ms }
    );

    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
    return message;
}

// ========== STORE FOR ACTIVE REQUESTS ==========
const activeRequests = {};

// ========== IS NUMBER SELECTION ==========
const isNumberSelection = (text) => {
    const num = parseInt(text);
    return num >= 1 && num <= 3 && !isNaN(num);
};

fana({
  nomCom: "add",
  aliases: ["addmember", "addparticipant", "invite"],
  reaction: "➕",
  categorie: "Group"
}, async (origineMessage, zk, commandeOptions) => {
  const { repondre, arg, verifGroupe, superUser, verifAdmin, ms } = commandeOptions;
  const lang = config.LANGUAGE || "en";
  const t = await getTranslatedTexts();

  try {
    // Check if it's a group
    if (!verifGroupe) {
      return repondre(t.groupOnly);
    }

    // Check if user is admin or superuser
    if (!verifAdmin && !superUser) {
      return repondre(t.adminOnly);
    }

    // ========== CHECK FOR NUMBER SELECTION REPLY ==========
    const replyText = arg ? arg.join(' ') : '';
    if (replyText && isNumberSelection(replyText)) {
        const selectedNumber = parseInt(replyText);
        const senderJid = ms.key.remoteJid;
        
        if (!activeRequests[senderJid]) {
            await repondre(t.invalidChoice);
            return;
        }

        const data = activeRequests[senderJid];
        delete activeRequests[senderJid];

        if (zk._replyListener) {
            zk.ev.off('messages.upsert', zk._replyListener);
            zk._replyListener = null;
        }

        try {
            await zk.sendMessage(origineMessage, {
                react: { text: "📥", key: ms.key }
            });
        } catch (e) {}

        switch(selectedNumber) {
            case 1:
                // Option 1: Show add format
                await repondre(`📌 *${t.howToUse}*\n\n` +
                    `${t.usage}: .add 2547XXXXXX,2547XXXXXX\n\n` +
                    `${t.example}: .add 267712345678,267798765432\n\n` +
                    `${t.maxNote}\n\n` +
                    `${t.poweredBy}`);
                break;
            case 2:
                // Option 2: Quick add - ask for numbers
                await repondre(`📌 *${t.addNow}*\n\n` +
                    `${t.usage}: .add 2547XXXXXX,2547XXXXXX\n\n` +
                    `${t.example}: .add 26712345678,26798765432\n\n` +
                    `${t.maxNote}\n\n` +
                    `${t.poweredBy}`);
                break;
            case 3:
                // Option 3: Show instructions
                await repondre(`📋 *${t.instructions}*\n\n` +
                    `1️⃣ ${t.addNow}\n` +
                    `   ${t.usage}: .add 2547XXXXXX\n\n` +
                    `2️⃣ ${t.inviteLink}\n` +
                    `   Use .invitelink for failed\n\n` +
                    `3️⃣ ${t.needHelp}\n\n` +
                    `${t.poweredBy}`);
                break;
            default:
                await repondre(t.invalidChoice);
                return;
        }
        return;
    }

    // ========== IF NO NUMBERS, SHOW 3 CARDS ==========
    if (arg.length === 0) {
        const { cards } = await createAddCards(zk, ms, lang);
        await sendCarouselMessage(zk, origineMessage, cards, ms);

        // Store for reply handling
        const senderJid = ms.key.remoteJid;
        activeRequests[senderJid] = {
            timestamp: Date.now()
        };

        // Setup reply collector
        if (zk._replyListener) {
            zk.ev.off('messages.upsert', zk._replyListener);
        }

        zk._replyListener = async (update) => {
            try {
                const msg = update.messages[0];
                if (!msg || !msg.message) return;
                
                const sender = msg.key.remoteJid;
                const content = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                
                if (!activeRequests[sender]) return;
                if (!isNumberSelection(content)) return;
                
                const selectedNumber = parseInt(content);
                const data = activeRequests[sender];
                
                delete activeRequests[sender];
                zk.ev.off('messages.upsert', zk._replyListener);
                zk._replyListener = null;

                try {
                    await zk.sendMessage(origineMessage, {
                        react: { text: "📥", key: msg.key }
                    });
                } catch (e) {}

                switch(selectedNumber) {
                    case 1:
                        await repondre(`📌 *${t.howToUse}*\n\n` +
                            `${t.usage}: .add 2547XXXXXX,2547XXXXXX\n\n` +
                            `${t.example}: .add 254712345678,254798765432\n\n` +
                            `${t.maxNote}\n\n` +
                            `${t.poweredBy}`);
                        break;
                    case 2:
                        await repondre(`📌 *${t.addNow}*\n\n` +
                            `${t.usage}: .add 267XXXXXX,2266XXXXXX\n\n` +
                            `${t.example}: .add 2677XXXXXX,267XXXXXX\n\n` +
                            `${t.maxNote}\n\n` +
                            `${t.poweredBy}`);
                        break;
                    case 3:
                        await repondre(`📋 *${t.instructions}*\n\n` +
                            `1️⃣ ${t.addNow}\n` +
                            `   ${t.usage}: .add 2547XXXXXX\n\n` +
                            `2️⃣ ${t.inviteLink}\n` +
                            `   Use .invitelink for failed\n\n` +
                            `3️⃣ ${t.needHelp}\n\n` +
                            `${t.poweredBy}`);
                        break;
                    default:
                        await repondre(t.invalidChoice);
                        return;
                }
            } catch (err) {
                console.error('[REPLY HANDLER ERROR]', err);
            }
        };

        zk.ev.on('messages.upsert', zk._replyListener);

        setTimeout(async () => {
            const senderJid = ms.key.remoteJid;
            if (activeRequests[senderJid]) {
                delete activeRequests[senderJid];
            }
            if (zk._replyListener) {
                zk.ev.off('messages.upsert', zk._replyListener);
                zk._replyListener = null;
            }
        }, 60000);

        return;
    }

    // ========== ADD MEMBERS LOGIC ==========
    // Parse numbers (support comma separated)
    let numbers = [];
    if (arg.join(' ').includes(',')) {
      numbers = arg.join(' ').split(',').map(n => n.trim());
    } else {
      numbers = arg;
    }

    // Clean numbers (remove non-numeric) and limit to 30
    numbers = numbers
      .map(n => n.replace(/[^0-9]/g, ''))
      .filter(n => n.length >= 10 && n.length <= 15)
      .slice(0, 30);

    if (numbers.length === 0) {
      return repondre(t.noNumbers);
    }

    // Send initial message
    await repondre(`⏳ ${t.adding} ${numbers.length} ${t.participants}\n\n_${t.pleaseWait}_\n`);

    // Get group metadata
    const groupMetadata = await zk.groupMetadata(origineMessage);
    const groupName = groupMetadata.subject;
    
    // Results tracking
    let success = [];
    let failed = [];
    let alreadyInGroup = [];

    // Add participants one by one with delay
    for (let i = 0; i < numbers.length; i++) {
      const number = numbers[i];
      const jid = number + '@s.whatsapp.net';

      try {
        // Check if already in group
        const isAlreadyInGroup = groupMetadata.participants.some(p => p.id === jid);
        
        if (isAlreadyInGroup) {
          alreadyInGroup.push(number);
          continue;
        }

        // Try to add participant
        await zk.groupParticipantsUpdate(origineMessage, [jid], "add");
        success.push(number);
        
        // Update progress every 5 adds
        if ((i + 1) % 5 === 0 || i === numbers.length - 1) {
          await repondre(`📊 ${t.progress} ${i + 1}/${numbers.length}\n` +
            `${t.added} ${success.length}\n` +
            `${t.failed} ${failed.length}\n` +
            `${t.alreadyIn} ${alreadyInGroup.length}\n\n` +
            `${t.poweredBy}`);
        }

        // Delay to avoid rate limiting
        await delay(2000);

      } catch (error) {
        console.log(`Failed to add ${number}:`, error.message);
        
        if (error.message?.includes('rate-overlimit')) {
          await repondre(`${t.rateLimit}\n\n${t.poweredBy}`);
          await delay(10000);
        } else if (error.message?.includes('not-authorized')) {
          failed.push(`${number} (bot not authorized)`);
        } else if (error.message?.includes('group-full')) {
          failed.push(`${number} (group full)`);
        } else if (error.message?.includes('privacy')) {
          failed.push(`${number} (privacy settings)`);
        } else {
          failed.push(number);
        }
      }
    }

    // Final report
    let report = `「 *${t.addResults}* 」\n`;
    report += `\n`;
    report += `👥 ${t.group} ${groupName}\n`;
    report += `📊 ${t.requested} ${numbers.length}\n`;
    report += `\n`;
    report += `✅ ${t.added} ${success.length}\n`;
    
    if (success.length > 0) {
      report += `    ${success.slice(0, 5).map(n => `@${n}`).join(', ')}${success.length > 5 ? ` +${success.length - 5} more` : ''}\n`;
    }
    
    report += `\n`;
    report += `👥 ${t.alreadyIn} ${alreadyInGroup.length}\n`;
    
    if (alreadyInGroup.length > 0) {
      report += `    ${alreadyInGroup.slice(0, 5).map(n => `@${n}`).join(', ')}${alreadyInGroup.length > 5 ? ` +${alreadyInGroup.length - 5} more` : ''}\n`;
    }
    
    report += `\n`;
    report += ` ❌ ${t.failed} ${failed.length}\n`;
    
    if (failed.length > 0) {
      report += `   ${failed.slice(0, 5).join(', ')}${failed.length > 5 ? ` +${failed.length - 5} more` : ''}\n`;
    }
    
    report += `\n`;
    report += `\n\n`;
    report += `${t.useInviteLink}\n`;
    

    // Create mentions array
    const mentions = success.slice(0, 10).map(n => n + '@s.whatsapp.net');

    const buttons = [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: t.waChannel,
                url: config.GURL
            }),
        },
        {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy Report",
                copy_code: report,
            }),
        },
    ];

    await zk.sendMessage(origineMessage, {
        interactiveMessage: {
            image: { url: randomNjabulourl },
            header: report,
            buttons: buttons,
            headerType: 1,
            mentions: mentions
        }
    }, { quoted: ms });

  } catch (error) {
    console.error("Add command error:", error);
    repondre(`${t.errorAdding}\n\n${t.poweredBy}`);
  }
});
