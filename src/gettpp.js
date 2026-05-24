const { fana } = require("../njabulo/fana");
const config = require("../set");

// ── Button definition (used for both help‑msg and the new pic‑msg) ─────
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

// ── Helper that sends an interactive message (image + buttons) ─────
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
 }, { quoted: ms });
}

// ── Command: .getpp ─────────────────────────────────────────────
fana(
  {
    nomCom: "getpp",
    categorie: "General",
    reaction: "📷",
  },
  async (chatId, zk, commandeOptions) => {
    const {
      ms,
      repondre,
      msgRepondu,
      auteurMsgRepondu,
      mybotpic,
      nomAuteurMessage,
    } = commandeOptions;

    if (!msgRepondu) {
      return sendFormattedMessage(
        zk,
        chatId,
        `Yo ${nomAuteurMessage}, reply to someone’s message to snag their profile pic! 😡 Don’t make Njabulo Jb do extra work! 🤔`,
        ms
      );
    }

    try {
      await sendFormattedMessage(
        zk,
        chatId,
        `Yo ${nomAuteurMessage}, Njabulo Jb’s hunting for @${auteurMsgRepondu.split("@")[0]}’s profile pic! 📸 Hold tight! 🔍`,
        ms
      );

      let ppuser;
      try {
        ppuser = await zk.profilePictureUrl(auteurMsgRepondu, "image");
      } catch {
        ppuser = mybotpic();
        await sendFormattedMessage(
          zk,
          chatId,
          `Yo ${nomAuteurMessage}, @${auteurMsgRepondu.split("@")[0]}’s profile pic is locked tight! 😣 Njabulo Jb’s got you my pic instead! 😎`,
          ms
        );
      }

      // ── Send the picture WITH a button ─────────────────────────────────
      await zk.sendMessage(
        chatId,
        {
          interactiveMessage: {
            image: { url: ppuser },
            header: `BOOM, ${nomAuteurMessage}! Snagged @${auteurMsgRepondu.split("@")[0]}’s profile pic! 🔥`,
            buttons,
            headerType: 1,
          }
         }, { quoted: ms });

    } catch (error) {
      console.error("Error in .getpp command:", error);
      await sendFormattedMessage(
        zk,
        chatId,
        `TOTAL BUST, ${nomAuteurMessage}! Njabulo Jb crashed while grabbing the pic: ${error.message} 😡 Try again or flop! 😣`,
        ms
      );
    }
  }
);


fana(
  {
    nomCom: "profile",
    categorie: "General",
    reaction: "📷",
  },
  async (chatId, zk, commandeOptions) => {
    const {
      ms,
      repondre,
      msgRepondu,
      auteurMsgRepondu,
      mybotpic,
      nomAuteurMessage,
    } = commandeOptions;

    if (!msgRepondu) {
      return sendFormattedMessage(
        zk,
        chatId,
        `Yo ${nomAuteurMessage}, reply to someone’s message to snag their profile pic! 😡 Don’t make Njabulo Jb do extra work! 🤔`,
        ms
      );
    }

    try {
      await sendFormattedMessage(
        zk,
        chatId,
        `Yo ${nomAuteurMessage}, Njabulo Jb’s hunting for @${auteurMsgRepondu.split("@")[0]}’s profile pic! 📸 Hold tight! 🔍`,
        ms
      );

      let ppuser;
      try {
        ppuser = await zk.profilePictureUrl(auteurMsgRepondu, "image");
      } catch {
        ppuser = mybotpic();
        await sendFormattedMessage(
          zk,
          chatId,
          `Yo ${nomAuteurMessage}, @${auteurMsgRepondu.split("@")[0]}’s profile pic is locked tight! 😣 Njabulo Jb’s got you my pic instead! 😎`,
          ms
        );
      }

      // ── Send the picture WITH a button ─────────────────────────────────
      await zk.sendMessage(
        chatId,
        {
          interactiveMessage: {
            image: { url: ppuser },
            header: `BOOM, ${nomAuteurMessage}! Snagged @${auteurMsgRepondu.split("@")[0]}’s profile pic! 🔥`,
            buttons,
            headerType: 1,
          }
          }, { quoted: ms });

    } catch (error) {
      console.error("Error in .getpp command:", error);
      await sendFormattedMessage(
        zk,
        chatId,
        `TOTAL BUST, ${nomAuteurMessage}! Njabulo Jb crashed while grabbing the pic: ${error.message} 😡 Try again or flop! 😣`,
        ms
      );
    }
  }
);
