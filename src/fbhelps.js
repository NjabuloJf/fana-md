const { fana } = require('../njabulo/fana');
const fs = require('fs');
const getFBInfo = require("@xaviabot/fb-downloader");
const { default: axios } = require('axios');
const config = require("../set");

// ---------- Help command ----------
fana({
  nomCom: "fbhelp",
  alias: ["facebookhelp", "fbguide"],
  categorie: "Download",
  reaction: "📚"
}, async (dest, zk, commandeOptions) => {
  const { ms } = commandeOptions;
  
  const msg = {
    text: `╭━━━━━━━━━━━━╮
┃   📥 *FACEBOOK DOWNLOADER* 📥
┣━━━━━━━━━━━━┫
┃ 📌 *.facebook <link>* = HD
┃ 📌 *.fb <link>* = SD
┃ 📌 *.fbhelp* = This menu
╰━━━━━━━━━━━━╯

📝 *How to use:* Tap "Choose Action" below, then paste your FB link`,
    footer: '✨ Powered by NJABULO MD',
    interactive: {
      body: { text: 'Select what you want to do:' },
      footer: { text: 'NJABULO MD' },
      header: {
        title: '📚 Facebook Help',
        hasMediaAttachment: false
      },
      nativeFlowMessage: {
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
      }
    }
  };

  await zk.sendMessage(dest, msg, { quoted: ms });
});
