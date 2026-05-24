const { fana } = require("../njabulo/fana")
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { ajouterOuMettreAJourJid, mettreAJourAction, verifierEtatJid } = require("../bdd/antilien")
const { atbajouterOuMettreAJourJid, atbverifierEtatJid } = require("../bdd/antibot")
const { search, download } = require("aptoide-scraper");
const fs = require("fs-extra");
const config = require("../set");
const { default: axios } = require('axios');

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

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
    await zk.sendMessage(
        chatId,
        {
            interactiveMessage: {
                header: { title: "NJABULO MD", hasMediaAttachment: true, imageMessage: { url: randomNjabulourl } },
                body: text,
                buttons,
                headerType: 1
            }
        },
        { quoted: ms }
    );
}

// ── Tag‑all command ─────────────────────────────────────────────
fana(
    { nomCom: "tagall", categorie: "Group", reaction: "🚨" },
    async (dest, zk, commandeOptions) => {
        const {
            ms,
            repondre,
            arg,
            verifGroupe,
            nomGroupe,
            infosGroupe,
            nomAuteurMessage,
            verifAdmin,
            superUser,
        } = commandeOptions;

        if (!verifGroupe) {
            return await sendFormattedMessage(zk, dest, "❌ This command is reserved for groups", ms);
        }

        let mess = arg.join(" ") || "Aucun Message";
        let membresGroupe = verifGroupe ? await infosGroupe.participants : "";
        let tag = `*Group* : *${nomGroupe}* \n*Message* : *${mess}*\n\n`;
        let emoji = ["> ᴅᴇᴀʀ😡"];
        let random = Math.floor(Math.random() * emoji.length);

        for (const membre of membresGroupe) {
            tag += `${emoji[random]} @${membre.id.split("@")[0]}\n`;
        }

        if (verifAdmin || superUser) {
            await sendFormattedMessage(zk, dest, tag, ms);
        } else {
            await sendFormattedMessage(zk, dest, "❌ Command reserved for admins", ms);
        }
    }
);

// ── Promote command ─────────────────────────────────────────────
fana({ nomCom: "promote", categorie: 'Group', reaction: "👨🏿‍💼" }, async (dest, zk, commandeOptions) => {
    let { repondre, msgRepondu, infosGroupe, auteurMsgRepondu, verifGroupe, auteurMessage, superUser, idBot, ms } = commandeOptions;
    let membresGroupe = verifGroupe ? await infosGroupe.participants : ""
    if (!verifGroupe) { return await sendFormattedMessage(zk, dest, "❌ For groups only", ms); }
    const memberAdmin = (membres) => {
        let admin = [];
        for (m of membres) {
            if (m.admin !== null) admin.push(m.id);
        }
        return admin;
    }
    const admins = verifGroupe ? memberAdmin(membresGroupe) : '';
    let autAdmin = verifGroupe ? admins.includes(auteurMessage) : false;
    let zkad = verifGroupe ? admins.includes(idBot) : false;
    let isMember = membresGroupe.some(m => m.id === auteurMsgRepondu);
    let alreadyAdmin = admins.includes(auteurMsgRepondu);
    try {
        if (autAdmin || superUser) {
            if (msgRepondu) {
                if (zkad) {
                    if (isMember) {
                        if (alreadyAdmin) {
                            return await sendFormattedMessage(zk, dest, "❌ This member is already an administrator of the group.", ms);
                        }
                        var txt = `🎊 @${auteurMsgRepondu.split("@")[0]} rose in rank. He/she has been named group administrator.`
                        await zk.groupParticipantsUpdate(dest, [auteurMsgRepondu], "promote");
                        await sendFormattedMessage(zk, dest, txt, ms);
                    } else { return await sendFormattedMessage(zk, dest, "❌ This user is not part of the group.", ms); }
                } else { return await sendFormattedMessage(zk, dest, "❌ I need admin rights to promote members.", ms); }
            } else { await sendFormattedMessage(zk, dest, "❌ Please tag the member to be promoted.", ms); }
        } else { return await sendFormattedMessage(zk, dest, "❌ You are not an administrator of the group.", ms); }
    } catch (e) { await sendFormattedMessage(zk, dest, "❌ Error: " + e.message, ms); }
});

