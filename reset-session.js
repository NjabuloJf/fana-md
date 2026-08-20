const fs = require('fs-extra');
const path = require('path');

// Delete session directories
const dirs = ['sessions', 'auth'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`✅ Deleted ${dir}`);
    }
});

console.log('✅ All session files cleared!');
console.log('Restart the bot to get a new QR code.');
