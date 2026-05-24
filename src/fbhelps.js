const { fana } = require('../njabulo/fana');
const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

// ---------- Help command ----------
fana({
  nomCom: "fbhelpi",
  alias: ["facebookhelp", "fbguide"],
  categorie: "Download",
  reaction: "📚"
}, async (dest, zk, commandeOptions) => {
  const { ms } = commandeOptions;
  
  const interactiveMessage = generateWAMessageFromContent(dest, {
    viewOnceMessage: {
      message: {
        interactiveMessage: proto.Message.InteractiveMessage.create({
          body: proto.Message.InteractiveMessage.Body.create({
            text: `╭━━━━━━━━━━━━╮
┃   📥 *FACEBOOK DOWNLOADER* 📥
┣━━━━━━━━━━━━┫
┃ 📌 *.facebook <link>* = HD
┃ 📌 *.fb <link>* = SD
┃ 📌 *.fbhelp* = This menu
╰━━━━━━━━━━━━╯

📝 *How to use:* Tap below, then paste your FB link`
          }),
          footer: proto.Message.InteractiveMessage.Footer.create({
            text: '✨ Powered by NJABULO MD'
          }),
          header: proto.Message.InteractiveMessage.Header.create({
            title: '📚 Facebook Help',
            hasMediaAttachment: false
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: [
              {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  title: "📥 Choose Action",
                  sections: [
                    {
                      title: "Download",
                      rows: [
                        {
                          header: "HD Download",
                          title: ".facebook <link>",
                          description: "Download HD quality",
                          id: ".facebook "
                        },
                        {
                          header: "SD Download", 
                          title: ".fb <link>",
                          description: "Download SD quality",
                          id: ".fb "
                        }
                      ]
                    },
                    {
                      title: "Other",
                      rows: [
                        {
                          header: "Help Menu",
                          title: ".fbhelp",
                          description: "Show menu again",
                          id: ".fbhelp"
                        }
                      ]
                    }
                  ]
                })
              }
            ]
          })
        })
      }
    }
  }, { quoted: ms });

  await zk.relayMessage(dest, interactiveMessage.message, { messageId: interactiveMessage.key.id });
});

// ---------- Help command ----------
fana({
  nomCom: "fbhelp",
  alias: ["facebookhelp", "fbguide"],
  categorie: "Download",
  reaction: "📚"
}, async (dest, zk, commandeOptions) => {
  const { ms } = commandeOptions;
  
  const listMsg = {
    text: `📌 *How to use:*
1. Get a public Facebook video link
2. Send: .facebook [link] 
3. Wait for the video

✨ *Powered by NJABULO MD*`,
    footer: "Select an option below 👇",
    title: "📚 Facebook Help",
    buttonText: "📥 Choose Action",
    sections: [
      {
        title: "Download Options",
        rows: [
          {
            header: "HD Download",
            title: ".facebook <link>",
            description: "Download HD quality video",
            id: ".facebook "
          },
          {
            header: "SD Download", 
            title: ".fb <link>",
            description: "Download SD quality video", 
            id: ".fb "
          },
          {
            header: "Help Menu",
            title: ".fbhelp",
            description: "Show this menu again",
            id: ".fbhelp"
          }
        ]
      }
    ]
  };

  await zk.sendMessage(dest, { 
    list: listMsg 
  }, { quoted: ms });
});
