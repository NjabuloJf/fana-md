const { fana } = require("../njabulo/fana");
const axios = require("axios");
let { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
const { isUserBanned, addUserToBanList, removeUserFromBanList } = require("../bdd/banUser");
const { addGroupToBanList, isGroupBanned, removeGroupFromBanList } = require("../bdd/banGroup");
const { isGroupOnlyAdmin, addGroupToOnlyAdminList, removeGroupFromOnlyAdminList } = require("../bdd/onlyAdmin");
const { removeSudoNumber, addSudoNumber, issudo } = require("../bdd/sudo");
const config = require("../set");

// ========== GOOGLE TRANSLATE API ==========
let translateText = async (text, targetLang) => {
    try {
        if (!targetLang || targetLang === 'en') return text;
        try {
            const { translate } = require('@vitalets/google-translate-api');
            const result = await translate(text, { to: targetLang });
            return result.text;
        } catch (e) {
            const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`, {
                timeout: 5000
            });
            if (response.data && response.data.responseData) {
                return response.data.responseData.translatedText || text;
            }
            return text;
        }
    } catch (error) {
        console.error('Translation error:', error.message);
        return text;
    }
};

// ========== TRANSLATED BUTTON FUNCTION ==========
async function getTranslatedButton() {
    const lang = config.LANGUAGE || "en";
    return await translateText("🌐 WA Channel", lang);
}

// ── Random image list ─────────────────────────────────────────────
const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Base button definition ────────────────────────────────────────
async function getButtons() {
    const waChannel = await getTranslatedButton();
    return [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: waChannel,
                id: "backup channel",
                url: config.GURL,
            }),
        },
    ];
}

// ── Helper that sends an interactive message with buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
    const buttons = await getButtons();
    await zk.sendMessage(
        chatId,
        {
            interactiveMessage: {
                header: text,
                buttons: buttons,
                headerType: 1
            }
        },
        { quoted: ms }
    );
}

const sleep = (ms) => {
    return new Promise((resolve) => { setTimeout(resolve, ms) });
};

// ── Telesticker command ─────────────────────────────────────────────
fana({ nomCom: "telesticker", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, arg, nomAuteurMessage, superUser } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const onlyMods = await translateText("❌ Only Mods can use this command", lang);
    const putLink = await translateText("📌 Put a telegram sticker link", lang);
    const errorDownloading = await translateText("❌ Error downloading stickers", lang);
    const stickerDownloader = await translateText("🎨 *Telegram Sticker Downloader*", lang);
    const nameText = await translateText("📛 *Name:*", lang);
    const typeText = await translateText("📌 *Type:*", lang);
    const lengthText = await translateText("📊 *Length:*", lang);
    const downloading = await translateText("⏳ Downloading...", lang);
    const animated = await translateText("animated sticker", lang);
    const notAnimated = await translateText("not animated sticker", lang);

    if (!superUser) {
        return sendFormattedMessage(zk, dest, onlyMods, ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, dest, putLink, ms);
    }

    let lien = arg.join(' ');
    let name = lien.split('/addstickers/')[1];

    let api = 'https://api.telegram.org/bot891038791:AAHWB1dQd-vi0IbH2NjKYUk-hqQ8rQuzPD4/getStickerSet?name=' + encodeURIComponent(name);

    try {
        let stickers = await axios.get(api);

        let type = null;
        if (stickers.data.result.is_animated === true || stickers.data.result.is_video === true) {
            type = animated;
        } else {
            type = notAnimated;
        }

        let msg = `${stickerDownloader}
        
${nameText} ${stickers.data.result.name}
${typeText} ${type}
${lengthText} ${(stickers.data.result.stickers).length}

${downloading}`;

        await sendFormattedMessage(zk, dest, msg, ms);

        for (let i = 0; i < (stickers.data.result.stickers).length; i++) {
            let file = await axios.get(`https://api.telegram.org/bot891038791:AAHWB1dQd-vi0IbH2NjKYUk-hqQ8rQuzPD4/getFile?file_id=${stickers.data.result.stickers[i].file_id}`);

            let buffer = await axios({
                method: 'get',
                url: `https://api.telegram.org/file/bot891038791:AAHWB1dQd-vi0IbH2NjKYUk-hqQ8rQuzPD4/${file.data.result.file_path}`,
                responseType: 'arraybuffer',
            });

            const sticker = new Sticker(buffer.data, {
                pack: nomAuteurMessage,
                author: "NJABULO",
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'],
                id: '12345',
                quality: 50,
                background: '#000000'
            });

            const stickerBuffer = await sticker.toBuffer();
            await zk.sendMessage(dest, { sticker: stickerBuffer }, { quoted: ms });
        }
    } catch (e) {
        console.error(e);
        await sendFormattedMessage(zk, dest, errorDownloading, ms);
    }
});

