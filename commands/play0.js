// commands/play0.js
async function handleButtons(zk, msg) {
    try {
        // Handle button responses
        if (msg.message?.buttonsResponseMessage) {
            const buttonId = msg.message.buttonsResponseMessage.selectedButtonId;
            const from = msg.key.remoteJid;
            
            console.log(`Button clicked: ${buttonId} from ${from}`);
            
            switch(buttonId) {
                case "view_rules":
                    await zk.sendMessage(from, { 
                        text: `📜 *GROUP RULES* 📜\n\n1. No spam\n2. No NSFW content\n3. Respect all members\n4. No links without permission\n5. Follow admin instructions\n\n*Violations may result in removal!*` 
                    });
                    break;
                case "backup channel":
                    // Already handled by URL button
                    break;
                default:
                    console.log(`Unknown button: ${buttonId}`);
            }
        }
        
        // Handle list responses
        if (msg.message?.listResponseMessage) {
            const selectedRowId = msg.message.listResponseMessage.singleSelectReply?.selectedRowId;
            console.log(`List selection: ${selectedRowId}`);
        }
        
        // Handle template button replies
        if (msg.message?.templateButtonReplyMessage) {
            const buttonId = msg.message.templateButtonReplyMessage.selectedId;
            console.log(`Template button: ${buttonId}`);
        }
        
    } catch (error) {
        console.error("Button handler error:", error);
    }
}

module.exports = { handleButtons };
