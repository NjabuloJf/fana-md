const { fana } = require('../njabulo/fana');

fana({
  nomCom: "fbhelp",
  alias: ["facebookhelp", "fbguide"],
  categorie: "Download",
  reaction: "📚"
}, async (dest, zk, commandeOptions) => {
  const { ms } = commandeOptions;
  
  const sections = [
    {
      title: "📥 Download Options",
      rows: [
        { title: "🎬 HD Download", description: "Download high quality video", rowId: ".facebook " },
        { title: "📱 SD Download", description: "Download standard quality", rowId: ".fb " }
      ]
    },
    {
      title: "ℹ️ Information",
      rows: [
        { title: "📚 Help Menu", description: "Show this menu again", rowId: ".fbhelp" }
      ]
    }
  ];

  const listMessage = {
    text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃   📥 *FACEBOOK DOWNLOADER* 📥
┣━━━━━━━━━━━━━━━━━━━━┫
┃
┃ 📌 *.facebook <link>* - HD Quality
┃ 📌 *.fb <link>* - SD Quality
┃
┣━━━━━━━━━━━━━━━━━━━━┫
┃ 💫 *Powered by NJABULO MD*
╰━━━━━━━━━━━━━━━━━━━━╯`,
    footer: "✨ NJABULO MD",
    title: "📚 Facebook Downloader",
    buttonText: "📥 Choose Action",
    sections: sections,
    listType: 1
  };

  await zk.sendMessage(dest, { listMessage: listMessage }, { quoted: ms });
});





fana({
  nomCom: "fbhelpi",
  alias: ["facebookhelp", "fbguide"],
  categorie: "Download",
  reaction: "📚"
}, async (dest, zk, commandeOptions) => {
  const { ms } = commandeOptions;
  
  const sections = [
    {
      title: "Download",
      rows: [
        { title: "HD Download", description: "Download HD quality", rowId: ".facebook " },
        { title: "SD Download", description: "Download SD quality", rowId: ".fb " }
      ]
    },
    {
      title: "Other",
      rows: [
        { title: "Help Menu", description: "Show menu again", rowId: ".fbhelp" }
      ]
    }
  ];

  const listMessage = {
    text: `╭━━━━━━━━━━━━╮
┃   📥 *FACEBOOK DOWNLOADER* 📥
┣━━━━━━━━━━━━┫
┃ 📌 *.facebook <link>* = HD
┃ 📌 *.fb <link>* = SD
╰━━━━━━━━━━━━╯

Tap "Choose Action" below 👇`,
    footer: "✨ Powered by NJABULO MD",
    title: "📚 Facebook Help",
    buttonText: "📥 Choose Action",
    sections: sections,
    listType: 1
  };

  await zk.sendMessage(dest, { listMessage: listMessage }, { quoted: ms });
});
