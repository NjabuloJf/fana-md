const { fana } = require("../njabulo/fana");
const conf = require("../set");
const fs = require("fs-extra");

const languageNames = {
  en: "English",
  sn: "Shona",
  nd: "Ndebele",
  af: "Afrikaans",
  zu: "Zulu",
  xh: "Xhosa",
  pt: "Portuguese",
  sw: "Swahili",
  hi: "Hindi",
  ar: "Arabic",
  fr: "French",
  es: "Spanish",
  zh: "Chinese",
  de: "German",
  ha: "Hausa",
  ig: "Igbo",
  yo: "Yoruba",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  gu: "Gujarati",
  ku: "Kurdish",
  fa: "Persian",
  he: "Hebrew",
  tr: "Turkish",
  it: "Italian",
  ru: "Russian",
  nl: "Dutch",
  el: "Greek",
  pl: "Polish",
  ja: "Japanese",
  ko: "Korean",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  tl: "Filipino",
  ms: "Malay",
  vmw: "Makua",
  seh: "Sena",
  ts: "Tsonga",
  ki: "Kikuyu",
  luo: "Luo",
  luh: "Luhya",
  kal: "Kalenjin",
  qu: "Quechua"
};

fana({
  nomCom: "setlang",
  alias: ["setlanguage", "changelang"],
  categorie: "Settings",
  reaction: "🔤"
}, async (dest, zk, commandeOptions) => {
  const { ms, repondre, arg, superUser } = commandeOptions;

  if (!superUser) {
    return repondre("❌ *Only bot owner can change language!*");
  }

  if (!arg || !arg[0]) {
    const langList = Object.entries(languageNames).map(([code, name]) => {
      return `• ${name} (${code})`;
    }).join('\n');
    
    return repondre(`📌 *Available Languages:*\n\n${langList}\n\n📝 *Usage:* .setlang <code>\n\n💡 *Example:* .setlang zu`);
  }

  const langCode = arg[0].toLowerCase();
  
  if (!languageNames[langCode]) {
    return repondre(`❌ *Invalid language code!*\n\n📌 *Available codes:* ${Object.keys(languageNames).join(', ')}`);
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
    
    await repondre(`✅ *Language changed successfully!*\n\n🌍 *New Language:* ${languageNames[langCode]}\n📌 *Code:* ${langCode}\n\n🔄 *Restart bot for changes to take effect.*`);
    
  } catch (error) {
    console.error("Language change error:", error);
    repondre(`❌ *Error changing language:* ${error.message}`);
  }
});