// ── Demote command ─────────────────────────────────────────────
fana({ nomCom: "demote", categorie: 'Group', reaction: "👨🏿‍💼" }, async (dest, zk, commandeOptions) => {
    let { repondre, msgRepondu, infosGroupe, auteurMsgRepondu, verifGroupe, auteurMessage, superUser, idBot, ms } = commandeOptions;
    let membresGroupe = verifGroupe ? await infosGroupe.participants : ""
    if (!verifGroupe) { return await sendFormattedMessage(zk, dest, "❌ For groups only", ms); }
    const memberAdmin = (membres) => {
        let admin = [];
        for (m of membres) {
            if (m.admin !== null) admin.push(m.id);
        }
        return admin;
    }
    const admins = verifGroupe ? memberAdmin(membresGroupe) : '';
    let autAdmin = verifGroupe ? admins.includes(auteurMessage) : false;
    let zkad = verifGroupe ? admins.includes(idBot) : false;
    let isMember = membresGroupe.some(m => m.id === auteurMsgRepondu);
    let isAdmin = admins.includes(auteurMsgRepondu);
    try {
        if (autAdmin || superUser) {
            if (msgRepondu) {
                if (zkad) {
                    if (isMember) {
                        if (!isAdmin) {
                            return await sendFormattedMessage(zk, dest, "❌ This member is not a group administrator.", ms);
                        }
                        var txt = `📛 @${auteurMsgRepondu.split("@")[0]} was removed from his position as a group administrator`
                        await zk.groupParticipantsUpdate(dest, [auteurMsgRepondu], "demote");
                        await sendFormattedMessage(zk, dest, txt, ms);
                    } else { return await sendFormattedMessage(zk, dest, "❌ This user is not part of the group.", ms); }
                } else { return await sendFormattedMessage(zk, dest, "❌ I need admin rights to demote members.", ms); }
            } else { await sendFormattedMessage(zk, dest, "❌ Please tag the member to be demoted.", ms); }
        } else { return await sendFormattedMessage(zk, dest, "❌ You are not an administrator of the group.", ms); }
    } catch (e) { await sendFormattedMessage(zk, dest, "❌ Error: " + e.message, ms); }
});

// ── Remove command ─────────────────────────────────────────────
fana({ nomCom: "remove", categorie: 'Group', reaction: "👨🏿‍💼" }, async (dest, zk, commandeOptions) => {
    let { repondre, msgRepondu, infosGroupe, auteurMsgRepondu, verifGroupe, nomAuteurMessage, auteurMessage, superUser, idBot, ms } = commandeOptions;
    let membresGroupe = verifGroupe ? await infosGroupe.participants : ""
    if (!verifGroupe) { return await sendFormattedMessage(zk, dest, "❌ For groups only", ms); }
    const memberAdmin = (membres) => {
        let admin = [];
        for (m of membres) {
            if (m.admin !== null) admin.push(m.id);
        }
        return admin;
    }
    const admins = verifGroupe ? memberAdmin(membresGroupe) : '';
    let autAdmin = verifGroupe ? admins.includes(auteurMessage) : false;
    let zkad = verifGroupe ? admins.includes(idBot) : false;
    let isMember = membresGroupe.some(m => m.id === auteurMsgRepondu);
    try {
        if (autAdmin || superUser) {
            if (msgRepondu) {
                if (zkad) {
                    if (isMember) {
                        var txt = `🚫 @${auteurMsgRepondu.split("@")[0]} was removed from the group.`
                        await zk.groupParticipantsUpdate(dest, [auteurMsgRepondu], "remove");
                        await sendFormattedMessage(zk, dest, txt, ms);
                    } else { return await sendFormattedMessage(zk, dest, "❌ This user is not part of the group.", ms); }
                } else { return await sendFormattedMessage(zk, dest, "❌ I need admin rights to remove members.", ms); }
            } else { await sendFormattedMessage(zk, dest, "❌ Please tag the member to be removed.", ms); }
        } else { return await sendFormattedMessage(zk, dest, "❌ You are not an administrator of the group.", ms); }
    } catch (e) { await sendFormattedMessage(zk, dest, "❌ Error: " + e.message, ms); }
});

