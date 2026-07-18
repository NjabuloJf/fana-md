const { fana } = require("../njabulo/fana");
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { ajouterOuMettreAJourJid, mettreAJourAction, verifierEtatJid } = require("../bdd/antilien");
const { atbajouterOuMettreAJourJid, atbverifierEtatJid } = require("../bdd/antibot");
const { search, download } = require("aptoide-scraper");
const fs = require("fs-extra");
const config = require("../set");
const { default: axios } = require('axios');

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
    return await translateText("🌐 Channel", lang);
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

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
    const buttons = await getButtons();
    await zk.sendMessage(
        chatId,
        {
            interactiveMessage: {
                image: { url: randomNjabulourl },
                header: text,
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

        const lang = config.LANGUAGE || "en";
        const reservedGroups = await translateText("❌ This command is reserved for groups", lang);
        const reservedAdmins = await translateText("❌ Command reserved for admins", lang);

        if (!verifGroupe) {
            return await sendFormattedMessage(zk, dest, reservedGroups, ms);
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
            await sendFormattedMessage(zk, dest, reservedAdmins, ms);
        }
    }
);

// ── Promote command ─────────────────────────────────────────────
fana({ nomCom: "promote", categorie: 'Group', reaction: "👨🏿‍💼" }, async (dest, zk, commandeOptions) => {
    let { repondre, msgRepondu, infosGroupe, auteurMsgRepondu, verifGroupe, auteurMessage, superUser, idBot, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    
    const groupsOnly = await translateText("❌ For groups only", lang);
    const alreadyAdmin = await translateText("❌ This member is already an administrator of the group.", lang);
    const notMember = await translateText("❌ This user is not part of the group.", lang);
    const needAdminRights = await translateText("❌ I need admin rights to promote members.", lang);
    const tagMember = await translateText("❌ Please tag the member to be promoted.", lang);
    const notAdmin = await translateText("❌ You are not an administrator of the group.", lang);
    const errorMsg = await translateText("❌ Error:", lang);
    const promoted = await translateText("rose in rank. He/she has been named group administrator.", lang);

    let membresGroupe = verifGroupe ? await infosGroupe.participants : "";
    if (!verifGroupe) { return await sendFormattedMessage(zk, dest, groupsOnly, ms); }
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
    let alreadyAdminCheck = admins.includes(auteurMsgRepondu);
    try {
        if (autAdmin || superUser) {
            if (msgRepondu) {
                if (zkad) {
                    if (isMember) {
                        if (alreadyAdminCheck) {
                            return await sendFormattedMessage(zk, dest, alreadyAdmin, ms);
                        }
                        var txt = `🎊 @${auteurMsgRepondu.split("@")[0]} ${promoted}`;
                        await zk.groupParticipantsUpdate(dest, [auteurMsgRepondu], "promote");
                        await sendFormattedMessage(zk, dest, txt, ms);
                    } else { return await sendFormattedMessage(zk, dest, notMember, ms); }
                } else { return await sendFormattedMessage(zk, dest, needAdminRights, ms); }
            } else { await sendFormattedMessage(zk, dest, tagMember, ms); }
        } else { return await sendFormattedMessage(zk, dest, notAdmin, ms); }
    } catch (e) { await sendFormattedMessage(zk, dest, errorMsg + " " + e.message, ms); }
});

// ── Demote command ─────────────────────────────────────────────
fana({ nomCom: "demote", categorie: 'Group', reaction: "👨🏿‍💼" }, async (dest, zk, commandeOptions) => {
    let { repondre, msgRepondu, infosGroupe, auteurMsgRepondu, verifGroupe, auteurMessage, superUser, idBot, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    
    const groupsOnly = await translateText("❌ For groups only", lang);
    const notAdminMsg = await translateText("❌ This member is not a group administrator.", lang);
    const notMember = await translateText("❌ This user is not part of the group.", lang);
    const needAdminRights = await translateText("❌ I need admin rights to demote members.", lang);
    const tagMember = await translateText("❌ Please tag the member to be demoted.", lang);
    const notAdminUser = await translateText("❌ You are not an administrator of the group.", lang);
    const errorMsg = await translateText("❌ Error:", lang);
    const demoted = await translateText("was removed from his position as a group administrator", lang);

    let membresGroupe = verifGroupe ? await infosGroupe.participants : "";
    if (!verifGroupe) { return await sendFormattedMessage(zk, dest, groupsOnly, ms); }
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
                            return await sendFormattedMessage(zk, dest, notAdminMsg, ms);
                        }
                        var txt = `📛 @${auteurMsgRepondu.split("@")[0]} ${demoted}`;
                        await zk.groupParticipantsUpdate(dest, [auteurMsgRepondu], "demote");
                        await sendFormattedMessage(zk, dest, txt, ms);
                    } else { return await sendFormattedMessage(zk, dest, notMember, ms); }
                } else { return await sendFormattedMessage(zk, dest, needAdminRights, ms); }
            } else { await sendFormattedMessage(zk, dest, tagMember, ms); }
        } else { return await sendFormattedMessage(zk, dest, notAdminUser, ms); }
    } catch (e) { await sendFormattedMessage(zk, dest, errorMsg + " " + e.message, ms); }
});

