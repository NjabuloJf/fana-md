const { fana } = require('../njabulo/fana');
const axios = require("axios");
let { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
const { isUserBanned, addUserToBanList, removeUserFromBanList } = require("../bdd/banUser");
const { addGroupToBanList, isGroupBanned, removeGroupFromBanList } = require("../bdd/banGroup");
const { isGroupOnlyAdmin, addGroupToOnlyAdminList, removeGroupFromOnlyAdminList } = require("../bdd/onlyAdmin");
const { removeSudoNumber, addSudoNumber, issudo } = require("../bdd/sudo");
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

// ── Base button definition ────────────────────────────────────────
const buttons = [
    {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
            display_text: "🌐 WA Channel",
            id: "backup channel",
            url: config.GURL,
        }),
    },
];

// ── Helper that sends an interactive message with buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
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

    if (!superUser) {
        return sendFormattedMessage(zk, dest, "❌ Only Mods can use this command", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, dest, "📌 Put a telegram sticker link", ms);
    }

    let lien = arg.join(' ');
    let name = lien.split('/addstickers/')[1];

    let api = 'https://api.telegram.org/bot891038791:AAHWB1dQd-vi0IbH2NjKYUk-hqQ8rQuzPD4/getStickerSet?name=' + encodeURIComponent(name);

    try {
        let stickers = await axios.get(api);

        let type = null;
        if (stickers.data.result.is_animated === true || stickers.data.result.is_video === true) {
            type = 'animated sticker';
        } else {
            type = 'not animated sticker';
        }

        let msg = `🎨 *Telegram Sticker Downloader*
        
📛 *Name:* ${stickers.data.result.name}
📌 *Type:* ${type}
📊 *Length:* ${(stickers.data.result.stickers).length}

⏳ Downloading...`;

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
        await sendFormattedMessage(zk, dest, "❌ Error downloading stickers", ms);
    }
});

// ── Crew command ─────────────────────────────────────────────
fana({ nomCom: "crew", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, arg, auteurMessage, superUser, auteurMsgRepondu, msgRepondu } = commandeOptions;

    if (!superUser) {
        return sendFormattedMessage(zk, dest, "❌ Only mods can use this command", ms);
    }
    if (!arg[0]) {
        return sendFormattedMessage(zk, dest, "📌 Please enter the name of the group to create", ms);
    }
    if (!msgRepondu) {
        return sendFormattedMessage(zk, dest, "📌 Please mention a member to add", ms);
    }

    const name = arg.join(" ");
    const group = await zk.groupCreate(name, [auteurMessage, auteurMsgRepondu]);
    console.log("created group with id: " + group.gid);
    await sendFormattedMessage(zk, group.id, `🎉 Welcome to ${name}`, ms);
});

// ── Leave command ─────────────────────────────────────────────
fana({ nomCom: "leave", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, verifGroupe, superUser } = commandeOptions;
    
    if (!verifGroupe) {
        return sendFormattedMessage(zk, dest, "❌ Group only", ms);
    }
    if (!superUser) {
        return sendFormattedMessage(zk, dest, "❌ Command reserved for the owner", ms);
    }
    await zk.groupLeave(dest);
    await sendFormattedMessage(zk, dest, "👋 Goodbye!", ms);
});

// ── Join command ─────────────────────────────────────────────
fana({ nomCom: "join", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { arg, ms, repondre, superUser } = commandeOptions;

    if (!superUser) {
        return sendFormattedMessage(zk, dest, "❌ Command reserved for the bot owner", ms);
    }
    let result = arg[0].split('https://chat.whatsapp.com/')[1];
    await zk.groupAcceptInvite(result);
    await sendFormattedMessage(zk, dest, "✅ Successfully joined the group", ms);
});

