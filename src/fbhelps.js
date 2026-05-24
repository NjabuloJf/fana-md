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
