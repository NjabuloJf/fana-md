const { fana } = require("../njabulo/fana");
const axios = require("axios");
const { writeFile } = require("fs/promises");
const config = require("../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// ── Random image for the header ──────────────────────────────
const njabulox = [
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Helper: send error messages ──────────────────────────────
async function sendError(zk, chatId, text, ms) {
  await zk.sendMessage(
    chatId,
    {
      image: { url: randomNjabulourl },
      caption: `⚠️ *Error*\n\n${text}`,
      contextInfo: {
        mentionedJid: [ms?.sender?.jid || ""],
      },
    },
    { quoted: ms }
  );
}

// ── Helper: Get waifu.im images ──────────────────────────────
async function getWaifuImages(tags = [], isNsfw = false, type = "sfw") {
  try {
    const params = new URLSearchParams();
    
    // Add tags if provided
    if (tags.length > 0) {
      tags.forEach(tag => params.append('tags[]', tag));
    }
    
    // Add type (sfw or nsfw)
    params.append('type', type);
    
    // Add is_nsfw flag
    params.append('is_nsfw', isNsfw ? 'true' : 'false');
    
    // Add selected tags for better results
    if (tags.length === 0) {
      // Default tags for sfw
      const defaultTags = isNsfw ? ['ecchi', 'maid', 'school'] : ['waifu', 'maid', 'cute'];
      defaultTags.forEach(tag => params.append('tags[]', tag));
    }
    
    const url = `https://api.waifu.im/search?${params.toString()}`;
    console.log('🔍 Fetching from:', url);
    
    const { data } = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!data.images || data.images.length === 0) {
      throw new Error('No images found');
    }
    
    return data.images;
  } catch (error) {
    console.error('❌ Waifu.im API error:', error.message);
    throw error;
  }
}

// ── Main waifu command ──────────────────────────────────────────
fana(
  {
    nomCom: "waifu",
    aliases: ["anime", "waifuim", "animegirl"],
    categorie: "Weeb",
    reaction: "😏",
  },
  async (chatId, zk, context) => {
    const { ms, arg, repondre } = context;
    
    try {
      // Parse arguments for tags
      let tags = [];
      let isNsfw = false;
      let type = "sfw";
      
      if (arg && arg.length > 0) {
        const args = arg.join(' ').toLowerCase().split(' ');
        
        // Check for nsfw flag
        if (args.includes('nsfw')) {
          isNsfw = true;
          type = "nsfw";
          args.splice(args.indexOf('nsfw'), 1);
        }
        
        // Check for specific tags
        const validTags = ['waifu', 'maid', 'cute', 'smile', 'blush', 'happy', 'sad', 'angry', 
                          'ecchi', 'school', 'uniform', 'kimono', 'swimsuit', 'neko', 'cat'];
        
        tags = args.filter(tag => validTags.includes(tag));
      }
      
      // If no tags specified, use default
      if (tags.length === 0 && !isNsfw) {
        tags = ['waifu'];
      } else if (tags.length === 0 && isNsfw) {
        tags = ['ecchi'];
      }
      
      // Get images from waifu.im
      const images = await getWaifuImages(tags, isNsfw, type);
      
      // Create carousel cards for each image (limit to 3)
      const maxCards = Math.min(images.length, 3);
      const cards = [];
      
      for (let i = 0; i < maxCards; i++) {
        const img = images[i];
        const imageUrl = img.url;
        const tagsList = img.tags.map(t => t.name).join(', ');
        const signature = img.signature || 'waifu.im';
        
        cards.push({
          header: {
            title: `✨ ${tagsList || 'Waifu'}`,
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent(
              { image: { url: imageUrl } }, 
              { upload: zk.waUploadToServer }
            )).imageMessage,
          },
          body: {
            text: `📸 *${tagsList || 'Anime Girl'}*\n\n` +
                  `🔹 Width: ${img.width}px\n` +
                  `🔹 Height: ${img.height}px\n` +
                  `🔹 Source: ${signature}\n` +
                  `🔹 Type: ${img.type || 'SFW'}`,
          },
          footer: {
            text: `🔹 Powered by NJABULO JB`,
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copy URL",
                  copy_code: imageUrl,
                }),
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "🌐 View Original",
                  url: imageUrl,
                }),
              },
            ],
          },
        });
      }

      const message = generateWAMessageFromContent(
        chatId,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: {
                body: {
                  text: `🌸 ${tags.length > 0 ? tags.join(', ') : 'Waifu'} Images`,
                },
                footer: {
                  text: `🔹 ${cards.length} image(s) found | Powered by NJABULO JB`,
                },
                carouselMessage: {
                  cards,
                },
              },
            },
          },
        },
        { quoted: ms }
      );

      await zk.relayMessage(chatId, message.message, { messageId: message.key.id });
      
    } catch (error) {
      console.error('❌ Waifu command error:', error);
      
      let errorMsg = `❌ *Error fetching waifu images*\n\n`;
      if (error.response) {
        errorMsg += `Status: ${error.response.status}\n`;
        errorMsg += `Message: ${error.response.data?.message || error.message}`;
      } else {
        errorMsg += `Message: ${error.message}`;
      }
      errorMsg += `\n\n🔹 Powered by NJABULO JB`;
      
      await sendError(zk, chatId, errorMsg, ms);
    }
  }
);