// ── Jid command ─────────────────────────────────────────────
fana({ nomCom: "jid", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, msgRepondu, superUser, auteurMsgRepondu } = commandeOptions;

    if (!superUser) {
        return sendFormattedMessage(zk, dest, "❌ Command reserved for the bot owner", ms);
    }
    let jid = msgRepondu ? auteurMsgRepondu : dest;
    await sendFormattedMessage(zk, dest, `📌 JID: ${jid}`, ms);
});

// ── Block command ─────────────────────────────────────────────
fana({ nomCom: "block", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, verifGroupe, msgRepondu, superUser, auteurMsgRepondu } = commandeOptions;

    if (!superUser) {
        return sendFormattedMessage(zk, dest, "❌ Command reserved for the bot owner", ms);
    }
    let jid = msgRepondu ? auteurMsgRepondu : dest;
    if (!msgRepondu && verifGroupe) {
        return sendFormattedMessage(zk, dest, "📌 Be sure to mention the person to block", ms);
    }
    await zk.updateBlockStatus(jid, "block");
    await sendFormattedMessage(zk, dest, "✅ User blocked successfully", ms);
});

// ── Unblock command ─────────────────────────────────────────────
fana({ nomCom: "unblock", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, verifGroupe, msgRepondu, superUser, auteurMsgRepondu } = commandeOptions;

    if (!superUser) {
        return sendFormattedMessage(zk, dest, "❌ Command reserved for the bot owner", ms);
    }
    let jid = msgRepondu ? auteurMsgRepondu : dest;
    if (!msgRepondu && verifGroupe) {
        return sendFormattedMessage(zk, dest, "📌 Please mention the person to unblock", ms);
    }
    await zk.updateBlockStatus(jid, "unblock");
    await sendFormattedMessage(zk, dest, "✅ User unblocked successfully", ms);
});

// ── Autoll command (Remove non-admin members) ─────────────────────────────
fana({ nomCom: "autoll", categorie: 'Group', reaction: "📣" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, verifGroupe, infosGroupe, superUser } = commandeOptions;
    const metadata = await zk.groupMetadata(dest);

    if (!verifGroupe) {
        return sendFormattedMessage(zk, dest, "❌ This command is reserved for groups", ms);
    }
    if (superUser || auteurMessage == metadata.owner) {
        await sendFormattedMessage(zk, dest, "⚠️ Non-admin members will be removed from the group. You have 5 seconds to cancel.", ms);
        await sleep(5000);
        let membresGroupe = verifGroupe ? await infosGroupe.participants : "";
        try {
            let users = membresGroupe.filter((member) => !member.admin);
            for (const membre of users) {
                await zk.groupParticipantsUpdate(dest, [membre.id], "remove");
                await sleep(500);
            }
            await sendFormattedMessage(zk, dest, "✅ All non-admin members have been removed", ms);
        } catch (e) {
            await sendFormattedMessage(zk, dest, "❌ I need administration rights", ms);
        }
    } else {
        await sendFormattedMessage(zk, dest, "❌ Order reserved for the group owner", ms);
    }
});

// ── Ban command ─────────────────────────────────────────────
fana({
    nomCom: 'ban',
    categorie: 'Mods',
}, async (dest, zk, commandeOptions) => {
    const { ms, arg, auteurMsgRepondu, msgRepondu, repondre, prefixe, superUser } = commandeOptions;

    if (!superUser) {
        return sendFormattedMessage(zk, dest, "❌ This command is only allowed to the bot owner", ms);
    }
    if (!arg[0]) {
        return sendFormattedMessage(zk, dest, `📌 Mention the victim by typing ${prefixe}ban add/del to ban/unban`, ms);
    }

    if (msgRepondu) {
        switch (arg.join(' ')) {
            case 'add':
                let youareban = await isUserBanned(auteurMsgRepondu);
                if (youareban) {
                    return sendFormattedMessage(zk, dest, "❌ This user is already banned", ms);
                }
                addUserToBanList(auteurMsgRepondu);
                await sendFormattedMessage(zk, dest, "✅ User has been banned", ms);
                break;
            case 'del':
                let estbanni = await isUserBanned(auteurMsgRepondu);
                if (estbanni) {
                    removeUserFromBanList(auteurMsgRepondu);
                    await sendFormattedMessage(zk, dest, "✅ User has been unbanned", ms);
                } else {
                    await sendFormattedMessage(zk, dest, "❌ This user is not banned", ms);
                }
                break;
            default:
                await sendFormattedMessage(zk, dest, "❌ Bad option. Use 'add' or 'del'", ms);
                break;
        }
    } else {
        await sendFormattedMessage(zk, dest, "📌 Mention the victim", ms);
    }
});