// ── Crew command ─────────────────────────────────────────────
fana({ nomCom: "crew", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, arg, auteurMessage, superUser, auteurMsgRepondu, msgRepondu } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const onlyMods = await translateText("❌ Only mods can use this command", lang);
    const enterName = await translateText("📌 Please enter the name of the group to create", lang);
    const mentionMember = await translateText("📌 Please mention a member to add", lang);
    const welcome = await translateText("🎉 Welcome to", lang);

    if (!superUser) {
        return sendFormattedMessage(zk, dest, onlyMods, ms);
    }
    if (!arg[0]) {
        return sendFormattedMessage(zk, dest, enterName, ms);
    }
    if (!msgRepondu) {
        return sendFormattedMessage(zk, dest, mentionMember, ms);
    }

    const name = arg.join(" ");
    const group = await zk.groupCreate(name, [auteurMessage, auteurMsgRepondu]);
    console.log("created group with id: " + group.gid);
    await sendFormattedMessage(zk, group.id, `${welcome} ${name}`, ms);
});

// ── Leave command ─────────────────────────────────────────────
fana({ nomCom: "leave", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, verifGroupe, superUser } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const groupOnly = await translateText("❌ Group only", lang);
    const reservedOwner = await translateText("❌ Command reserved for the owner", lang);
    const goodbye = await translateText("👋 Goodbye!", lang);

    if (!verifGroupe) {
        return sendFormattedMessage(zk, dest, groupOnly, ms);
    }
    if (!superUser) {
        return sendFormattedMessage(zk, dest, reservedOwner, ms);
    }
    await zk.groupLeave(dest);
    await sendFormattedMessage(zk, dest, goodbye, ms);
});

// ── Join command ─────────────────────────────────────────────
fana({ nomCom: "join", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { arg, ms, repondre, superUser } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const reservedOwner = await translateText("❌ Command reserved for the bot owner", lang);
    const success = await translateText("✅ Successfully joined the group", lang);

    if (!superUser) {
        return sendFormattedMessage(zk, dest, reservedOwner, ms);
    }
    let result = arg[0].split('https://chat.whatsapp.com/')[1];
    await zk.groupAcceptInvite(result);
    await sendFormattedMessage(zk, dest, success, ms);
});

// ── Jid command ─────────────────────────────────────────────
fana({ nomCom: "jid", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, msgRepondu, superUser, auteurMsgRepondu } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const reservedOwner = await translateText("❌ Command reserved for the bot owner", lang);

    if (!superUser) {
        return sendFormattedMessage(zk, dest, reservedOwner, ms);
    }
    let jid = msgRepondu ? auteurMsgRepondu : dest;
    await sendFormattedMessage(zk, dest, `📌 JID: ${jid}`, ms);
});

// ── Block command ─────────────────────────────────────────────
fana({ nomCom: "block", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, verifGroupe, msgRepondu, superUser, auteurMsgRepondu } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const reservedOwner = await translateText("❌ Command reserved for the bot owner", lang);
    const mentionUser = await translateText("📌 Be sure to mention the person to block", lang);
    const success = await translateText("✅ User blocked successfully", lang);

    if (!superUser) {
        return sendFormattedMessage(zk, dest, reservedOwner, ms);
    }
    let jid = msgRepondu ? auteurMsgRepondu : dest;
    if (!msgRepondu && verifGroupe) {
        return sendFormattedMessage(zk, dest, mentionUser, ms);
    }
    await zk.updateBlockStatus(jid, "block");
    await sendFormattedMessage(zk, dest, success, ms);
});