// ── Delete command ─────────────────────────────────────────────
fana({ nomCom: "delete", categorie: 'Group', reaction: "🧹" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, verifGroupe, auteurMsgRepondu, idBot, msgRepondu, verifAdmin, superUser } = commandeOptions;
    if (!msgRepondu) {
        await sendFormattedMessage(zk, dest, "❌ Please reply to the message to delete.", ms);
        return;
    }
    if (superUser && auteurMsgRepondu == idBot) {
        const key = {
            remoteJid: dest,
            fromMe: true,
            id: ms.message.extendedTextMessage.contextInfo.stanzaId,
        }
        await zk.sendMessage(dest, { delete: key });
        await sendFormattedMessage(zk, dest, "✅ Message deleted successfully.", ms);
        return;
    }
    if (verifGroupe) {
        if (verifAdmin || superUser) {
            try {
                const key = {
                    remoteJid: dest,
                    id: ms.message.extendedTextMessage.contextInfo.stanzaId,
                    fromMe: false,
                    participant: ms.message.extendedTextMessage.contextInfo.participant
                }
                await zk.sendMessage(dest, { delete: key });
                await sendFormattedMessage(zk, dest, "✅ Message deleted successfully.", ms);
            } catch (e) {
                await sendFormattedMessage(zk, dest, "❌ I need admin rights to delete messages.", ms);
            }
        } else {
            await sendFormattedMessage(zk, dest, "❌ Sorry, you are not an administrator of the group.", ms);
        }
    }
});

// ── Info command ─────────────────────────────────────────────
fana({ nomCom: "info", categorie: 'Group' }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, verifGroupe } = commandeOptions;
    if (!verifGroupe) { await sendFormattedMessage(zk, dest, "❌ This command is reserved for groups only", ms); return };
    try { ppgroup = await zk.profilePictureUrl(dest, 'image'); } catch { ppgroup = "https://i.imgur.com/4M6Y6qT.png" }
    const info = await zk.groupMetadata(dest)
    let message = `*━━━━『Group Info』━━━━*\n\n*🎐Name:* ${info.subject}\n\n*🔩Group ID:* ${dest}\n\n*🔍Description:* \n${info.desc}\n\n*👥Members:* ${info.participants.length}\n\n> NJABULO MD`
    await sendFormattedMessage(zk, dest, message, ms);
});

// ── AntiLink command ─────────────────────────────────────────────
fana({ nomCom: "antilink", categorie: 'Group', reaction: "🔗" }, async (dest, zk, commandeOptions) => {
    var { repondre, arg, verifGroupe, superUser, verifAdmin, ms } = commandeOptions;
    if (!verifGroupe) {
        return await sendFormattedMessage(zk, dest, "❌ For groups only", ms);
    }
    if (superUser || verifAdmin) {
        const enetatoui = await verifierEtatJid(dest)
        try {
            if (!arg || !arg[0] || arg === ' ') {
                await sendFormattedMessage(zk, dest, "📌 *ANTILINK COMMANDS*\n\nantilink on - Activate anti-link\nantilink off - Deactivate anti-link\nantilink action/remove - Remove user\nantilink action/warn - Give warning\nantilink action/delete - Delete link only", ms);
                return;
            };
            if (arg[0] === 'on') {
                if (enetatoui) {
                    await sendFormattedMessage(zk, dest, "❌ Anti-link is already activated for this group", ms);
                } else {
                    await ajouterOuMettreAJourJid(dest, "oui");
                    await sendFormattedMessage(zk, dest, "✅ Anti-link activated successfully", ms);
                }
            } else if (arg[0] === "off") {
                if (enetatoui) {
                    await ajouterOuMettreAJourJid(dest, "non");
                    await sendFormattedMessage(zk, dest, "✅ Anti-link deactivated successfully", ms);
                } else {
                    await sendFormattedMessage(zk, dest, "❌ Anti-link is not activated for this group", ms);
                }
            } else if (arg.join('').split("/")[0] === 'action') {
                let action = (arg.join('').split("/")[1]).toLowerCase();
                if (action == 'remove' || action == 'warn' || action == 'delete') {
                    await mettreAJourAction(dest, action);
                    await sendFormattedMessage(zk, dest, `✅ Anti-link action updated to: ${action}`, ms);
                } else {
                    await sendFormattedMessage(zk, dest, "❌ Available actions: warn, remove, delete", ms);
                }
            } else await sendFormattedMessage(zk, dest, "📌 Invalid command. Use antilink on/off or antilink action/remove/warn/delete", ms);
        } catch (error) {
            await sendFormattedMessage(zk, dest, "❌ Error: " + error.message, ms);
        }
    } else {
        await sendFormattedMessage(zk, dest, "❌ You are not authorized to use this command", ms);
    }
});