// ── Bangroup command ─────────────────────────────────────────────
fana({
    nomCom: 'bangroup',
    categorie: 'Mods',
}, async (dest, zk, commandeOptions) => {
    const { ms, arg, repondre, prefixe, superUser, verifGroupe } = commandeOptions;

    if (!superUser) {
        return sendFormattedMessage(zk, dest, "❌ This command is only allowed to the bot owner", ms);
    }
    if (!verifGroupe) {
        return sendFormattedMessage(zk, dest, "❌ This command is for groups only", ms);
    }
    if (!arg[0]) {
        return sendFormattedMessage(zk, dest, `📌 Type ${prefixe}bangroup add/del to ban/unban the group`, ms);
    }

    const groupalreadyBan = await isGroupBanned(dest);

    switch (arg.join(' ')) {
        case 'add':
            if (groupalreadyBan) {
                return sendFormattedMessage(zk, dest, "❌ This group is already banned", ms);
            }
            addGroupToBanList(dest);
            await sendFormattedMessage(zk, dest, "✅ Group has been banned", ms);
            break;
        case 'del':
            if (groupalreadyBan) {
                removeGroupFromBanList(dest);
                await sendFormattedMessage(zk, dest, "✅ Group has been unbanned", ms);
            } else {
                await sendFormattedMessage(zk, dest, "❌ This group is not banned", ms);
            }
            break;
        default:
            await sendFormattedMessage(zk, dest, "❌ Bad option. Use 'add' or 'del'", ms);
            break;
    }
});

// ── Onlyadmin command ─────────────────────────────────────────────
fana({
    nomCom: 'onlyadmin',
    categorie: 'Group',
}, async (dest, zk, commandeOptions) => {
    const { ms, arg, repondre, prefixe, superUser, verifGroupe, verifAdmin } = commandeOptions;

    if (superUser || verifAdmin) {
        if (!verifGroupe) {
            return sendFormattedMessage(zk, dest, "❌ This command is for groups only", ms);
        }
        if (!arg[0]) {
            return sendFormattedMessage(zk, dest, `📌 Type ${prefixe}onlyadmin add/del to activate/deactivate`, ms);
        }

        const groupalreadyBan = await isGroupOnlyAdmin(dest);

        switch (arg.join(' ')) {
            case 'add':
                if (groupalreadyBan) {
                    return sendFormattedMessage(zk, dest, "❌ This group is already in onlyadmin mode", ms);
                }
                addGroupToOnlyAdminList(dest);
                await sendFormattedMessage(zk, dest, "✅ Onlyadmin mode activated", ms);
                break;
            case 'del':
                if (groupalreadyBan) {
                    removeGroupFromOnlyAdminList(dest);
                    await sendFormattedMessage(zk, dest, "✅ Onlyadmin mode deactivated", ms);
                } else {
                    await sendFormattedMessage(zk, dest, "❌ This group is not in onlyadmin mode", ms);
                }
                break;
            default:
                await sendFormattedMessage(zk, dest, "❌ Bad option. Use 'add' or 'del'", ms);
                break;
        }
    } else {
        await sendFormattedMessage(zk, dest, "❌ You are not entitled to this order", ms);
    }
});

