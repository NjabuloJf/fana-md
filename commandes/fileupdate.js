const { fana } = require("../njabulo/fana");
const axios = require('axios');
const fs = require('fs-extra');
const path = require("path");
const AdmZip = require("adm-zip");
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
async function getTranslatedButtons() {
    const lang = config.LANGUAGE || "en";
    const checkStatus = await translateText("✅ Check Status", lang);
    const gitHub = await translateText("🌐 GitHub", lang);
    return { checkStatus, gitHub };
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

// ── Database functions for commit hash (simple file-based) ─────────
const hashFilePath = path.join(__dirname, '../data/commitHash.json');

async function getCommitHash() {
    try {
        if (fs.existsSync(hashFilePath)) {
            const data = await fs.readJson(hashFilePath);
            return data.commitHash;
        }
        return null;
    } catch (error) {
        console.error("Error reading commit hash:", error);
        return null;
    }
}

async function setCommitHash(hash) {
    try {
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            await fs.mkdir(dataDir, { recursive: true });
        }
        await fs.writeJson(hashFilePath, { commitHash: hash });
        return true;
    } catch (error) {
        console.error("Error saving commit hash:", error);
        return false;
    }
}

// ── Helper function to copy directories while preserving config ────
async function copyFolderSync(source, target) {
    if (!fs.existsSync(target)) {
        await fs.mkdir(target, { recursive: true });
    }

    const items = await fs.readdir(source);
    for (const item of items) {
        const srcPath = path.join(source, item);
        const destPath = path.join(target, item);

        // Skip config.js and set.js to preserve custom settings
        if (item === "set.js" || item === "config.js" || item === "app.json" || item === "set.env") {
            console.log(`📌 Skipping ${item} to preserve custom settings.`);
            continue;
        }

        const stat = await fs.stat(srcPath);
        if (stat.isDirectory()) {
            await copyFolderSync(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

// ── Send formatted message with buttons ─────────────────────────
async function sendFormattedMessage(zk, chatId, text, ms) {
    const btn = await getTranslatedButtons();
    const buttons = [
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: btn.checkStatus,
                id: ".update"
            })
        },
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: btn.gitHub,
                url: "https://github.com/NjabuloJf/fana-md"
            })
        }
    ];

    await zk.sendMessage(
        chatId,
        {
            text: text,
            buttons: buttons,
            viewOnce: false
        },
        { quoted: ms }
    );
}

