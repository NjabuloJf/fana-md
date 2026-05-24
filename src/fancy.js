const { fana } = require("../njabulo/fana");
const config = require("../set");
const fancy = require("../njabulo/style");

// ── Random image list ─────────────────────────────────────────────
const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",

];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Helper that builds the button list for a given copy‑text ─────
function buildButtons(copyText) {
  return [
    {
      name: "cta_copy",
      buttonParamsJson: JSON.stringify({
        display_text: "Copy",
        id: "copy",
        copy_code: copyText,          // <-- the text to copy
      }),
    },
  ];
}

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
  const buttons = buildButtons(text);   // create buttons that copy the same text

  await zk.sendMessage(
    chatId,
    {
      interactiveMessage: {
        image: { url: randomNjabulourl },
        header: text,
        buttons,
        headerType: 1,
      },
    }
  );
}

// ── Command: .fancy ─────────────────────────────────────────────
fana(
  {
    nomCom: "fancy",
    categorie: "Fun",
    reaction: "✍️",
  },
  async (dest, zk, commandeOptions) => {
    const { arg, repondre, prefixe, ms } = commandeOptions;
    const id = arg[0]?.match(/\d+/)?.join("");
    const text = arg.slice(1).join(" ");

    try {
      if (!id || !text) {
        const helpText =
          `\nExemple : ${prefixe}fancy 10 Njabulo Jb\n` +
          String.fromCharCode(8206).repeat(4001) +
          fancy.list("Njabulo Jb 2025", fancy);
        return await sendFormattedMessage(zk, dest, helpText, ms);
      }

      const selectedStyle = fancy[parseInt(id) - 1];
      if (selectedStyle) {
        const styled = fancy.apply(selectedStyle, text);
        return await sendFormattedMessage(zk, dest, styled, ms);
      } else {
        return await sendFormattedMessage(
          zk,
          dest,
          "_Style introuvable :(_",
          ms
        );
      }
    } catch (error) {
      console.error(error);
      return await sendFormattedMessage(
        zk,
        dest,
        "_Une erreur s'est produite :(_",
        ms
      );
    }
  }
);