// ── AntiBot command ─────────────────────────────────────────────
fana({ nomCom: "antibot", categorie: 'Group', reaction: "😬" }, async (dest, zk, commandeOptions) => {
    var { repondre, arg, verifGroupe, superUser, verifAdmin, ms } = commandeOptions;
    if (!verifGroupe) {
        return await sendFormattedMessage(zk, dest, "❌ For groups only", ms);
    }
    if (superUser || verifAdmin) {
        const enetatoui = await atbverifierEtatJid(dest)
        try {
            if (!arg || !arg[0] || arg === ' ') {
                await sendFormattedMessage(zk, dest, "📌 *ANTIBOT COMMANDS*\n\nantibot on - Activate anti-bot\nantibot off - Deactivate anti-bot\nantibot action/remove - Remove bot\nantibot action/warn - Give warning\nantibot action/delete - Delete message only", ms);
                return;
            };
            if (arg[0] === 'on') {
                if (enetatoui) {
                    await sendFormattedMessage(zk, dest, "❌ Anti-bot is already activated for this group", ms);
                } else {
                    await atbajouterOuMettreAJourJid(dest, "oui");
                    await sendFormattedMessage(zk, dest, "✅ Anti-bot activated successfully", ms);
                }
            } else if (arg[0] === "off") {
                if (enetatoui) {
                    await atbajouterOuMettreAJourJid(dest, "non");
                    await sendFormattedMessage(zk, dest, "✅ Anti-bot deactivated successfully", ms);
                } else {
                    await sendFormattedMessage(zk, dest, "❌ Anti-bot is not activated for this group", ms);
                }
            } else if (arg.join('').split("/")[0] === 'action') {
                let action = (arg.join('').split("/")[1]).toLowerCase();
                if (action == 'remove' || action == 'warn' || action == 'delete') {
                    await mettreAJourAction(dest, action);
                    await sendFormattedMessage(zk, dest, `✅ Anti-bot action updated to: ${action}`, ms);
                } else {
                    await sendFormattedMessage(zk, dest, "❌ Available actions: warn, remove, delete", ms);
                }
            } else {
                await sendFormattedMessage(zk, dest, "📌 Invalid command. Use antibot on/off or antibot action/remove/warn/delete", ms);
            }
        } catch (error) {
            await sendFormattedMessage(zk, dest, "❌ Error: " + error.message, ms);
        }
    } else {
        await sendFormattedMessage(zk, dest, "❌ You are not authorized to use this command", ms);
    }
});

// ── Group open/close command ─────────────────────────────────────────────
fana({ nomCom: "group", categorie: 'Group' }, async (dest, zk, commandeOptions) => {
    const { repondre, verifGroupe, verifAdmin, superUser, arg, ms } = commandeOptions;
    if (!verifGroupe) { await sendFormattedMessage(zk, dest, "❌ This command is reserved for groups only", ms); return };
    if (superUser || verifAdmin) {
        if (!arg[0]) { await sendFormattedMessage(zk, dest, "📌 Instructions:\n\n.group open - Open group\n.group close - Close group", ms); return; }
        const option = arg.join(' ')
        switch (option) {
            case "open":
                await zk.groupSettingUpdate(dest, 'not_announcement')
                await sendFormattedMessage(zk, dest, "✅ Group opened successfully", ms);
                break;
            case "close":
                await zk.groupSettingUpdate(dest, 'announcement');
                await sendFormattedMessage(zk, dest, "✅ Group closed successfully", ms);
                break;
            default: await sendFormattedMessage(zk, dest, "❌ Invalid option. Use 'open' or 'close'", ms);
        }
    } else {
        await sendFormattedMessage(zk, dest, "❌ This command is reserved for admins", ms);
        return;
    }
});

