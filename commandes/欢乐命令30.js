const { fana } = require('../njabulo/fana');
const { attribuerUnevaleur } = require('../bdd/welcome');
const config = require("../set");
const axios = require("axios");

// ========== GOOGLE TRANSLATE API ==========
let translateText = async (text, targetLang) => {
    try {
        if (!targetLang || targetLang === 'en') return text;
        try {
            const { translate } = require('@vitalets/google-translate-api');
            const result = await translate(text, { to: targetLang });
            return result.text;
        } catch (e) {
            // Fallback to MyMemory API
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

// ========== GET TRANSLATED BUTTONS ==========
async function getTranslatedButtons() {
    const lang = config.LANGUAGE || "en";
    const waChannel = await translateText("🌐 channel", lang);
    return { waChannel };
}

// ========== CREATE DYNAMIC BUTTONS ==========
async function createButtons() {
    const btn = await getTranslatedButtons();
    return [{
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
            display_text: btn.waChannel,
            id: "backup channel",
            url: config.GURL
        }),
    }];
}

// ========== TRANSLATED MESSAGE TEMPLATES ==========
async function getTranslatedMessages(nomCom) {
    const lang = config.LANGUAGE || "en";
    
    // Format command names for display
    const commandDisplay = nomCom.charAt(0).toUpperCase() + nomCom.slice(1);
    
    return {
        headerHelp: await translateText(`${commandDisplay} on to activate and ${commandDisplay} off to deactivate`, lang),
        headerStatus: await translateText(`${commandDisplay} is now set to`, lang),
        headerError: await translateText('Use "on" to activate or "off" to deactivate', lang),
        headerPermission: await translateText('You don\'t have permission to use this command', lang),
        commandDisplay: commandDisplay,
        statusOn: await translateText('ON', lang),
        statusOff: await translateText('OFF', lang)
    };
}

async function events(nomCom) {
    fana({
        nomCom: nomCom,
        categorie: 'Group'
    }, async (dest, zk, commandeOptions) => {
        const {
            ms,
            arg,
            repondre,
            superUser,
            verifAdmin
        } = commandeOptions;
        
        // ========== TRANSLATE ALL CONTENT ==========
        const buttons = await createButtons();
        const messages = await getTranslatedMessages(nomCom);
        
        if (verifAdmin || superUser) {
            if (!arg[0] || arg.join(' ') === ' ') {
                await zk.sendMessage(dest, {
                    interactiveMessage: {
                        header: messages.headerHelp,
                        buttons: buttons,
                        headerType: 1
                    }
                }, { quoted: ms });
            } else {
                if (arg[0] === 'on' || arg[0] === 'off') {
                    await attribuerUnevaleur(dest, nomCom, arg[0]);
                    
                    // Determine status text based on arg[0]
                    const statusText = arg[0] === 'on' ? messages.statusOn : messages.statusOff;
                    
                    await zk.sendMessage(dest, {
                        interactiveMessage: {
                            header: `${messages.headerStatus} ${statusText}`,
                            buttons: buttons,
                            headerType: 1
                        }
                    }, { quoted: ms });
                } else {
                    await zk.sendMessage(dest, {
                        interactiveMessage: {
                            header: messages.headerError,
                            buttons: buttons,
                            headerType: 1
                        }
                    }, { quoted: ms });
                }
            }
        } else {
            await zk.sendMessage(dest, {
                interactiveMessage: {
                    header: messages.headerPermission,
                    buttons: buttons,
                    headerType: 1
                }
            }, { quoted: ms });
        }
    });
}

// ========== REGISTER ALL COMMANDS ==========
events('welcome');
events('goodbye');
events('antipromote');
events('antidemote');
