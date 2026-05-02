// ANIX-MD WhatsApp Bot
// Created by Bashiri for BOT HUB Channel

require('dotenv').config();
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

// ========== BOT CONFIGURATION ==========
global.bot = {
    name: process.env.BOT_NAME || 'ANIX-MD',
    channel: process.env.CHANNEL_NAME || 'BOT HUB',
    owner: process.env.OWNER_NAME || 'Bashiri',
    ownerNumber: process.env.OWNER_NUMBER || '',
    prefix: process.env.PREFIX || '.',
    newsletter: process.env.NEWSLETTER_ID || '120363405445990040@newsletter',
    logo: 'https://i.ibb.co/9HhnWmCP/136913.jpg',
    version: '1.0.0',
    startTime: Date.now()
};

// ========== BRANDED STARTUP BANNER ==========
console.log('');
console.log('╔═══════════════════════════════════════╗');
console.log('║     🤖 ANIX-MD by Bashiri 🤖           ║');
console.log('║     📢 BOT HUB Channel                ║');
console.log('╚═══════════════════════════════════════╝');
console.log(`║ Logo: ${global.bot.logo}`);
console.log(`║ Version: ${global.bot.version}`);
console.log('╚═══════════════════════════════════════╝');
console.log('');

// ========== COMMAND LOADER ==========
global.commands = new Map();

function loadCommands(dir, category) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            loadCommands(filePath, category);
        } else if (file.endsWith('.js')) {
            try {
                const cmd = require(filePath);
                if (cmd.name) {
                    cmd.category = category || path.basename(dir);
                    global.commands.set(cmd.name, cmd);
                    console.log(`✅ Loaded: ${cmd.name}`);
                }
            } catch (err) {
                console.log(`❌ Failed to load ${file}: ${err.message}`);
            }
        }
    }
}

// Create commands directory if it doesn't exist
if (!fs.existsSync('./commands')) {
    fs.mkdirSync('./commands', { recursive: true });
    fs.mkdirSync('./commands/general', { recursive: true });
    console.log('📁 Created commands/general folder');
}

loadCommands('./commands', 'general');
console.log(`📊 Total commands loaded: ${global.commands.size}\n`);

// ========== DEFAULT FALLBACK COMMANDS (if no command files exist) ==========
if (global.commands.size === 0) {
    console.log('⚠️ No command files found. Using built-in fallback commands.');
    
    global.commands.set('ping', {
        name: 'ping',
        execute: async (sock, msg, args, from) => {
            await sock.sendMessage(from, { text: '🏓 Pong! ANIX-MD is alive!' });
        }
    });
    
    global.commands.set('owner', {
        name: 'owner',
        execute: async (sock, msg, args, from) => {
            const text = `🤖 *${global.bot.name}*\n👑 Owner: ${global.bot.owner}\n📢 Channel: ${global.bot.channel}\n📱 Newsletter: ${global.bot.newsletter}\n🖼️ Logo: ${global.bot.logo}`;
            await sock.sendMessage(from, { text });
        }
    });
    
    global.commands.set('menu', {
        name: 'menu',
        execute: async (sock, msg, args, from) => {
            const menu = `╭━━━━━【 ${global.bot.name} 】━━━━━╮
┃
┃ 🤖 *Bot Info:*
┃ ▸ Name: ${global.bot.name}
┃ ▸ Owner: ${global.bot.owner}
┃ ▸ Channel: ${global.bot.channel}
┃
┃ 📜 *Available Commands:*
┃
┃ ▸ ${global.bot.prefix}ping - Check bot status
┃ ▸ ${global.bot.prefix}owner - Show owner info
┃ ▸ ${global.bot.prefix}menu - Show this menu
┃ ▸ ${global.bot.prefix}time - Current time
┃ ▸ ${global.bot.prefix}runtime - Bot uptime
┃
┃ 📢 *Join BOT HUB on WhatsApp*
┃
╰━━━━━━━━━━━━━━━━━━━╯`;
            await sock.sendMessage(from, { text: menu });
        }
    });
    
    global.commands.set('time', {
        name: 'time',
        execute: async (sock, msg, args, from) => {
            const now = new Date();
            const timeStr = now.toLocaleString();
            await sock.sendMessage(from, { text: `🕐 Current time: ${timeStr}` });
        }
    });
    
    global.commands.set('runtime', {
        name: 'runtime',
        execute: async (sock, msg, args, from) => {
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            await sock.sendMessage(from, { text: `⏱️ Bot Uptime: ${days}d ${hours}h ${minutes}m ${seconds}s` });
        }
    });
    
    console.log('✅ Loaded 5 fallback commands');
}

// ========== WHATSAPP CONNECTION ==========
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: [global.bot.name, 'Chrome', global.bot.version],
        logger: pino({ level: 'silent' })
    });

    // QR Code display
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('📱 Scan this QR code with your WhatsApp:');
            qrcode.generate(qr, { small: true });
            console.log('💡 Tip: Go to WhatsApp > Linked Devices > Link a Device');
        }
        
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error).output.statusCode;
            console.log(`⚠️ Connection closed: ${reason}`);
            if (reason !== 401 && reason !== 405) {
                console.log('🔄 Reconnecting in 5 seconds...');
                setTimeout(startBot, 5000);
            } else {
                console.log('❌ Session expired. Delete "auth_info" folder and restart.');
            }
        } else if (connection === 'open') {
            console.log('');
            console.log('═══════════════════════════════════════');
            console.log(`✅ ${global.bot.name} is ONLINE!`);
            console.log(`👑 Owner: ${global.bot.owner}`);
            console.log(`📢 Channel: ${global.bot.channel}`);
            console.log(`📊 Commands: ${global.commands.size}`);
            console.log('═══════════════════════════════════════');
            console.log('');
        }
    });

    // Save credentials
    sock.ev.on('creds.update', saveCreds);

    // Message handler
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const from = msg.key.remoteJid;
        let messageText = '';
        
        if (msg.message.conversation) {
            messageText = msg.message.conversation;
        } else if (msg.message.extendedTextMessage?.text) {
            messageText = msg.message.extendedTextMessage.text;
        } else {
            return; // Not a text message
        }
        
        if (!messageText.startsWith(global.bot.prefix)) return;
        
        const args = messageText.slice(global.bot.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        const command = global.commands.get(commandName);
        if (command) {
            console.log(`📩 Command: ${commandName} from ${from}`);
            try {
                await command.execute(sock, msg, args, from);
            } catch (err) {
                console.error(`❌ Error in ${commandName}:`, err);
                await sock.sendMessage(from, { text: '❌ Command error! Please try again.' });
            }
        }
    });
}

// ========== START THE BOT ==========
startBot().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
