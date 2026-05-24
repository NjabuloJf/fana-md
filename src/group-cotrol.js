const { exec } = require("child_process");
const { fana } = require("../njabulo/fana");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const { ajouterOuMettreAJourJid, mettreAJourAction, verifierEtatJid } = require('../bdd/antilien');
const { atbajouterOuMettreAJourJid, atbverifierEtatJid } = require('../bdd/antibot');
const { search, download } = require('aptoide-scraper');
const fs = require('fs-extra');
const conf = require("../set");
const { default: axios } = require("axios");
const { getBinaryNodeChild, getBinaryNodeChildren } = require("@whiskeysockets/baileys")['default'];

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
            url: conf.GURL,
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
                buttons,
                headerType: 1
            }
        },
        { quoted: ms }
    );
}

// ── Add command ─────────────────────────────────────────────
fana({ 
    'nomCom': 'add', 
    'categorie': "Group", 
    'reaction': '🪄' 
}, async (origineMessage, zk, commandeOptions) => {
    let { 
        repondre, 
        verifAdmin, 
        msgRepondu, 
        infosGroupe, 
        auteurMsgRepondu, 
        verifGroupe, 
        auteurMessage, 
        superUser, 
        idBot, 
        arg, 
        ms 
    } = commandeOptions;

    if (!verifGroupe) return await sendFormattedMessage(zk, origineMessage, "❌ This command works in groups only!", ms);
    if (!superUser) return await sendFormattedMessage(zk, origineMessage, "❌ You are too weak to do that", ms);
    if (!verifAdmin) return await sendFormattedMessage(zk, origineMessage, "❌ You are not an admin here!", ms);

    let groupMetadata;
    try {
        groupMetadata = await zk.groupMetadata(origineMessage);
    } catch (error) {
        return await sendFormattedMessage(zk, origineMessage, "❌ Failed to fetch group metadata.", ms);
    }

    let participants = groupMetadata.participants;
    if (!arg[0]) return await sendFormattedMessage(zk, origineMessage, "📌 Provide number to be added. Example:\n.add 2557XXXXX801", ms);

    let numbers = arg.join(" ");
    const participantIds = participants.map(p => p.id);
    let numbersToAdd = [];
    let alreadyInGroup = [];

    try {
        const onWhatsApp = await Promise.all(
            numbers.split(',')
                .map(n => n.replace(/[^0-9]/g, ''))
                .filter(n => n.length > 4 && n.length < 14)
                .map(async n => [n, await zk.onWhatsApp(n + "@s.whatsapp.net")])
        );

        onWhatsApp.forEach(([num, result]) => {
            const jid = num + "@s.whatsapp.net";
            if (participantIds.includes(jid)) {
                alreadyInGroup.push(jid);
            } else if (result[0]?.exists) {
                numbersToAdd.push(num + "@s.whatsapp.net");
            }
        });
    } catch (error) {
        return await sendFormattedMessage(zk, origineMessage, "❌ Error validating phone numbers.", ms);
    }

    for (const jid of alreadyInGroup) {
        await sendFormattedMessage(zk, origineMessage, `❌ @${jid.split('@')[0]} is already in this group!`, ms);
    }

    if (numbersToAdd.length > 0) {
        try {
            await zk.groupAdd(origineMessage, numbersToAdd);
            for (const jid of numbersToAdd) {
                await sendFormattedMessage(zk, origineMessage, `✅ Successfully added @${jid.split('@')[0]}`, ms);
            }
        } catch (error) {
            return await sendFormattedMessage(zk, origineMessage, "❌ Failed to add user to the group!", ms);
        }
    }
});

// ── Approve command ─────────────────────────────────────────────
fana({ 
    'nomCom': 'approve', 
    'aliases': ["approve-all", "accept"], 
    'categorie': "Group", 
    'reaction': '🔎' 
}, async (origineMessage, zk, commandeOptions) => {
    const { repondre, verifGroupe, verifAdmin, ms } = commandeOptions;
    if (!verifGroupe) {
        await sendFormattedMessage(zk, origineMessage, "❌ This command works in groups only", ms);
        return;
    }
    if (!verifAdmin) {
        await sendFormattedMessage(zk, origineMessage, "❌ You are not an admin here!", ms);
        return;
    }
    const pendingRequests = await zk.groupRequestParticipantsList(origineMessage);
    if (pendingRequests.length === 0) {
        await sendFormattedMessage(zk, origineMessage, "📌 There are no pending join requests.", ms);
        return;
    }
    for (const request of pendingRequests) {
        await zk.groupRequestParticipantsUpdate(origineMessage, [request.jid], 'approve');
    }
    await sendFormattedMessage(zk, origineMessage, "✅ All pending participants have been approved to join.", ms);
});

