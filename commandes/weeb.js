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

// ── Helper: Get waifu.im images with proper headers ──────────
async function getWaifuImages(tags = [], isNsfw = false, type = "sfw") {
  try {
    // Use the working endpoint with proper parameters
    let url = `https://api.waifu.im/search`;
    const params = new URLSearchParams();
    
    // Add tags
    if (tags.length > 0) {
      tags.forEach(tag => params.append('tags[]', tag));
    } else {
      // Default tags
      params.append('tags[]', 'waifu');
    }
    
    // Add type
    params.append('type', type);
    
    // Add is_nsfw
    params.append('is_nsfw', isNsfw ? 'true' : 'false');
    
    // Add limit
    params.append('limit', '5');
    
    const fullUrl = `${url}?${params.toString()}`;
    console.log('🔍 Fetching from:', fullUrl);
    
    const response = await axios.get(fullUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      timeout: 30000,
      maxRedirects: 5,
    });
    
    if (!response.data || !response.data.images || response.data.images.length === 0) {
      throw new Error('No images found');
    }
    
    return response.data.images;
  } catch (error) {
    console.error('❌ Waifu.im API error:', error.message);
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', error.response.data);
    }
    throw error;
  }
}

// ── Fallback: Use waifu.pics API if waifu.im fails ──────────
async function getFallbackImage(tag = 'waifu') {
  try {
    const validTags = ['waifu', 'neko', 'shinobu', 'megumin', 'cuddle', 'hug', 'kiss', 'pat'];
    const tagToUse = validTags.includes(tag) ? tag : 'waifu';
    const url = `https://api.waifu.pics/sfw/${tagToUse}`;
    console.log('🔄 Using fallback API:', url);
    
    const { data } = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });
    
    return [{ url: data.url }];
  } catch (error) {
    console.error('❌ Fallback API error:', error.message);
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
                          'ecchi', 'school', 'uniform', 'kimono', 'swimsuit', 'neko', 'cat',
                          'shinobu', 'megumin', 'konosuba', 'monogatari'];
        
        tags = args.filter(tag => validTags.includes(tag));
      }
      
      // If no tags specified, use default
      if (tags.length === 0) {
        tags = ['waifu'];
      }
      
      let images = [];
      let usedFallback = false;
      
      try {
        // Try waifu.im first
        images = await getWaifuImages(tags, isNsfw, type);
        console.log('✅ Using waifu.im API');
      } catch (error) {
        console.log('⚠️ waifu.im failed, trying fallback...');
        usedFallback = true;
        try {
          // Fallback to waifu.pics
          const fallbackImage = await getFallbackImage(tags[0]);
          images = fallbackImage;
          console.log('✅ Using fallback API');
        } catch (fallbackError) {
          throw new Error(`Both APIs failed: ${error.message}`);
        }
      }
      
      // Create carousel cards
      const maxCards = Math.min(images.length, 3);
      const cards = [];
      
      for (let i = 0; i < maxCards; i++) {
        const img = images[i];
        const imageUrl = img.url;
        const tagsList = img.tags ? img.tags.map(t => t.name).join(', ') : tags.join(', ');
        const width = img.width || 'N/A';
        const height = img.height || 'N/A';
        const source = img.signature || (usedFallback ? 'waifu.pics' : 'waifu.im');
        
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
                  `🔹 Width: ${width}px\n` +
                  `🔹 Height: ${height}px\n` +
                  `🔹 Source: ${source}\n` +
                  `🔹 Type: ${type.toUpperCase()}`,
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
                  text: `🌸 ${tags.join(', ')} Images ${usedFallback ? '(Fallback)' : ''}`,
                },
                footer: {
                  text: `🔹 ${cards.length} image(s) | Powered by NJABULO JB`,
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
      
      errorMsg += `\n\n💡 *Try:*\n` +
                  `• .waifu cute\n` +
                  `• .neko\n` +
                  `• .shinobu\n` +
                  `• .megumin\n\n` +
                  `🔹 Powered by NJABULO JB`;
      
      await sendError(zk, chatId, errorMsg, ms);
    }
  }
);

// ── Neko command ─────────────────────────────────────────────
fana(
  {
    nomCom: "neko",
    aliases: ["catgirl", "nekogirl"],
    categorie: "Weeb",
    reaction: "😺",
  },
  async (chatId, zk, context) => {
    const { ms } = context;
    
    try {
      // Use fallback directly since waifu.im might not have neko tags
      const images = await getFallbackImage('neko');
      const img = images[0];
      
      const buttons = [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Copy URL",
            copy_code: img.url,
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "🌐 View Original",
            url: img.url,
          }),
        },
      ];
      
      await zk.sendMessage(
        chatId,
        {
          image: { url: img.url },
          caption: `🐱 *Neko Girl*\n\n` +
                   `📸 Source: waifu.pics\n\n` +
                   `🔹 Powered by NJABULO JB`,
          buttons: buttons,
          headerType: 1,
        },
        { quoted: ms }
      );
      
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
    const { ms } = context;
    
    try {
      const images = await getFallbackImage('shinobu');
      const img = images[0];
      
      const buttons = [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Copy URL",
            copy_code: img.url,
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "🌐 View Original",
            url: img.url,
          }),
        },
      ];
      
      await zk.sendMessage(
        chatId,
        {
          image: { url: img.url },
          caption: `🦋 *Shinobu*\n\n` +
                   `📸 Source: waifu.pics\n\n` +
                   `🔹 Powered by NJABULO JB`,
          buttons: buttons,
          headerType: 1,
        },
        { quoted: ms }
      );
      
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
    const { ms } = context;
    
    try {
      const images = await getFallbackImage('megumin');
      const img = images[0];
      
      const buttons = [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Copy URL",
            copy_code: img.url,
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "🌐 View Original",
            url: img.url,
          }),
        },
      ];
      
      await zk.sendMessage(
        chatId,
        {
          image: { url: img.url },
          caption: `💥 *Megumin*\n\n` +
                   `📸 Source: waifu.pics\n\n` +
                   `🔹 Powered by NJABULO JB`,
          buttons: buttons,
          headerType: 1,
        },
        { quoted: ms }
      );
      
    } catch (error) {
      console.error('❌ Megumin command error:', error);
      await sendError(zk, chatId, `Error: ${error.message}`, ms);
    }
  }
);

// ── Simple waifu command (direct image) ──────────────────────
fana(
  {
    nomCom: "waifu2",
    aliases: ["anime2", "animelove"],
    categorie: "Weeb",
    reaction: "💕",
  },
  async (chatId, zk, context) => {
    const { ms } = context;
    
    try {
      const images = await getFallbackImage('waifu');
      const img = images[0];
      
      const buttons = [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Copy URL",
            copy_code: img.url,
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "🌐 View Original",
            url: img.url,
          }),
        },
      ];
      
      await zk.sendMessage(
        chatId,
        {
          image: { url: img.url },
          caption: `💕 *Waifu*\n\n` +
                   `📸 Source: waifu.pics\n\n` +
                   `🔹 Powered by NJABULO JB`,
          buttons: buttons,
          headerType: 1,
        },
        { quoted: ms }
      );
      
    } catch (error) {
      console.error('❌ Waifu2 command error:', error);
      await sendError(zk, chatId, `Error: ${error.message}`, ms);
    }
  }
);