// ── Remove command ─────────────────────────────────────────────
fana({ nomCom: "remove", categorie: 'Group', reaction: "👨🏿‍💼" }, async (dest, zk, commandeOptions) => {
    let { repondre, msgRepondu, infosGroupe, auteurMsgRepondu, verifGroupe, nomAuteurMessage, auteurMessage, superUser, idBot, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    
    const groupsOnly = await translateText("❌ For groups only", lang);
    const notMember = await translateText("❌ This user is not part of the group.", lang);
    const needAdminRights = await translateText("❌ I need admin rights to remove members.", lang);
    const tagMember = await translateText("❌ Please tag the member to be removed.", lang);
    const notAdminUser = await translateText("❌ You are not an administrator of the group.", lang);
    const errorMsg = await translateText("❌ Error:", lang);
    const removed = await translateText("was removed from the group.", lang);

    let membresGroupe = verifGroupe ? await infosGroupe.participants : "";
    if (!verifGroupe) { return await sendFormattedMessage(zk, dest, groupsOnly, ms); }
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
                        var txt = `🚫 @${auteurMsgRepondu.split("@")[0]} ${removed}`;
                        await zk.groupParticipantsUpdate(dest, [auteurMsgRepondu], "remove");
                        await sendFormattedMessage(zk, dest, txt, ms);
                    } else { return await sendFormattedMessage(zk, dest, notMember, ms); }
                } else { return await sendFormattedMessage(zk, dest, needAdminRights, ms); }
            } else { await sendFormattedMessage(zk, dest, tagMember, ms); }
        } else { return await sendFormattedMessage(zk, dest, notAdminUser, ms); }
    } catch (e) { await sendFormattedMessage(zk, dest, errorMsg + " " + e.message, ms); }
});

// ── Delete command ─────────────────────────────────────────────
fana({ nomCom: "delete", categorie: 'Group', reaction: "🧹" }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, verifGroupe, auteurMsgRepondu, idBot, msgRepondu, verifAdmin, superUser } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    
    const replyToDelete = await translateText("❌ Please reply to the message to delete.", lang);
    const deletedSuccess = await translateText("✅ Message deleted successfully.", lang);
    const needAdminRights = await translateText("❌ I need admin rights to delete messages.", lang);
    const notAdminUser = await translateText("❌ Sorry, you are not an administrator of the group.", lang);

    if (!msgRepondu) {
        await sendFormattedMessage(zk, dest, replyToDelete, ms);
        return;
    }
    if (superUser && auteurMsgRepondu == idBot) {
        const key = {
            remoteJid: dest,
            fromMe: true,
            id: ms.message.extendedTextMessage.contextInfo.stanzaId,
        }
        await zk.sendMessage(dest, { delete: key });
        await sendFormattedMessage(zk, dest, deletedSuccess, ms);
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
                await sendFormattedMessage(zk, dest, deletedSuccess, ms);
            } catch (e) {
                await sendFormattedMessage(zk, dest, needAdminRights, ms);
            }
        } else {
            await sendFormattedMessage(zk, dest, notAdminUser, ms);
        }
    }
});

