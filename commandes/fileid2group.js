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
    const lang = conf.LANGUAGE || "en";
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
                url: conf.GURL,
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

    const lang = conf.LANGUAGE || "en";
    const groupsOnly = await translateText("❌ This command works in groups only!", lang);
    const tooWeak = await translateText("❌ You are too weak to do that", lang);
    const notAdmin = await translateText("❌ You are not an admin here!", lang);
    const failedMetadata = await translateText("❌ Failed to fetch group metadata.", lang);
    const provideNumber = await translateText("📌 Provide number to be added. Example:\n.add 2557XXXXX801", lang);
    const errorValidating = await translateText("❌ Error validating phone numbers.", lang);
    const alreadyInGroup = await translateText("❌ is already in this group!", lang);
    const successAdded = await translateText("✅ Successfully added", lang);
    const failedAdd = await translateText("❌ Failed to add user to the group!", lang);

    if (!verifGroupe) return await sendFormattedMessage(zk, origineMessage, groupsOnly, ms);
    if (!superUser) return await sendFormattedMessage(zk, origineMessage, tooWeak, ms);
    if (!verifAdmin) return await sendFormattedMessage(zk, origineMessage, notAdmin, ms);

    let groupMetadata;
    try {
        groupMetadata = await zk.groupMetadata(origineMessage);
    } catch (error) {
        return await sendFormattedMessage(zk, origineMessage, failedMetadata, ms);
    }

    let participants = groupMetadata.participants;
    if (!arg[0]) return await sendFormattedMessage(zk, origineMessage, provideNumber, ms);

    let numbers = arg.join(" ");
    const participantIds = participants.map(p => p.id);
    let numbersToAdd = [];
    let alreadyInGroupList = [];

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
                alreadyInGroupList.push(jid);
            } else if (result[0]?.exists) {
                numbersToAdd.push(num + "@s.whatsapp.net");
            }
        });
    } catch (error) {
        return await sendFormattedMessage(zk, origineMessage, errorValidating, ms);
    }

    for (const jid of alreadyInGroupList) {
        await sendFormattedMessage(zk, origineMessage, `${alreadyInGroup} @${jid.split('@')[0]}`, ms);
    }

    if (numbersToAdd.length > 0) {
        try {
            await zk.groupAdd(origineMessage, numbersToAdd);
            for (const jid of numbersToAdd) {
                await sendFormattedMessage(zk, origineMessage, `${successAdded} @${jid.split('@')[0]}`, ms);
            }
        } catch (error) {
            return await sendFormattedMessage(zk, origineMessage, failedAdd, ms);
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
    const lang = conf.LANGUAGE || "en";

    const groupsOnly = await translateText("❌ This command works in groups only", lang);
    const notAdmin = await translateText("❌ You are not an admin here!", lang);
    const noRequests = await translateText("📌 There are no pending join requests.", lang);
    const approved = await translateText("✅ All pending participants have been approved to join.", lang);

    if (!verifGroupe) {
        await sendFormattedMessage(zk, origineMessage, groupsOnly, ms);
        return;
    }
    if (!verifAdmin) {
        await sendFormattedMessage(zk, origineMessage, notAdmin, ms);
        return;
    }
    const pendingRequests = await zk.groupRequestParticipantsList(origineMessage);
    if (pendingRequests.length === 0) {
        await sendFormattedMessage(zk, origineMessage, noRequests, ms);
        return;
    }
    for (const request of pendingRequests) {
        await zk.groupRequestParticipantsUpdate(origineMessage, [request.jid], 'approve');
    }
    await sendFormattedMessage(zk, origineMessage, approved, ms);
});

// ── VCF command ─────────────────────────────────────────────
fana({
    'nomCom': "vcf",
    'aliases': ["savecontact", "savecontacts"],
    'categorie': "Group",
    'reaction': '♻️'
}, async (origineMessage, zk, commandeOptions) => {
    const { repondre, verifGroupe, verifAdmin, ms } = commandeOptions;
    const lang = conf.LANGUAGE || "en";

    const notAdmin = await translateText("❌ You are not an admin here!", lang);
    const groupsOnly = await translateText("❌ This command works in groups only", lang);
    const compiling = await translateText("⏳ Compiling", lang);
    const contacts = await translateText("contacts into a VCF...", lang);
    const errorOccurred = await translateText("❌ An error occurred while creating or sending the VCF. Please try again.", lang);
    const vcfFor = await translateText("📇 VCF for", lang);
    const totalContacts = await translateText("📊 Total Contacts:", lang);

    if (!verifAdmin) {
        await sendFormattedMessage(zk, origineMessage, notAdmin, ms);
        return;
    }
    if (!verifGroupe) {
        await sendFormattedMessage(zk, origineMessage, groupsOnly, ms);
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
        await sendFormattedMessage(zk, origineMessage, `${compiling} ${participants.length} ${contacts}`, ms);
        await fs.writeFileSync("./contacts.vcf", vcfData.trim());
        await zk.sendMessage(origineMessage, {
            document: fs.readFileSync("./contacts.vcf"),
            mimetype: "text/vcard",
            fileName: groupMetadata.subject + '.Vcf',
            caption: `${vcfFor} ${groupMetadata.subject}\n${totalContacts} ${participants.length}\n\n💫 NJABULO MD`
        }, { quoted: ms });
        fs.unlinkSync('./contacts.vcf');
    } catch (error) {
        console.error("Error:", error.message || error);
        await sendFormattedMessage(zk, origineMessage, errorOccurred, ms);
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
    const lang = conf.LANGUAGE || "en";

    const groupsOnly = await translateText("❌ This command works in groups only!", lang);
    const errorOccurred = await translateText("❌ An error occurred while fetching the group invite link. Please try again.", lang);
    const hello = await translateText("👋 Hello", lang);
    const hereIsLink = await translateText("here is the group link of", lang);
    const njabulo = await translateText("💫 NJABULO MD", lang);

    if (!verifGroupe) {
        await sendFormattedMessage(zk, origineMessage, groupsOnly, ms);
        return;
    }
    try {
        const inviteLink = await zk.groupInviteCode(origineMessage);
        const message = `${hello} ${nomAuteurMessage}, ${hereIsLink} ${nomGroupe}:\n\n🔗 https://chat.whatsapp.com/${inviteLink}\n\n${njabulo}`;
        await sendFormattedMessage(zk, origineMessage, message, ms);
    } catch (error) {
        console.error("Error:", error.message || error);
        await sendFormattedMessage(zk, origineMessage, errorOccurred, ms);
    }
});

// ── Revoke command ─────────────────────────────────────────────
fana({
    'nomCom': 'revoke',
    'categorie': 'Group'
}, async (origineMessage, zk, commandeOptions) => {
    const { arg, repondre, verifGroupe, verifAdmin, ms } = commandeOptions;
    const lang = conf.LANGUAGE || "en";

    const adminsOnly = await translateText("❌ This command is for admins only.", lang);
    const groupsOnly = await translateText("❌ This command is only allowed in groups.", lang);
    const revoked = await translateText("✅ Group link has been revoked successfully.", lang);

    if (!verifAdmin) {
        await sendFormattedMessage(zk, origineMessage, adminsOnly, ms);
        return;
    }
    if (!verifGroupe) {
        await sendFormattedMessage(zk, origineMessage, groupsOnly, ms);
        return;
    }
    await zk.groupRevokeInvite(origineMessage);
    await sendFormattedMessage(zk, origineMessage, revoked, ms);
});