// ── Unblock command ─────────────────────────────────────────────
fana({ nomCom: "unblock", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, verifGroupe, msgRepondu, superUser, auteurMsgRepondu } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const reservedOwner = await translateText("❌ Command reserved for the bot owner", lang);
    const mentionUser = await translateText("📌 Please mention the person to unblock", lang);
    const success = await translateText("✅ User unblocked successfully", lang);

    if (!superUser) {
        return sendFormattedMessage(zk, dest, reservedOwner, ms);
    }
    let jid = msgRepondu ? auteurMsgRepondu : dest;
    if (!msgRepondu && verifGroupe) {
        return sendFormattedMessage(zk, dest, mentionUser, ms);
    }
    await zk.updateBlockStatus(jid, "unblock");
    await sendFormattedMessage(zk, dest, success, ms);
});

// ── Autoll command ─────────────────────────────────────────────
fana({ nomCom: "autoll", categorie: 'Group', reaction: "📣" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, verifGroupe, infosGroupe, superUser, auteurMessage } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const reservedGroups = await translateText("❌ This command is reserved for groups", lang);
    const warning = await translateText("⚠️ Non-admin members will be removed from the group. You have 5 seconds to cancel.", lang);
    const success = await translateText("✅ All non-admin members have been removed", lang);
    const needRights = await translateText("❌ I need administration rights", lang);
    const reservedOwner = await translateText("❌ Order reserved for the group owner", lang);

    const metadata = await zk.groupMetadata(dest);

    if (!verifGroupe) {
        return sendFormattedMessage(zk, dest, reservedGroups, ms);
    }
    if (superUser || auteurMessage == metadata.owner) {
        await sendFormattedMessage(zk, dest, warning, ms);
        await sleep(5000);
        let membresGroupe = verifGroupe ? await infosGroupe.participants : "";
        try {
            let users = membresGroupe.filter((member) => !member.admin);
            for (const membre of users) {
                await zk.groupParticipantsUpdate(dest, [membre.id], "remove");
                await sleep(500);
            }
            await sendFormattedMessage(zk, dest, success, ms);
        } catch (e) {
            await sendFormattedMessage(zk, dest, needRights, ms);
        }
    } else {
        await sendFormattedMessage(zk, dest, reservedOwner, ms);
    }
});

// ── Ban command ─────────────────────────────────────────────
fana({
    nomCom: 'ban',
    categorie: 'Mods',
}, async (dest, zk, commandeOptions) => {
    const { ms, arg, auteurMsgRepondu, msgRepondu, repondre, prefixe, superUser } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const reservedOwner = await translateText("❌ This command is only allowed to the bot owner", lang);
    const mentionVictim = await translateText("📌 Mention the victim by typing", lang);
    const alreadyBanned = await translateText("❌ This user is already banned", lang);
    const banned = await translateText("✅ User has been banned", lang);
    const unbanned = await translateText("✅ User has been unbanned", lang);
    const notBanned = await translateText("❌ This user is not banned", lang);
    const badOption = await translateText("❌ Bad option. Use 'add' or 'del'", lang);
    const mentionVictim2 = await translateText("📌 Mention the victim", lang);

    if (!superUser) {
        return sendFormattedMessage(zk, dest, reservedOwner, ms);
    }
    if (!arg[0]) {
        return sendFormattedMessage(zk, dest, `${mentionVictim} ${prefixe}ban add/del to ban/unban`, ms);
    }

    if (msgRepondu) {
        switch (arg.join(' ')) {
            case 'add':
                let youareban = await isUserBanned(auteurMsgRepondu);
                if (youareban) {
                    return sendFormattedMessage(zk, dest, alreadyBanned, ms);
                }
                addUserToBanList(auteurMsgRepondu);
                await sendFormattedMessage(zk, dest, banned, ms);
                break;
            case 'del':
                let estbanni = await isUserBanned(auteurMsgRepondu);
                if (estbanni) {
                    removeUserFromBanList(auteurMsgRepondu);
                    await sendFormattedMessage(zk, dest, unbanned, ms);
                } else {
                    await sendFormattedMessage(zk, dest, notBanned, ms);
                }
                break;
            default:
                await sendFormattedMessage(zk, dest, badOption, ms);
                break;
        }
    } else {
        await sendFormattedMessage(zk, dest, mentionVictim2, ms);
    }
});