// ── Leave group command ─────────────────────────────────────────────
fana({ nomCom: "left", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { repondre, verifGroupe, superUser, ms } = commandeOptions;
    if (!verifGroupe) { await sendFormattedMessage(zk, dest, "❌ This command is reserved for groups", ms); return };
    if (!superUser) {
        await sendFormattedMessage(zk, dest, "❌ This command is reserved for the bot owner", ms);
        return;
    }
    await sendFormattedMessage(zk, dest, "👋 Goodbye! Sayonara!", ms);
    zk.groupLeave(dest)
});

// ── Change group name command ─────────────────────────────────────────────
fana({ nomCom: "gname", categorie: 'Group' }, async (dest, zk, commandeOptions) => {
    const { arg, repondre, verifAdmin, ms } = commandeOptions;
    if (!verifAdmin) {
        await sendFormattedMessage(zk, dest, "❌ This command is reserved for group admins", ms);
        return;
    };
    if (!arg[0]) {
        await sendFormattedMessage(zk, dest, "❌ Please enter the group name", ms);
        return;
    };
    const nom = arg.join(' ')
    await zk.groupUpdateSubject(dest, nom);
    await sendFormattedMessage(zk, dest, `✅ Group name updated to: *${nom}*`, ms)
});

// ── Change group description command ─────────────────────────────────────────────
fana({ nomCom: "gdesc", categorie: 'Group' }, async (dest, zk, commandeOptions) => {
    const { arg, repondre, verifAdmin, ms } = commandeOptions;
    if (!verifAdmin) {
        await sendFormattedMessage(zk, dest, "❌ This command is reserved for group admins", ms);
        return;
    };
    if (!arg[0]) {
        await sendFormattedMessage(zk, dest, "❌ Please enter the group description", ms);
        return;
    };
    const nom = arg.join(' ')
    await zk.groupUpdateDescription(dest, nom);
    await sendFormattedMessage(zk, dest, `✅ Group description updated to: *${nom}*`, ms)
});

// ── Change group profile picture command ─────────────────────────────────────────────
fana({ nomCom: "gpp", categorie: 'Group' }, async (dest, zk, commandeOptions) => {
    const { repondre, msgRepondu, verifAdmin, ms } = commandeOptions;
    if (!verifAdmin) {
        await sendFormattedMessage(zk, dest, "❌ This command is reserved for group admins", ms);
        return;
    };
    if (msgRepondu && msgRepondu.imageMessage) {
        const pp = await zk.downloadAndSaveMediaMessage(msgRepondu.imageMessage);
        await zk.updateProfilePicture(dest, { url: pp })
            .then(async () => {
                await sendFormattedMessage(zk, dest, "✅ Group profile picture changed successfully", ms);
                fs.unlinkSync(pp);
            }).catch(async () => await sendFormattedMessage(zk, dest, "❌ Error changing group picture", ms));
    } else {
        await sendFormattedMessage(zk, dest, "❌ Please reply with an image", ms);
    }
});

// ── Hide tag command ─────────────────────────────────────────────
fana({ nomCom: "hidetag", categorie: 'Group', reaction: "🎤" }, async (dest, zk, commandeOptions) => {
    const { repondre, msgRepondu, verifGroupe, arg, verifAdmin, superUser, ms } = commandeOptions;
    if (!verifGroupe) {
        await sendFormattedMessage(zk, dest, "❌ This command is only allowed in groups", ms);
        return;
    }
    if (verifAdmin || superUser) {
        let metadata = await zk.groupMetadata(dest);
        let tag = [];
        for (const participant of metadata.participants) {
            tag.push(participant.id);
        }
        let messageText = arg && arg.length > 0 ? arg.join(" ") : "No message";
        await zk.sendMessage(dest, { text: messageText, mentions: tag });
    } else {
        await sendFormattedMessage(zk, dest, "❌ This command is reserved for group admins", ms);
    }
});