// ── Sudo command ─────────────────────────────────────────────
fana({
    nomCom: 'sudo',
    categorie: 'Mods',
}, async (dest, zk, commandeOptions) => {
    const { ms, arg, auteurMsgRepondu, msgRepondu, repondre, prefixe, superUser } = commandeOptions;

    if (!superUser) {
        return sendFormattedMessage(zk, dest, "❌ This command is only allowed to the bot owner", ms);
    }
    if (!arg[0]) {
        return sendFormattedMessage(zk, dest, `📌 Mention the person by typing ${prefixe}sudo add/del`, ms);
    }

    if (msgRepondu) {
        switch (arg.join(' ')) {
            case 'add':
                let youaresudo = await issudo(auteurMsgRepondu);
                if (youaresudo) {
                    return sendFormattedMessage(zk, dest, "❌ This user is already sudo", ms);
                }
                addSudoNumber(auteurMsgRepondu);
                await sendFormattedMessage(zk, dest, "✅ User has been added to sudo list", ms);
                break;
            case 'del':
                let estsudo = await issudo(auteurMsgRepondu);
                if (estsudo) {
                    removeSudoNumber(auteurMsgRepondu);
                    await sendFormattedMessage(zk, dest, "✅ User has been removed from sudo list", ms);
                } else {
                    await sendFormattedMessage(zk, dest, "❌ This user is not sudo", ms);
                }
                break;
            default:
                await sendFormattedMessage(zk, dest, "❌ Bad option. Use 'add' or 'del'", ms);
                break;
        }
    } else {
        await sendFormattedMessage(zk, dest, "📌 Mention the victim", ms);
    }
});

// ── Save command ─────────────────────────────────────────────
fana({ nomCom: "save", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { repondre, msgRepondu, superUser, auteurMessage, ms } = commandeOptions;

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
            await sendFormattedMessage(zk, dest, "✅ Message saved successfully", ms);
        } else {
            await sendFormattedMessage(zk, dest, "📌 Mention the message that you want to save", ms);
        }
    } else {
        await sendFormattedMessage(zk, dest, "❌ Only mods can use this command", ms);
    }
});

// ── Mention command ─────────────────────────────────────────────
fana({
    nomCom: 'mention',
    categorie: 'Mods',
}, async (dest, zk, commandeOptions) => {
    const { ms, repondre, superUser, arg } = commandeOptions;

    if (!superUser) {
        return sendFormattedMessage(zk, dest, "❌ You do not have the rights for this command", ms);
    }

    const mbdd = require('../bdd/mention');
    let alldata = await mbdd.recupererToutesLesValeurs();
    data = alldata[0];

    if (!arg || arg.length < 1) {
        let etat;
        if (alldata.length === 0) {
            return sendFormattedMessage(zk, dest, `📌 To activate or modify the mention; follow this syntax: mention link type message
The different types are audio, video, image, and sticker.
Example: mention https://static.animecorner.me/2023/08/op2.jpg image Hi, my name is popkid`, ms);
        }
        if (data.status == 'non') {
            etat = 'Deactivated';
        } else {
            etat = 'Activated';
        }
        mtype = data.type || 'no data';
        url = data.url || 'no data';

        let msg = `📌 *Mention Settings*
        
Status: ${etat}
Type: ${mtype}
Link: ${url}

*Instructions:*
To activate or modify the mention, follow this syntax: mention link type message
The different types are audio, video, image, and sticker.
Example: mention https://static.animecorner.me/2023/08/op2.jpg image Hi, my name is popkid

To stop the mention, use mention stop`;

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
            await sendFormattedMessage(zk, dest, "✅ Mention updated successfully", ms);
        } else {
            await sendFormattedMessage(zk, dest, `📌 *Instructions:* To activate or modify the mention, follow this syntax: mention link type message. The different types are audio, video, image, and sticker.`, ms);
        }
    } else if (arg.length === 1 && arg[0] == 'stop') {
        await mbdd.modifierStatusId1('non');
        await sendFormattedMessage(zk, dest, "✅ Mention stopped", ms);
    } else {
        await sendFormattedMessage(zk, dest, "📌 Please make sure to follow the instructions", ms);
    }
});