// ── Bangroup command ─────────────────────────────────────────────
fana({
    nomCom: 'bangroup',
    categorie: 'Mods',
}, async (dest, zk, commandeOptions) => {
    const { ms, arg, repondre, prefixe, superUser, verifGroupe } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const reservedOwner = await translateText("❌ This command is only allowed to the bot owner", lang);
    const groupsOnly = await translateText("❌ This command is for groups only", ms);
    const typeCommand = await translateText("📌 Type", lang);
    const alreadyBanned = await translateText("❌ This group is already banned", ms);
    const banned = await translateText("✅ Group has been banned", ms);
    const unbanned = await translateText("✅ Group has been unbanned", ms);
    const notBanned = await translateText("❌ This group is not banned", ms);
    const badOption = await translateText("❌ Bad option. Use 'add' or 'del'", ms);

    if (!superUser) {
        return sendFormattedMessage(zk, dest, reservedOwner, ms);
    }
    if (!verifGroupe) {
        return sendFormattedMessage(zk, dest, groupsOnly, ms);
    }
    if (!arg[0]) {
        return sendFormattedMessage(zk, dest, `${typeCommand} ${prefixe}bangroup add/del to ban/unban the group`, ms);
    }

    const groupalreadyBan = await isGroupBanned(dest);

    switch (arg.join(' ')) {
        case 'add':
            if (groupalreadyBan) {
                return sendFormattedMessage(zk, dest, alreadyBanned, ms);
            }
            addGroupToBanList(dest);
            await sendFormattedMessage(zk, dest, banned, ms);
            break;
        case 'del':
            if (groupalreadyBan) {
                removeGroupFromBanList(dest);
                await sendFormattedMessage(zk, dest, unbanned, ms);
            } else {
                await sendFormattedMessage(zk, dest, notBanned, ms);
            }
            break;
        default:
            await sendFormattedMessage(zk, dest, badOption, ms);
            break;
    }
});

// ── Onlyadmin command ─────────────────────────────────────────────
fana({
    nomCom: 'onlyadmin',
    categorie: 'Group',
}, async (dest, zk, commandeOptions) => {
    const { ms, arg, repondre, prefixe, superUser, verifGroupe, verifAdmin } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const groupsOnly = await translateText("❌ This command is for groups only", ms);
    const typeCommand = await translateText("📌 Type", lang);
    const alreadyActive = await translateText("❌ This group is already in onlyadmin mode", ms);
    const activated = await translateText("✅ Onlyadmin mode activated", ms);
    const deactivated = await translateText("✅ Onlyadmin mode deactivated", ms);
    const notActive = await translateText("❌ This group is not in onlyadmin mode", ms);
    const badOption = await translateText("❌ Bad option. Use 'add' or 'del'", ms);
    const notEntitled = await translateText("❌ You are not entitled to this order", ms);

    if (superUser || verifAdmin) {
        if (!verifGroupe) {
            return sendFormattedMessage(zk, dest, groupsOnly, ms);
        }
        if (!arg[0]) {
            return sendFormattedMessage(zk, dest, `${typeCommand} ${prefixe}onlyadmin add/del to activate/deactivate`, ms);
        }

        const groupalreadyBan = await isGroupOnlyAdmin(dest);

        switch (arg.join(' ')) {
            case 'add':
                if (groupalreadyBan) {
                    return sendFormattedMessage(zk, dest, alreadyActive, ms);
                }
                addGroupToOnlyAdminList(dest);
                await sendFormattedMessage(zk, dest, activated, ms);
                break;
            case 'del':
                if (groupalreadyBan) {
                    removeGroupFromOnlyAdminList(dest);
                    await sendFormattedMessage(zk, dest, deactivated, ms);
                } else {
                    await sendFormattedMessage(zk, dest, notActive, ms);
                }
                break;
            default:
                await sendFormattedMessage(zk, dest, badOption, ms);
                break;
        }
    } else {
        await sendFormattedMessage(zk, dest, notEntitled, ms);
    }
});