// ── Info command ─────────────────────────────────────────────
fana({ nomCom: "info", categorie: 'Group' }, async (dest, zk, commandeOptions) => {
    const { ms, repondre, verifGroupe } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    
    const reservedGroups = await translateText("❌ This command is reserved for groups only", lang);
    const groupInfo = await translateText("Group Info", lang);
    const nameLabel = await translateText("Name:", lang);
    const idLabel = await translateText("Group ID:", lang);
    const descLabel = await translateText("Description:", lang);
    const membersLabel = await translateText("Members:", lang);

    if (!verifGroupe) { await sendFormattedMessage(zk, dest, reservedGroups, ms); return };
    try { ppgroup = await zk.profilePictureUrl(dest, 'image'); } catch { ppgroup = "https://i.imgur.com/4M6Y6qT.png" }
    const info = await zk.groupMetadata(dest)
    let message = `*━━━━『${groupInfo}』━━━━*\n\n*🎐${nameLabel}* ${info.subject}\n\n*🔩${idLabel}* ${dest}\n\n*🔍${descLabel}* \n${info.desc}\n\n*👥${membersLabel}* ${info.participants.length}\n\n> NJABULO MD`
    await sendFormattedMessage(zk, dest, message, ms);
});

// ── AntiLink command ─────────────────────────────────────────────
fana({ nomCom: "antilink", categorie: 'Group', reaction: "🔗" }, async (dest, zk, commandeOptions) => {
    var { repondre, arg, verifGroupe, superUser, verifAdmin, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    
    const groupsOnly = await translateText("❌ For groups only", ms);
    const antilinkCommands = await translateText("📌 *ANTILINK COMMANDS*\n\nantilink on - Activate anti-link\nantilink off - Deactivate anti-link\nantilink action/remove - Remove user\nantilink action/warn - Give warning\nantilink action/delete - Delete link only", ms);
    const alreadyActivated = await translateText("❌ Anti-link is already activated for this group", ms);
    const activatedSuccess = await translateText("✅ Anti-link activated successfully", ms);
    const deactivatedSuccess = await translateText("✅ Anti-link deactivated successfully", ms);
    const notActivated = await translateText("❌ Anti-link is not activated for this group", ms);
    const actionUpdated = await translateText("✅ Anti-link action updated to:", ms);
    const availableActions = await translateText("❌ Available actions: warn, remove, delete", ms);
    const invalidCommand = await translateText("📌 Invalid command. Use antilink on/off or antilink action/remove/warn/delete", ms);
    const errorMsg = await translateText("❌ Error:", ms);
    const notAuthorized = await translateText("❌ You are not authorized to use this command", ms);

    if (!verifGroupe) {
        return await sendFormattedMessage(zk, dest, groupsOnly, ms);
    }
    if (superUser || verifAdmin) {
        const enetatoui = await verifierEtatJid(dest)
        try {
            if (!arg || !arg[0] || arg === ' ') {
                await sendFormattedMessage(zk, dest, antilinkCommands, ms);
                return;
            };
            if (arg[0] === 'on') {
                if (enetatoui) {
                    await sendFormattedMessage(zk, dest, alreadyActivated, ms);
                } else {
                    await ajouterOuMettreAJourJid(dest, "oui");
                    await sendFormattedMessage(zk, dest, activatedSuccess, ms);
                }
            } else if (arg[0] === "off") {
                if (enetatoui) {
                    await ajouterOuMettreAJourJid(dest, "non");
                    await sendFormattedMessage(zk, dest, deactivatedSuccess, ms);
                } else {
                    await sendFormattedMessage(zk, dest, notActivated, ms);
                }
            } else if (arg.join('').split("/")[0] === 'action') {
                let action = (arg.join('').split("/")[1]).toLowerCase();
                if (action == 'remove' || action == 'warn' || action == 'delete') {
                    await mettreAJourAction(dest, action);
                    await sendFormattedMessage(zk, dest, `${actionUpdated} ${action}`, ms);
                } else {
                    await sendFormattedMessage(zk, dest, availableActions, ms);
                }
            } else await sendFormattedMessage(zk, dest, invalidCommand, ms);
        } catch (error) {
            await sendFormattedMessage(zk, dest, errorMsg + " " + error.message, ms);
        }
    } else {
        await sendFormattedMessage(zk, dest, notAuthorized, ms);
    }
});

// ── AntiBot command ─────────────────────────────────────────────
fana({ nomCom: "antibot", categorie: 'Group', reaction: "😬" }, async (dest, zk, commandeOptions) => {
    var { repondre, arg, verifGroupe, superUser, verifAdmin, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    
    const groupsOnly = await translateText("❌ For groups only", ms);
    const antibotCommands = await translateText("📌 *ANTIBOT COMMANDS*\n\nantibot on - Activate anti-bot\nantibot off - Deactivate anti-bot\nantibot action/remove - Remove bot\nantibot action/warn - Give warning\nantibot action/delete - Delete message only", ms);
    const alreadyActivated = await translateText("❌ Anti-bot is already activated for this group", ms);
    const activatedSuccess = await translateText("✅ Anti-bot activated successfully", ms);
    const deactivatedSuccess = await translateText("✅ Anti-bot deactivated successfully", ms);
    const notActivated = await translateText("❌ Anti-bot is not activated for this group", ms);
    const actionUpdated = await translateText("✅ Anti-bot action updated to:", ms);
    const availableActions = await translateText("❌ Available actions: warn, remove, delete", ms);
    const invalidCommand = await translateText("📌 Invalid command. Use antibot on/off or antibot action/remove/warn/delete", ms);
    const errorMsg = await translateText("❌ Error:", ms);
    const notAuthorized = await translateText("❌ You are not authorized to use this command", ms);

    if (!verifGroupe) {
        return await sendFormattedMessage(zk, dest, groupsOnly, ms);
    }
    if (superUser || verifAdmin) {
        const enetatoui = await atbverifierEtatJid(dest)
        try {
            if (!arg || !arg[0] || arg === ' ') {
                await sendFormattedMessage(zk, dest, antibotCommands, ms);
                return;
            };
            if (arg[0] === 'on') {
                if (enetatoui) {
                    await sendFormattedMessage(zk, dest, alreadyActivated, ms);
                } else {
                    await atbajouterOuMettreAJourJid(dest, "oui");
                    await sendFormattedMessage(zk, dest, activatedSuccess, ms);
                }
            } else if (arg[0] === "off") {
                if (enetatoui) {
                    await atbajouterOuMettreAJourJid(dest, "non");
                    await sendFormattedMessage(zk, dest, deactivatedSuccess, ms);
                } else {
                    await sendFormattedMessage(zk, dest, notActivated, ms);
                }
            } else if (arg.join('').split("/")[0] === 'action') {
                let action = (arg.join('').split("/")[1]).toLowerCase();
                if (action == 'remove' || action == 'warn' || action == 'delete') {
                    await mettreAJourAction(dest, action);
                    await sendFormattedMessage(zk, dest, `${actionUpdated} ${action}`, ms);
                } else {
                    await sendFormattedMessage(zk, dest, availableActions, ms);
                }
            } else {
                await sendFormattedMessage(zk, dest, invalidCommand, ms);
            }
        } catch (error) {
            await sendFormattedMessage(zk, dest, errorMsg + " " + error.message, ms);
        }
    } else {
        await sendFormattedMessage(zk, dest, notAuthorized, ms);
    }
});

// ── Group open/close command ─────────────────────────────────────────────
fana({ nomCom: "group", categorie: 'Group' }, async (dest, zk, commandeOptions) => {
    const { repondre, verifGroupe, verifAdmin, superUser, arg, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    
    const reservedGroups = await translateText("❌ This command is reserved for groups only", ms);
    const instructions = await translateText("📌 Instructions:\n\n.group open - Open group\n.group close - Close group", ms);
    const opened = await translateText("✅ Group opened successfully", ms);
    const closed = await translateText("✅ Group closed successfully", ms);
    const invalidOption = await translateText("❌ Invalid option. Use 'open' or 'close'", ms);
    const reservedAdmins = await translateText("❌ This command is reserved for admins", ms);

    if (!verifGroupe) { await sendFormattedMessage(zk, dest, reservedGroups, ms); return };
    if (superUser || verifAdmin) {
        if (!arg[0]) { await sendFormattedMessage(zk, dest, instructions, ms); return; }
        const option = arg.join(' ')
        switch (option) {
            case "open":
                await zk.groupSettingUpdate(dest, 'not_announcement')
                await sendFormattedMessage(zk, dest, opened, ms);
                break;
            case "close":
                await zk.groupSettingUpdate(dest, 'announcement');
                await sendFormattedMessage(zk, dest, closed, ms);
                break;
            default: await sendFormattedMessage(zk, dest, invalidOption, ms);
        }
    } else {
        await sendFormattedMessage(zk, dest, reservedAdmins, ms);
        return;
    }
});

// ── Leave group command ─────────────────────────────────────────────
fana({ nomCom: "left", categorie: "Mods" }, async (dest, zk, commandeOptions) => {
    const { repondre, verifGroupe, superUser, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    
    const reservedGroups = await translateText("❌ This command is reserved for groups", ms);
    const reservedOwner = await translateText("❌ This command is reserved for the bot owner", ms);
    const goodbye = await translateText("👋 Goodbye! Sayonara!", ms);

    if (!verifGroupe) { await sendFormattedMessage(zk, dest, reservedGroups, ms); return };
    if (!superUser) {
        await sendFormattedMessage(zk, dest, reservedOwner, ms);
        return;
    }
    await sendFormattedMessage(zk, dest, goodbye, ms);
    zk.groupLeave(dest)
});

// ── Change group name command ─────────────────────────────────────────────
fana({ nomCom: "gname", categorie: 'Group' }, async (dest, zk, commandeOptions) => {
    const { arg, repondre, verifAdmin, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    
    const reservedAdmins = await translateText("❌ This command is reserved for group admins", ms);
    const enterName = await translateText("❌ Please enter the group name", ms);
    const updated = await translateText("✅ Group name updated to:", ms);

    if (!verifAdmin) {
        await sendFormattedMessage(zk, dest, reservedAdmins, ms);
        return;
    };
    if (!arg[0]) {
        await sendFormattedMessage(zk, dest, enterName, ms);
        return;
    };
    const nom = arg.join(' ')
    await zk.groupUpdateSubject(dest, nom);
    await sendFormattedMessage(zk, dest, `${updated} *${nom}*`, ms)
});

// ── Change group description command ─────────────────────────────────────────────
fana({ nomCom: "gdesc", categorie: 'Group' }, async (dest, zk, commandeOptions) => {
    const { arg, repondre, verifAdmin, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    
    const reservedAdmins = await translateText("❌ This command is reserved for group admins", ms);
    const enterDesc = await translateText("❌ Please enter the group description", ms);
    const updated = await translateText("✅ Group description updated to:", ms);

    if (!verifAdmin) {
        await sendFormattedMessage(zk, dest, reservedAdmins, ms);
        return;
    };
    if (!arg[0]) {
        await sendFormattedMessage(zk, dest, enterDesc, ms);
        return;
    };
    const nom = arg.join(' ')
    await zk.groupUpdateDescription(dest, nom);
    await sendFormattedMessage(zk, dest, `${updated} *${nom}*`, ms)
});

// ── Change group profile picture command ─────────────────────────────────────────────
fana({ nomCom: "gpp", categorie: 'Group' }, async (dest, zk, commandeOptions) => {
    const { repondre, msgRepondu, verifAdmin, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    
    const reservedAdmins = await translateText("❌ This command is reserved for group admins", ms);
    const replyImage = await translateText("❌ Please reply with an image", ms);
    const changed = await translateText("✅ Group profile picture changed successfully", ms);
    const errorChanging = await translateText("❌ Error changing group picture", ms);

    if (!verifAdmin) {
        await sendFormattedMessage(zk, dest, reservedAdmins, ms);
        return;
    };
    if (msgRepondu && msgRepondu.imageMessage) {
        const pp = await zk.downloadAndSaveMediaMessage(msgRepondu.imageMessage);
        await zk.updateProfilePicture(dest, { url: pp })
            .then(async () => {
                await sendFormattedMessage(zk, dest, changed, ms);
                fs.unlinkSync(pp);
            }).catch(async () => await sendFormattedMessage(zk, dest, errorChanging, ms));
    } else {
        await sendFormattedMessage(zk, dest, replyImage, ms);
    }
});

// ── Hide tag command ─────────────────────────────────────────────
fana({ nomCom: "hidetag", categorie: 'Group', reaction: "🎤" }, async (dest, zk, commandeOptions) => {
    const { repondre, msgRepondu, verifGroupe, arg, verifAdmin, superUser, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    
    const groupsOnly = await translateText("❌ This command is only allowed in groups", ms);
    const reservedAdmins = await translateText("❌ This command is reserved for group admins", ms);
    const noMessage = await translateText("No message", lang);

    if (!verifGroupe) {
        await sendFormattedMessage(zk, dest, groupsOnly, ms);
        return;
    }
    if (verifAdmin || superUser) {
        let metadata = await zk.groupMetadata(dest);
        let tag = [];
        for (const participant of metadata.participants) {
            tag.push(participant.id);
        }
        let messageText = arg && arg.length > 0 ? arg.join(" ") : noMessage;
        await zk.sendMessage(dest, { text: messageText, mentions: tag });
    } else {
        await sendFormattedMessage(zk, dest, reservedAdmins, ms);
    }
}); 
