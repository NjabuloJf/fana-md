const { fana } = require("../njabulo/fana");
const { languageSections } = require("../language");
const conf = require("../set");
const { languageNames } = require("../language");
const { translateText } = require("../translate");

fana({
  nomCom: "lang",
  alias: ["language", "langs"],
  categorie: "Settings",
  reaction: "🌍"
}, async (dest, zk, commandeOptions) => {
  const { ms } = commandeOptions;

  const lang = conf.LANGUAGE || "en";
  
  const currentLangName = languageNames[lang] || "English";
  const chooseText = await translateText("Choose your preferred language from the list below.", lang);
  const poweredBy = await translateText("Powered by NJABULO MD", lang);

  await zk.sendPresenceUpdate('composing', dest);
  await new Promise(r => setTimeout(r, 800));
  await zk.sendPresenceUpdate('paused', dest);

  await zk.sendMessage(dest, {
    listMessage: {
      text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃   🌍 *BOT LANGUAGE* 🌍
┣━━━━━━━━━━━━━━━━━━━━┫
┃
┃ ${chooseText}
┃
┃ 📌 *Current Language:* 
┃ ${currentLangName} (${lang})
┃
┣━━━━━━━━━━━━━━━━━━━━┫
┃ 💫 ${poweredBy}
╰━━━━━━━━━━━━━━━━━━━━╯`,
      footer: "✨ NJABULO MD",
      title: "Language Settings",
      buttonText: "🌍 Choose Language",
      sections: languageSections,
      listType: 1
    }
  }, { quoted: ms });
});