// ── Neko command (using waifu.im) ─────────────────────────────
fana(
  {
    nomCom: "neko",
    aliases: ["catgirl", "nekogirl"],
    categorie: "Weeb",
    reaction: "😺",
  },
  async (chatId, zk, context) => {
    const { ms, arg, repondre } = context;
    
    try {
      const tags = ['neko', 'cat'];
      const images = await getWaifuImages(tags, false, 'sfw');
      
      const maxCards = Math.min(images.length, 3);
      const cards = [];
      
      for (let i = 0; i < maxCards; i++) {
        const img = images[i];
        const imageUrl = img.url;
        
        cards.push({
          header: {
            title: '🐱 Neko Girl',
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent(
              { image: { url: imageUrl } }, 
              { upload: zk.waUploadToServer }
            )).imageMessage,
          },
          body: {
            text: `📸 *Neko Girl*\n\n` +
                  `🔹 Width: ${img.width}px\n` +
                  `🔹 Height: ${img.height}px`,
          },
          footer: {
            text: `🔹 Powered by NJABULO JB`,
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copy URL",
                  copy_code: imageUrl,
                }),
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "🌐 View Original",
                  url: imageUrl,
                }),
              },
            ],
          },
        });
      }

      const message = generateWAMessageFromContent(
        chatId,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: {
                body: {
                  text: '🐱 Neko Images',
                },
                footer: {
                  text: `🔹 ${cards.length} image(s) found | Powered by NJABULO JB`,
                },
                carouselMessage: {
                  cards,
                },
              },
            },
          },
        },
        { quoted: ms }
      );

      await zk.relayMessage(chatId, message.message, { messageId: message.key.id });
      
    } catch (error) {
      console.error('❌ Neko command error:', error);
      await sendError(zk, chatId, `Error: ${error.message}`, ms);
    }
  }
);

// ── Shinobu command ─────────────────────────────────────────────
fana(
  {
    nomCom: "shinobu",
    aliases: ["shinobuimage", "monogatari"],
    categorie: "Weeb",
    reaction: "🦋",
  },
  async (chatId, zk, context) => {
    const { ms, arg, repondre } = context;
    
    try {
      const tags = ['shinobu', 'monogatari', 'cute'];
      const images = await getWaifuImages(tags, false, 'sfw');
      
      const maxCards = Math.min(images.length, 3);
      const cards = [];
      
      for (let i = 0; i < maxCards; i++) {
        const img = images[i];
        const imageUrl = img.url;
        
        cards.push({
          header: {
            title: '🦋 Shinobu',
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent(
              { image: { url: imageUrl } }, 
              { upload: zk.waUploadToServer }
            )).imageMessage,
          },
          body: {
            text: `📸 *Shinobu Image*\n\n` +
                  `🔹 Width: ${img.width}px\n` +
                  `🔹 Height: ${img.height}px`,
          },
          footer: {
            text: `🔹 Powered by NJABULO JB`,
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copy URL",
                  copy_code: imageUrl,
                }),
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "🌐 View Original",
                  url: imageUrl,
                }),
              },
            ],
          },
        });
      }

      const message = generateWAMessageFromContent(
        chatId,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: {
                body: {
                  text: '🦋 Shinobu Images',
                },
                footer: {
                  text: `🔹 ${cards.length} image(s) found | Powered by NJABULO JB`,
                },
                carouselMessage: {
                  cards,
                },
              },
            },
          },
        },
        { quoted: ms }
      );

      await zk.relayMessage(chatId, message.message, { messageId: message.key.id });
      
    } catch (error) {
      console.error('❌ Shinobu command error:', error);
      await sendError(zk, chatId, `Error: ${error.message}`, ms);
    }
  }
);