// ── VCF command ─────────────────────────────────────────────
fana({ 
    'nomCom': "vcf", 
    'aliases': ["savecontact", "savecontacts"], 
    'categorie': "Group", 
    'reaction': '♻️' 
}, async (origineMessage, zk, commandeOptions) => {
    const { repondre, verifGroupe, verifAdmin, ms } = commandeOptions;
    if (!verifAdmin) {
        await sendFormattedMessage(zk, origineMessage, "❌ You are not an admin here!", ms);
        return;
    }
    if (!verifGroupe) {
        await sendFormattedMessage(zk, origineMessage, "❌ This command works in groups only", ms);
        return;
    }
    try {
        let groupMetadata = await zk.groupMetadata(origineMessage);
        const participants = groupMetadata.participants;
        let vcfData = '';
        for (let participant of participants) {
            let number = participant.id.split('@')[0];
            let name = participant.name || participant.notify || "[NJABULO] +" + number;
            vcfData += "BEGIN:VCARD\nVERSION:3.0\nFN:" + name + "\nTEL;type=CELL;type=VOICE;waid=" + number + ':+' + number + "\nEND:VCARD\n";
        }
        await sendFormattedMessage(zk, origineMessage, "⏳ Compiling " + participants.length + " contacts into a VCF...", ms);
        await fs.writeFileSync("./contacts.vcf", vcfData.trim());
        await zk.sendMessage(origineMessage, { 
            document: fs.readFileSync("./contacts.vcf"), 
            mimetype: "text/vcard", 
            fileName: groupMetadata.subject + '.Vcf', 
            caption: "📇 VCF for " + groupMetadata.subject + "\n📊 Total Contacts: " + participants.length + "\n\n💫 NJABULO MD" 
        }, { quoted: ms });
        fs.unlinkSync('./contacts.vcf');
    } catch (error) {
        console.error("Error:", error.message || error);
        await sendFormattedMessage(zk, origineMessage, "❌ An error occurred while creating or sending the VCF. Please try again.", ms);
    }
});

// ── Invite command ─────────────────────────────────────────────
fana({ 
    'nomCom': 'invite', 
    'aliases': ["link"], 
    'categorie': 'Group', 
    'reaction': '🪄' 
}, async (origineMessage, zk, commandeOptions) => {
    const { repondre, nomGroupe, nomAuteurMessage, verifGroupe, ms } = commandeOptions;
    if (!verifGroupe) {
        await sendFormattedMessage(zk, origineMessage, "❌ This command works in groups only!", ms);
        return;
    }
    try {
        const inviteLink = await zk.groupInviteCode(origineMessage);
        const message = `👋 Hello ${nomAuteurMessage}, here is the group link of ${nomGroupe}:\n\n🔗 https://chat.whatsapp.com/${inviteLink}\n\n💫 NJABULO MD`;
        await sendFormattedMessage(zk, origineMessage, message, ms);
    } catch (error) {
        console.error("Error:", error.message || error);
        await sendFormattedMessage(zk, origineMessage, "❌ An error occurred while fetching the group invite link. Please try again.", ms);
    }
});

// ── Revoke command ─────────────────────────────────────────────
fana({ 
    'nomCom': 'revoke', 
    'categorie': 'Group' 
}, async (origineMessage, zk, commandeOptions) => {
    const { arg, repondre, verifGroupe, verifAdmin, ms } = commandeOptions;
    if (!verifAdmin) {
        await sendFormattedMessage(zk, origineMessage, "❌ This command is for admins only.", ms);
        return;
    }
    if (!verifGroupe) {
        await sendFormattedMessage(zk, origineMessage, "❌ This command is only allowed in groups.", ms);
        return;
    }
    await zk.groupRevokeInvite(origineMessage);
    await sendFormattedMessage(zk, origineMessage, "✅ Group link has been revoked successfully.", ms);
});
