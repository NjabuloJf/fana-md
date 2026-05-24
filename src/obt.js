const JavaScriptObfuscator = require("javascript-obfuscator");
const { fana } = require("../njabulo/fana");
const config = require("../set");

// ── Random image list ─────────────────────────────────────────────
const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Base button definition (same as in other modules) ─────
const baseButtons = [
  {
    name: "cta_url",
    buttonParamsJson: JSON.stringify({
      display_text: "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹",
      id: "backup channel",
      url: config.GURL
    }),
  },
];

const buttons = [
  {
    name: "cta_url",
    buttonParamsJson: JSON.stringify({
      display_text: "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹",
      id: "backup channel",
      url: config.GURL
    }),
  },
];

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
  await zk.sendMessage(
    chatId,
    {
      interactiveMessage: {
        image: { url: randomNjabulourl },
        header: text,
        buttons,
        headerType: 1,
      }
         },{quoted:ms});
}

// ── Obfuscate command ─────────────────────────────────────────────
fana(
  {
    nomCom: "obt",
    categorie: "General",
  },
  async (chatId, zk, commandeOptions) => {
    const {
      ms,
      arg,
      repondre,
      auteurMessage,
      nomAuteurMessage,
      msgRepondu,
      auteurMsgRepondu,
    } = commandeOptions;

    if (!arg[0]) {
      sendFormattedMessage(
        zk,
        chatId,
        "*Aftᥱr thᥱ ᥴommᥲnd, ρrovιdᥱ ᥲ vᥲᥣιd JᥲvᥲSᥴrιρt ᥴodᥱ for ᥱnᥴrყρtιon*",
        ms
      );
      return;
    }

    try {
      const code = arg.join(" ");
      const obfuscated = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        numbersToExpressions: true,
        simplify: true,
        stringArrayShuffle: true,
        splitStrings: true,
        stringArrayThreshold: 1,
      });

      const obfText = obfuscated.getObfuscatedCode();

      // send the obfuscated code with copy button
      const copyButtons = JSON.parse(JSON.stringify(baseButtons));
      copyButtons[1].buttonParamsJson = JSON.stringify({
        display_text: "Copy",
        id: "copy",
        copy_code: obfText,
      });

      await zk.sendMessage(
        chatId,
        {
          interactiveMessage: {
            image: { url: randomNjabulourl },
            header: obfText,
            buttons: copyButtons,
            headerType: 1,
          },{quoted:ms});

    } catch (error) {
      console.error("Obfuscation error:", error);
      sendFormattedMessage(
        zk,
        chatId,
        "*Somᥱthιng ιs ᥕrong, ᥴhᥱᥴk ιf ყoᥙr ᥴodᥱ ιs ᥣogιᥴᥲᥣ ᥲnd hᥲs thᥱ ᥴorrᥱᥴt sყntᥲx*",
        ms
      );
    }
  }
);
