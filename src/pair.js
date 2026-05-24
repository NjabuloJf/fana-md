const { fana } = require("../njabulo/fana");
const axios = require("axios");
const config = require("../set");

// ── Random image list from GitHub ─────────────────────────────────────────────
const njabulox = [
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Base button definition (only Copy button) ────────────────────────
const baseButtons = [
  {
    name: "cta_copy",
    buttonParamsJson: JSON.stringify({
      display_text: "📋 Copy",
      id: "copy",
      copy_code: "", // will be filled dynamically
    }),
  },
];

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
  const buttons = JSON.parse(JSON.stringify(baseButtons));
  buttons[0].buttonParamsJson = JSON.stringify({
    display_text: "📋 Copy",
    id: "copy",
    copy_code: text,
  });

  await zk.sendMessage(
    chatId,
    {
      interactiveMessage: {
        image: { url: randomNjabulourl },
        header: text,
        buttons,
        headerType: 1,
      },
    },
    { quoted: ms }
  );
}

// ── Pair code command ─────────────────────────────────────────────
fana(
  {
    nomCom: "pair",
    aliases: ["session", "code", "paircode", "qrcode"],
    reaction: "📡",
    categorie: "system",
  },
  async (chatId, zk, commandeOptions) => {
    const { repondre, arg, ms } = commandeOptions;

    if (!arg || arg.length === 0) {
      return sendFormattedMessage(
        zk,
        chatId,
        "📌 *Enter your number like:*\n\n.pair 26777821911",
        ms
      );
    }

    try {
      await sendFormattedMessage(
        zk,
        chatId,
        "⏳ *Wait, generating your pairing code...*",
        ms
      );

      const encodedNumber = encodeURIComponent(arg.join(" "));
      const apiUrl = `https://site-code-bv0o.onrender.com/code?number=${encodedNumber}`;

      const response = await axios.get(apiUrl);
      const data = response.data;

      if (data && data.code) {
        const pairingCode = data.code;

        // Send the pairing code with copy button
        const buttons = JSON.parse(JSON.stringify(baseButtons));
        buttons[0].buttonParamsJson = JSON.stringify({
          display_text: "📋 Copy Code",
          id: "copy",
          copy_code: pairingCode,
        });

        await zk.sendMessage(
          chatId,
          {
            interactiveMessage: {
              image: { url: randomNjabulourl },
              header: `🔐 *YOUR PAIRING CODE* 🔐\n\n${pairingCode}`,
              buttons: buttons,
              headerType: 1,
            },
          },
          { quoted: ms }
        );

        await sendFormattedMessage(
          zk,
          chatId,
          "✅ *Here is your pair code, copy and paste it to the notification above or link devices.*",
          ms
        );
      } else {
        throw new Error("Invalid response from API.");
      }
    } catch (error) {
      console.error("Error getting API response:", error.message);
      sendFormattedMessage(zk, chatId, "❌ Error getting response from API.", ms);
    }
  }
);
