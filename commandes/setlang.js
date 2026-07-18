const { fana } = require("../njabulo/fana");
const conf = require("../set");
const fs = require("fs-extra");
const { languageNames } = require("../language");
const { translateText } = require("../translate");

fana({
  nomCom: "setlang",
  alias: ["setlanguage", "changelang"],
  categorie: "Settings",
  reaction: "🔤"
}, async (dest, zk, commandeOptions) => {
  const { ms, repondre, arg, superUser } = commandeOptions;

  const lang = conf.LANGUAGE || "en";
  
  const onlyOwner = await translateText("❌ *Only bot owner can change language!*", lang);
  const invalid = await translateText("❌ *Invalid language code!*", lang);
  const changed = await translateText("✅ *Language changed successfully!*", lang);
  const current = await translateText("📌 *Current Language:*", lang);
  const usage = await translateText("📝 *Usage:* .setlang <code>", lang);
  const available = await translateText("📌 *Available Languages:*", lang);
  const restart = await translateText("🔄 *Restart bot for changes to take effect.*", lang);
  const errorMsg = await translateText("❌ *Error changing language:*", lang);

  if (!superUser) {
    return repondre(onlyOwner);
  }

  if (!arg || !arg[0]) {
    const langList = Object.entries(languageNames).map(([code, name]) => {
      return `• ${name} (${code})`;
    }).join('\n');
    
    return repondre(`${available}\n\n${langList}\n\n${usage}\n\n💡 *Example:* .setlang zu`);
  }

  const langCode = arg[0].toLowerCase();
  
  if (!languageNames[langCode]) {
    return repondre(`${invalid}\n\n📌 *Available codes:* ${Object.keys(languageNames).join(', ')}`);
  }

  try {
    const setPath = __dirname + "/../set.js";
    let setContent = fs.readFileSync(setPath, 'utf8');
    
    setContent = setContent.replace(
      /LANGUAGE: process\.env\.LANGUAGE \|\| ".*"/,
      `LANGUAGE: process.env.LANGUAGE || "${langCode}"`
    );
    
    fs.writeFileSync(setPath, setContent);
    
    conf.LANGUAGE = langCode;
    
    const newLangName = languageNames[langCode];
    await repondre(`${changed}\n\n🌍 *New Language:* ${newLangName}\n📌 *Code:* ${langCode}\n\n${restart}`);
    
  } catch (error) {
    console.error("Language change error:", error);
    repondre(`${errorMsg} ${error.message}`);
  }
});