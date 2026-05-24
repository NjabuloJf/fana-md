const { fana } = require("../njabulo/fana");
const s = require("../set");
const fs = require('fs');
const config = require("../set");
const Heroku = require('heroku-client');

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
                buttons,
                headerType: 1
            }
        },
        { quoted: ms }
    );
}

// Function to get a description of an environment variable
function getDescriptionFromEnv(varName) {
    const filePath = "./app.json";
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(fileContent);
    return config.env[varName]?.description || "The environment variable description was not found.";
}

// Anti-call function setup
fana({
    nomCom: 'anticall',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'anticall yes' to enable or 'anticall no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.ANTICALL = 'yes';
            responseMessage = '✅ Anti-call has been enabled successfully.';
            break;
        case "no":
            s.ANTICALL = 'no';
            responseMessage = '✅ Anti-call has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'anticall yes' or 'anticall no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Areact command
fana({
    nomCom: 'areact',
    categorie: "General"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'areact yes' to enable or 'areact no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.AUTO_REACT = 'yes';
            responseMessage = '✅ Auto-react has been enabled successfully.';
            break;
        case "no":
            s.AUTO_REACT = 'no';
            responseMessage = '✅ Auto-react has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'areact yes' or 'areact no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Readstatus command
fana({
    nomCom: 'readstatus',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'readstatus yes' to enable or 'readstatus no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.AUTO_READ_STATUS = 'yes';
            responseMessage = '✅ Auto-read status has been enabled successfully.';
            break;
        case "no":
            s.AUTO_READ_STATUS = 'no';
            responseMessage = '✅ Auto-read status has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'readstatus yes' or 'readstatus no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Antidelete command
fana({
    nomCom: 'antidelete',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'antidelete yes' to enable or 'antidelete no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.ADM = 'yes';
            responseMessage = '✅ Anti-delete has been enabled successfully.';
            break;
        case "no":
            s.ADM = 'no';
            responseMessage = '✅ Anti-delete has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'antidelete yes' or 'antidelete no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Downloadstatus command
fana({
    nomCom: 'downloadstatus',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'downloadstatus yes' to enable or 'downloadstatus no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.AUTO_DOWNLOAD_STATUS = 'yes';
            responseMessage = '✅ Auto-download status has been enabled successfully.';
            break;
        case "no":
            s.AUTO_DOWNLOAD_STATUS = 'no';
            responseMessage = '✅ Auto-download status has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'downloadstatus yes' or 'downloadstatus no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Startmessage command
fana({
    nomCom: 'startmessage',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'startmessage yes' to enable or 'startmessage no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.DP = 'yes';
            responseMessage = '✅ Start message has been enabled successfully.';
            break;
        case "no":
            s.DP = 'no';
            responseMessage = '✅ Start message has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'startmessage yes' or 'startmessage no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Readmessage command
fana({
    nomCom: 'readmessage',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'readmessage yes' to enable or 'readmessage no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.AUTO_READ_MESSAGES = 'yes';
            responseMessage = '✅ Auto-read messages has been enabled successfully.';
            break;
        case "no":
            s.AUTO_READ_MESSAGES = 'no';
            responseMessage = '✅ Auto-read messages has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'readmessage yes' or 'readmessage no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Pm-permit command
fana({
    nomCom: 'pm-permit',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'pm-permit yes' to enable or 'pm-permit no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.PM_PERMIT = 'yes';
            responseMessage = '✅ PM permit has been enabled successfully.';
            break;
        case "no":
            s.PM_PERMIT = 'no';
            responseMessage = '✅ PM permit has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'pm-permit yes' or 'pm-permit no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Chatbot command
fana({
    nomCom: 'chatbot',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'chatbot yes' to enable or 'chatbot no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.CHAT_BOT = 'yes';
            responseMessage = '✅ Chatbot has been enabled successfully.';
            break;
        case "no":
            s.CHAT_BOT = 'no';
            responseMessage = '✅ Chatbot has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'chatbot yes' or 'chatbot no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Greet command
fana({
    nomCom: 'greet',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'greet yes' to enable or 'greet no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.AUTO_REPLY = 'yes';
            responseMessage = '✅ Auto-reply has been enabled successfully.';
            break;
        case "no":
            s.AUTO_REPLY = 'no';
            responseMessage = '✅ Auto-reply has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'greet yes' or 'greet no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Antivv command
fana({
    nomCom: 'antivv',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'antivv yes' to enable or 'antivv no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.ANTI_VV = 'yes';
            responseMessage = '✅ Anti-view once has been enabled successfully.';
            break;
        case "no":
            s.ANTI_VV = 'no';
            responseMessage = '✅ Anti-view once has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'antivv yes' or 'antivv no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Publicmode command
fana({
    nomCom: 'publicmode',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'publicmode yes' to enable or 'publicmode no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.MODE = 'yes';
            responseMessage = '✅ Public mode has been enabled successfully.';
            break;
        case "no":
            s.MODE = 'no';
            responseMessage = '✅ Public mode has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'publicmode yes' or 'publicmode no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Autorecord command
fana({
    nomCom: 'autorecord',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'autorecord yes' to enable or 'autorecord no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.ETAT = '3';
            responseMessage = '✅ Auto-record has been enabled successfully.';
            break;
        case "no":
            s.ETAT = 'no';
            responseMessage = '✅ Auto-record has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'autorecord yes' or 'autorecord no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Autotyping command
fana({
    nomCom: 'autotyping',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'autotyping yes' to enable or 'autotyping no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.ETAT = '2';
            responseMessage = '✅ Auto-typing has been enabled successfully.';
            break;
        case "no":
            s.ETAT = 'no';
            responseMessage = '✅ Auto-typing has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'autotyping yes' or 'autotyping no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Alwaysonline command
fana({
    nomCom: 'alwaysonline',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'alwaysonline yes' to enable or 'alwaysonline no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.ETAT = '1';
            responseMessage = '✅ Always online has been enabled successfully.';
            break;
        case "no":
            s.ETAT = 'no';
            responseMessage = '✅ Always online has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'alwaysonline yes' or 'alwaysonline no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Privatemode command
fana({
    nomCom: 'privatemode',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'privatemode yes' to enable or 'privatemode no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.MODE = 'no';
            responseMessage = '✅ Private mode has been enabled successfully.';
            break;
        case "no":
            s.MODE = 'yes';
            responseMessage = '✅ Private mode has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'privatemode yes' or 'privatemode no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Autolikestatus command
fana({
    nomCom: 'autolikestatus',
    categorie: "HEROKU-CLIENT"
}, async (chatId, zk, context) => {
    const { ms, repondre, superUser, auteurMessage, arg } = context;

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, "❌ This command is restricted to the bot owner.", ms);
    }

    if (!arg[0]) {
        return sendFormattedMessage(zk, chatId, "📌 Instructions:\n\nType 'autolikestatus yes' to enable or 'autolikestatus no' to disable.", ms);
    }

    const option = arg.join(' ').toLowerCase();
    let responseMessage;
    switch (option) {
        case "yes":
            s.AUTO_LIKE_STATUS = 'yes';
            responseMessage = '✅ Auto-like status has been enabled successfully.';
            break;
        case "no":
            s.AUTO_LIKE_STATUS = 'no';
            responseMessage = '✅ Auto-like status has been disabled successfully.';
            break;
        default:
            return sendFormattedMessage(zk, chatId, "❌ Invalid option. Type 'autolikestatus yes' or 'autolikestatus no'.", ms);
    }

    await sendFormattedMessage(zk, chatId, responseMessage, ms);
});

// Settings menu command
fana({
    nomCom: 'settings',
    categorie: "HEROKU-CLIENT"
}, async (chatId, messagingService, context) => {
    const { ms, repondre, superUser, auteurMessage } = context;

    if (!superUser) {
        return sendFormattedMessage(messagingService, chatId, "❌ This command is for my owner only!", ms);
    }

    const settingsOptions = [
        { nom: "ADM", choix: ['yes', "no"] },
        { nom: "ANTICALL", choix: ['yes', 'no'] },
        { nom: "AUTO_REACT", choix: ['yes', "no"] },
        { nom: "AUTO_VIEW_STATUS", choix: ['yes', "no"] },
        { nom: 'AUTO_SAVE_STATUS', choix: ['yes', "no"] },
        { nom: "PM_PERMIT", choix: ['yes', "no"] },
        { nom: 'MODE', choix: ["public", "private"] },
        { nom: "STARTING_MESSAGE", choix: ['on', "off"] },
        { nom: "AUTO_READ_MESSAGES", choix: ['on', "off"] },
        { nom: 'PRESENCE', choix: ["online", "typing", 'recording'] },
        { nom: "CHAT_BOT", choix: ['on', 'off'] }
    ];

    let settingsMenu = "╭──────༺♡༻──────╮\n  NJABULO MD\n╰──────༺♡༻──────╯\n\n";
    settingsOptions.forEach((option, index) => {
        settingsMenu += `${index + 1}- *${option.nom}*\n`;
    });
    settingsMenu += "\n📌 Please choose a variable by its number";

    await sendFormattedMessage(messagingService, chatId, settingsMenu, ms);

    const userChoice = await messagingService.awaitForMessage({
        chatJid: chatId,
        sender: auteurMessage,
        timeout: 60000,
        filter: msg => msg.message.extendedTextMessage?.text > 0 &&
            msg.message.extendedTextMessage?.text <= settingsOptions.length
    });

    const selectedOption = settingsOptions[parseInt(userChoice.message.extendedTextMessage.text) - 1];
    let settingsDetail = `╭──────༺♡༻──────╮\n  NJABULO MD\n╰──────༺♡༻──────╯\n\n`;
    settingsDetail += `*Variable Name* : ${selectedOption.nom}\n`;
    settingsDetail += `*Description* : ${getDescriptionFromEnv(selectedOption.nom)}\n\n`;
    settingsDetail += "┌────── ⋆⋅☆⋅⋆ ──────┐\n\n";
    selectedOption.choix.forEach((choice, index) => {
        settingsDetail += `*${index + 1}* => ${choice}\n`;
    });
    settingsDetail += "\n└────── ⋆⋅☆⋅⋆ ──────┘\n\n📌 Now reply with the number that matches your choice.";

    await sendFormattedMessage(messagingService, chatId, settingsDetail, userChoice);

    const userOptionChoice = await messagingService.awaitForMessage({
        chatJid: chatId,
        sender: auteurMessage,
        timeout: 60000,
        filter: msg => msg.message.extendedTextMessage?.text > 0 &&
            msg.message.extendedTextMessage?.text <= selectedOption.choix.length
    });

    const heroku = new Heroku({ token: s.HEROKU_API_KEY });
    await heroku.patch(`/apps/${s.HEROKU_APP_NAME}/config-vars`, {
        body: {
            [selectedOption.nom]: selectedOption.choix[parseInt(userOptionChoice.message.extendedTextMessage.text) - 1]
        }
    });

    await sendFormattedMessage(messagingService, chatId, "✅ Heroku variable is changing. The bot is restarting...", userOptionChoice);
});

// Function to change Heroku environment variables
function changevars(commandName, varName) {
    fana({
        nomCom: commandName,
        categorie: 'HEROKU-CLIENT'
    }, async (chatId, messagingService, context) => {
        const { arg, superUser, ms } = context;

        if (!superUser) {
            return sendFormattedMessage(messagingService, chatId, "❌ This command is for my owner only!", ms);
        }

        if (!s.HEROKU_APP_NAME || !s.HEROKU_API_KEY) {
            return sendFormattedMessage(messagingService, chatId, "❌ Fill in the HEROKU_APP_NAME and HEROKU_API_KEY environment variables", ms);
        }

        if (!arg[0]) {
            return sendFormattedMessage(messagingService, chatId, `📌 ${getDescriptionFromEnv(varName)}`, ms);
        }

        const heroku = new Heroku({ token: s.HEROKU_API_KEY });
        await heroku.patch(`/apps/${s.HEROKU_APP_NAME}/config-vars`, {
            body: {
                [varName]: arg.join(" ")
            }
        });

        await sendFormattedMessage(messagingService, chatId, "✅ Heroku variable is changing. The bot is restarting...", ms);
    });
}

changevars("setprefix", "PREFIXES");
changevars("menulinks", "BOT_MENU_LINKS");
