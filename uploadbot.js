/**
 * IDS Multi-Link Downloader Bot (PRO + AUTO-FIX)
 * Optimized for IDX
 * Automatically downloads required binaries if missing.
 */

const TelegramBot = require('node-telegram-bot-api');
const { exec, spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

// --- CONFIGURATION ---
const TOKEN = '8782359868:AAGLuGGwmzMkefsf8KFG4pzekkpXxalRAMU';
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
const YTDLP_PATH = path.join(__dirname, 'yt-dlp');

const bot = new TelegramBot(TOKEN, { polling: true });
fs.ensureDirSync(DOWNLOAD_DIR);

/**
 * Check and Download yt-dlp binary if not exist
 */
async function ensureBinaries() {
    if (!fs.existsSync(YTDLP_PATH)) {
        console.log('📥 yt-dlp binary missing. Downloading...');
        try {
            const response = await axios({
                url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
                method: 'GET',
                responseType: 'stream'
            });
            const writer = fs.createWriteStream(YTDLP_PATH);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            fs.chmodSync(YTDLP_PATH, '755');
            console.log('✅ yt-dlp downloaded and ready!');
        } catch (error) {
            console.error('❌ Failed to download yt-dlp:', error.message);
        }
    }
}

console.log('🚀 IDS Multi-Downloader (AUTO-FIX) is starting...');
ensureBinaries();

// --- DOWNLOADER LOGIC ---

async function handleDownload(chatId, url) {
    const waitMsg = await bot.sendMessage(chatId, "⏳ **වීඩියෝව හඳුනාගනිමින් පවතී...**", { parse_mode: 'Markdown' });
    const fileName = `video_${Date.now()}.mp4`;
    const filePath = path.join(DOWNLOAD_DIR, fileName);

    // Use current directory for yt-dlp
    const cmdPath = fs.existsSync(YTDLP_PATH) ? `./yt-dlp` : `yt-dlp`;

    const command = `${cmdPath} -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --no-check-certificate --merge-output-format mp4 -o "${filePath}" "${url}"`;

    exec(command, async (error, stdout, stderr) => {
        if (error) {
            console.error('Download Error:', stderr);
            
            // Fallback for TeraBox / Cloud
            if (url.includes('terabox') || url.includes('neardl') || url.includes('4sync') || url.includes('box.com')) {
                bot.editMessageText("🔄 **Cloud Bypass කරමින් පවතී...**", { chat_id: chatId, message_id: waitMsg.message_id });
                try {
                    const tbResponse = await axios.get(`https://terabox-api.vkrhost.workers.dev/api?url=${url}`);
                    if (tbResponse.data && tbResponse.data.download_url) {
                        await bot.sendDocument(chatId, tbResponse.data.download_url, { caption: "📦 **Cloud File Uploaded**" });
                        bot.deleteMessage(chatId, waitMsg.message_id);
                        return;
                    }
                } catch (e) {}
            }

            bot.editMessageText(`❌ **බාගත කිරීම අසාර්ථකයි.**\nමෙම වීඩියෝව දැනට ලබා ගත නොහැක.`, {
                chat_id: chatId,
                message_id: waitMsg.message_id
            });
            return;
        }

        bot.editMessageText("📤 **එම වීඩියෝව අප්ලෝඩ් කරමින් පවතී...**", { chat_id: chatId, message_id: waitMsg.message_id });

        try {
            await bot.sendVideo(chatId, filePath, {
                caption: "🎬 **Uploaded by IDS Bot**",
                supports_streaming: true
            });
            fs.removeSync(filePath);
            bot.deleteMessage(chatId, waitMsg.message_id);
        } catch (uploadError) {
            try {
                await bot.sendDocument(chatId, filePath, { caption: "🎬 **File Uploaded**" });
                fs.removeSync(filePath);
                bot.deleteMessage(chatId, waitMsg.message_id);
            } catch (e) {
                bot.editMessageText("❌ **ටෙලිග්‍රෑම් ලබා දීමේ ගැටලුවක් මතු විය.**", { chat_id: chatId, message_id: waitMsg.message_id });
            }
        }
    });
}

// --- COMMANDS ---
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "👋 **බෝට් සූදානම්!**\nඕනෑම ලින්ක් එකක් එවන්න.", { parse_mode: 'Markdown' });
});

bot.on('message', async (msg) => {
    const text = msg.text;
    if (text && text.startsWith('http')) {
        await handleDownload(msg.chat.id, text);
    }
});