// ── Megumin command ─────────────────────────────────────────────
fana(
  {
    nomCom: "megumin",
    aliases: ["explosion", "meguminimage"],
    categorie: "Weeb",
    reaction: "💥",
  },
  async (chatId, zk, context) => {
    const { ms, arg, repondre } = context;
    
    try {
      const tags = ['megumin', 'explosion', 'konosuba'];
      const images = await getWaifuImages(tags, false, 'sfw');
      
      const maxCards = Math.min(images.length, 3);
      const cards = [];
      
      for (let i = 0; i < maxCards; i++) {
        const img = images[i];
        const imageUrl = img.url;
        
        cards.push({
          header: {
            title: '💥 Megumin',
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent(
              { image: { url: imageUrl } }, 
              { upload: zk.waUploadToServer }
            )).imageMessage,
          },
          body: {
            text: `📸 *Megumin Image*\n\n` +
                  `🔹 Width: ${img.width}px\n` +
                  `🔹 Height: ${img.height}px`,
          },
          footer: {
            text: `🔹 Powered by NJABULO JB`,
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copy URL",
                  copy_code: imageUrl,
                }),
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "🌐 View Original",
                  url: imageUrl,
                }),
              },
            ],
          },
        });
      }

      const message = generateWAMessageFromContent(
        chatId,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              interactiveMessage: {
                body: {
                  text: '💥 Megumin Images',
                },
                footer: {
                  text: `🔹 ${cards.length} image(s) found | Powered by NJABULO JB`,
                },
                carouselMessage: {
                  cards,
                },
              },
            },
          },
        },
        { quoted: ms }
      );

      await zk.relayMessage(chatId, message.message, { messageId: message.key.id });
      
    } catch (error) {
      console.error('❌ Megumin command error:', error);
      await sendError(zk, chatId, `Error: ${error.message}`, ms);
    }
  }
);

// ── Waifu command with tags (advanced) ──────────────────────
fana(
  {
    nomCom: "anime",
    aliases: ["animeimg", "animeimage"],
    categorie: "Weeb",
    reaction: "🎨",
  },
  async (chatId, zk, context) => {
    const { ms, arg, repondre } = context;
    
    try {
      // Parse tags from arguments
      let tags = [];
      let isNsfw = false;
      
      if (arg && arg.length > 0) {
        const args = arg.join(' ').toLowerCase().split(' ');
        
        if (args.includes('nsfw')) {
          isNsfw = true;
          args.splice(args.indexOf('nsfw'), 1);
        }
        
        tags = args;
      }
      
      // If no tags, use random
      if (tags.length === 0) {
        const defaultTags = isNsfw ? ['ecchi'] : ['waifu'];
        tags = defaultTags;
      }
      
      const images = await getWaifuImages(tags, isNsfw, isNsfw ? 'nsfw' : 'sfw');
      
      // Send first image directly
      const img = images[0];
      const imageUrl = img.url;
      
      const buttons = [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Copy URL",
            copy_code: imageUrl,
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "🌐 View Original",
            url: imageUrl,
          }),
        },
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Tags",
            copy_code: img.tags.map(t => t.name).join(', '),
          }),
        },
      ];
      
      await zk.sendMessage(
        chatId,
        {
          image: { url: imageUrl },
          caption: `🎨 *${tags.join(', ').toUpperCase()}*\n\n` +
                   `📏 ${img.width}x${img.height}\n` +
                   `🏷️ ${img.tags.map(t => t.name).join(', ')}\n` +
                   `📝 ${img.signature || 'waifu.im'}\n\n` +
                   `🔹 Powered by NJABULO JB`,
          buttons: buttons,
          headerType: 1,
          contextInfo: {
            mentionedJid: [ms?.sender?.jid || ""],
          },
        },
        { quoted: ms }
      );
      
    } catch (error) {
      console.error('❌ Anime command error:', error);
      await sendError(zk, chatId, `Error: ${error.message}`, ms);
    }
  }
);