// ── Sudo command ─────────────────────────────────────────────
fana({
    nomCom: 'sudo',
    categorie: 'Mods',
}, async (dest, zk, commandeOptions) => {
    const { ms, arg, auteurMsgRepondu, msgRepondu, repondre, prefixe, superUser } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const reservedOwner = await translateText("❌ This command is only allowed to the bot owner", ms);
    const mentionPerson = await translateText("📌 Mention the person by typing", ms);
    const alreadySudo = await translateText("❌ This user is already sudo", ms);
    const addedSudo = await translateText("✅ User has been added to sudo list", ms);
    const removedSudo = await translateText("✅ User has been removed from sudo list", ms);
    const notSudo = await translateText("❌ This user is not sudo", ms);
    const badOption = await translateText("❌ Bad option. Use 'add' or 'del'", ms);
    const mentionVictim = await translateText("📌 Mention the victim", ms);

    if (!superUser) {
        return sendFormattedMessage(zk, dest, reservedOwner, ms);
    }
    if (!arg[0]) {
        return sendFormattedMessage(zk, dest, `${mentionPerson} ${prefixe}sudo add/del`, ms);
    }

    if (msgRepondu) {
        switch (arg.join(' ')) {
            case 'add':
                let youaresudo = await issudo(auteurMsgRepondu);
                if (youaresudo) {
                    return sendFormattedMessage(zk, dest, alreadySudo, ms);
                }
                addSudoNumber(auteurMsgRepondu);
                await sendFormattedMessage(zk, dest, addedSudo, ms);
                break;
            case 'del':
                let estsudo = await issudo(auteurMsgRepondu);
                if (estsudo) {
                    removeSudoNumber(auteurMsgRepondu);
                    await sendFormattedMessage(zk, dest, removedSudo, ms);
                } else {
                    await sendFormattedMessage(zk, dest, notSudo, ms);
                }
                break;
            default:
                await sendFormattedMessage(zk, dest, badOption, ms);
                break;
        }
    } else {
        await sendFormattedMessage(zk, dest, mentionVictim, ms);
    }
});