// ── UPDATE COMMAND ─────────────────────────────────────────────
fana({
    nomCom: "update",
    alias: ["upgrade", "sync", "gitpull"],
    categorie: "Owner",
    reaction: "🆕",
}, async (chatId, zk, commandeOptions) => {
    const { ms, repondre, superUser, arg } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    // ========== TRANSLATED TEXTS ==========
    const accessDenied = await translateText("❌ *Access Denied*\n\nThis command is only for the bot owner.", lang);
    const checkingUpdates = await translateText("🔍 *Checking for updates...*\n\n⏳ Please wait!", lang);
    const upToDate = await translateText("✅ *Bot is up-to-date!*", lang);
    const currentVersion = await translateText("📌 Current version:", lang);
    const updatingBot = await translateText("🚀 *Updating bot...*\n\n📦 Downloading latest version...", lang);
    const extracting = await translateText("📦 *Extracting the latest code...*", lang);
    const replacingFiles = await translateText("🔄 *Replacing files...*", lang);
    const updateComplete = await translateText("✅ *Update complete!*", lang);
    const newVersion = await translateText("📌 New version:", lang);
    const restarting = await translateText("🔄 Restarting the bot in 3 seconds...", lang);
    const updateFailed = await translateText("❌ *Update failed:*", lang);
    const tryManual = await translateText("Please try manually or check your connection.", lang);
    const njabuloMD = await translateText("💫 NJABULO MD", lang);
    const noVersionInfo = await translateText("📌 *No version info found*", lang);
    const runUpdate = await translateText("Please run .update to get the latest version.", lang);

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, accessDenied, ms);
    }

    try {
        await sendFormattedMessage(zk, chatId, checkingUpdates, ms);

        // Fetch the latest commit hash from GitHub
        const { data: commitData } = await axios.get("https://api.github.com/repos/NjabuloJf/fana-md/commits/main", { timeout: 15000 });
        const latestCommitHash = commitData.sha.substring(0, 7);

        // Get the stored commit hash from the database
        const currentHash = await getCommitHash();

        if (latestCommitHash === currentHash) {
            return sendFormattedMessage(zk, chatId, `${upToDate}\n\n${currentVersion} ${currentHash}\n\n${njabuloMD}`, ms);
        }

        await sendFormattedMessage(zk, chatId, updatingBot, ms);

        // Download the latest code
        const tempDir = path.join(__dirname, "../temp");
        if (!fs.existsSync(tempDir)) {
            await fs.mkdir(tempDir, { recursive: true });
        }
        
        const zipPath = path.join(tempDir, "latest.zip");
        const { data: zipData } = await axios.get("https://github.com/NjabuloJf/fana-md/archive/main.zip", { 
            responseType: "arraybuffer",
            timeout: 60000 
        });
        await fs.writeFile(zipPath, zipData);

        await sendFormattedMessage(zk, chatId, extracting, ms);

        // Extract ZIP file
        const extractPath = path.join(tempDir, 'latest');
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractPath, true);

        await sendFormattedMessage(zk, chatId, replacingFiles, ms);

        // Copy updated files, preserving config.js and set.js
        const sourcePath = path.join(extractPath, "fana-md-main");
        const destinationPath = path.join(__dirname, '..');
        await copyFolderSync(sourcePath, destinationPath);

        // Save the latest commit hash
        await setCommitHash(latestCommitHash);

        // Cleanup
        await fs.remove(tempDir);

        await sendFormattedMessage(zk, chatId, `${updateComplete}\n\n${newVersion} ${latestCommitHash}\n\n${restarting}\n\n${njabuloMD}`, ms);
        
        // Restart bot
        setTimeout(() => {
            process.exit(0);
        }, 3000);
        
    } catch (error) {
        console.error("Update error:", error);
        await sendFormattedMessage(zk, chatId, `${updateFailed}\n\n${error.message}\n\n${tryManual}\n\n${njabuloMD}`, ms);
    }
});

// ── VERSION COMMAND (Check current version) ─────────────────────────────
fana({
    nomCom: "version",
    alias: ["ver", "current"],
    categorie: "Owner",
    reaction: "📌",
}, async (chatId, zk, commandeOptions) => {
    const { ms, repondre, superUser } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    // ========== TRANSLATED TEXTS ==========
    const accessDenied = await translateText("❌ *Access Denied*\n\nThis command is only for the bot owner.", lang);
    const currentBotVersion = await translateText("📌 *Current Bot Version*", lang);
    const commitLabel = await translateText("🔖 Commit:", lang);
    const lastUpdated = await translateText("📅 Last updated:", lang);
    const njabuloMD = await translateText("💫 NJABULO MD", lang);
    const noVersionInfo = await translateText("📌 *No version info found*", lang);
    const runUpdate = await translateText("Please run .update to get the latest version.", lang);

    if (!superUser) {
        return sendFormattedMessage(zk, chatId, accessDenied, ms);
    }

    const currentHash = await getCommitHash();
    
    if (currentHash) {
        await sendFormattedMessage(zk, chatId, `${currentBotVersion}\n\n${commitLabel} ${currentHash}\n${lastUpdated} ${new Date().toLocaleString()}\n\n${njabuloMD}`, ms);
    } else {
        await sendFormattedMessage(zk, chatId, `${noVersionInfo}\n\n${runUpdate}\n\n${njabuloMD}`, ms);
    }
});