// ── Save command ─────────────────────────────────────────────
fana({ nomCom: "save", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { repondre, msgRepondu, superUser, auteurMessage, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const onlyMods = await translateText("❌ Only mods can use this command", ms);
    const mentionMessage = await translateText("📌 Mention the message that you want to save", ms);
    const saved = await translateText("✅ Message saved successfully", ms);

    if (superUser) {
        if (msgRepondu) {
            console.log(msgRepondu);
            let msg;

            if (msgRepondu.imageMessage) {
                let media = await zk.downloadAndSaveMediaMessage(msgRepondu.imageMessage);
                msg = {
                    image: { url: media },
                    caption: msgRepondu.imageMessage.caption,
                }
            } else if (msgRepondu.videoMessage) {
                let media = await zk.downloadAndSaveMediaMessage(msgRepondu.videoMessage);
                msg = {
                    video: { url: media },
                    caption: msgRepondu.videoMessage.caption,
                }
            } else if (msgRepondu.audioMessage) {
                let media = await zk.downloadAndSaveMediaMessage(msgRepondu.audioMessage);
                msg = {
                    audio: { url: media },
                    mimetype: 'audio/mp4',
                }
            } else if (msgRepondu.stickerMessage) {
                let media = await zk.downloadAndSaveMediaMessage(msgRepondu.stickerMessage);
                let stickerMess = new Sticker(media, {
                    pack: 'NJABULO-MD',
                    type: StickerTypes.CROPPED,
                    categories: ["🤩", "🎉"],
                    id: "12345",
                    quality: 70,
                    background: "transparent",
                });
                const stickerBuffer2 = await stickerMess.toBuffer();
                msg = { sticker: stickerBuffer2 }
            } else {
                msg = { text: msgRepondu.conversation }
            }
            await zk.sendMessage(auteurMessage, msg);
            await sendFormattedMessage(zk, dest, saved, ms);
        } else {
            await sendFormattedMessage(zk, dest, mentionMessage, ms);
        }
    } else {
        await sendFormattedMessage(zk, dest, onlyMods, ms);
    }
});

// ── Mention command ─────────────────────────────────────────────
fana({
    nomCom: 'mention',
    categorie: 'Mods',
}, async (dest, zk, commandeOptions) => {
    const { ms, repondre, superUser, arg } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    const noRights = await translateText("❌ You do not have the rights for this command", ms);
    const instructions = await translateText("📌 To activate or modify the mention; follow this syntax: mention link type message\nThe different types are audio, video, image, and sticker.\nExample: mention https://static.animecorner.me/2023/08/op2.jpg image Hi, my name is popkid", ms);
    const mentionSettings = await translateText("📌 *Mention Settings*", ms);
    const statusText = await translateText("Status:", ms);
    const typeText = await translateText("Type:", ms);
    const linkText = await translateText("Link:", ms);
    const instructionsText = await translateText("*Instructions:*\nTo activate or modify the mention, follow this syntax: mention link type message\nThe different types are audio, video, image, and sticker.\nExample: mention https://static.animecorner.me/2023/08/op2.jpg image Hi, my name is popkid\n\nTo stop the mention, use mention stop", ms);
    const updated = await translateText("✅ Mention updated successfully", ms);
    const stopped = await translateText("✅ Mention stopped", ms);
    const followInstructions = await translateText("📌 Please make sure to follow the instructions", ms);
    const deactivated = await translateText("Deactivated", ms);
    const activated = await translateText("Activated", ms);
    const noData = await translateText("no data", ms);

    if (!superUser) {
        return sendFormattedMessage(zk, dest, noRights, ms);
    }

    const mbdd = require('../bdd/mention');
    let alldata = await mbdd.recupererToutesLesValeurs();
    data = alldata[0];

    if (!arg || arg.length < 1) {
        let etat;
        if (alldata.length === 0) {
            return sendFormattedMessage(zk, dest, instructions, ms);
        }
        if (data.status == 'non') {
            etat = deactivated;
        } else {
            etat = activated;
        }
        mtype = data.type || noData;
        url = data.url || noData;

        let msg = `${mentionSettings}
        
${statusText} ${etat}
${typeText} ${mtype}
${linkText} ${url}

${instructionsText}`;

        await sendFormattedMessage(zk, dest, msg, ms);
        return;
    }

    if (arg.length >= 2) {
        if (arg[0].startsWith('http') && (arg[1] == 'image' || arg[1] == 'audio' || arg[1] == 'video' || arg[1] == 'sticker')) {
            let args = [];
            for (i = 2; i < arg.length; i++) {
                args.push(arg[i]);
            }
            let message = args.join(' ') || '';
            await mbdd.addOrUpdateDataInMention(arg[0], arg[1], message);
            await mbdd.modifierStatusId1('oui');
            await sendFormattedMessage(zk, dest, updated, ms);
        } else {
            await sendFormattedMessage(zk, dest, instructions, ms);
        }
    } else if (arg.length === 1 && arg[0] == 'stop') {
        await mbdd.modifierStatusId1('non');
        await sendFormattedMessage(zk, dest, stopped, ms);
    } else {
        await sendFormattedMessage(zk, dest, followInstructions, ms);
    }
});
