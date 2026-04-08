/**
 * IDS Multi-Link Downloader (ULTIMATE VERSION)
 * Smart Fallback: yt-dlp + Multi-API
 */

const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const TOKEN = '8782359868:AAGLuGGwmzMkefsf8KFG4pzekkpXxalRAMU';
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
const YTDLP_PATH = path.join(__dirname, 'yt-dlp');

const bot = new TelegramBot(TOKEN, { polling: true });
fs.ensureDirSync(DOWNLOAD_DIR);

async function ensureBinaries() {
    if (!fs.existsSync(YTDLP_PATH)) {
        try {
            const resp = await axios({ url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp', method: 'GET', responseType: 'stream' });
            const writer = fs.createWriteStream(YTDLP_PATH);
            resp.data.pipe(writer);
            await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
            fs.chmodSync(YTDLP_PATH, '755');
        } catch (e) {}
    }
}
ensureBinaries();

async function handleDownload(chatId, url) {
    const waitMsg = await bot.sendMessage(chatId, "⏳ **වීඩියෝව පරීක්ෂා කරමින් පවතී...**", { parse_mode: 'Markdown' });
    
    // --- STEP 1: Smart Direct API for YouTube (To bypass 403) ---
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        try {
            // Using a working public API for YouTube
            const yResponse = await axios.post('https://api.cobalt.tools/api/json', {
                url: url, vQuality: '720', vCodec: 'h264'
            }, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } }).catch(() => null);

            if (yResponse && yResponse.data && yResponse.data.url) {
                await bot.sendVideo(chatId, yResponse.data.url, { caption: "🎬 **YouTube Video Uploaded**" });
                bot.deleteMessage(chatId, waitMsg.message_id);
                return;
            }
        } catch (e) {}
    }

    // --- STEP 2: yt-dlp for everything else ---
    const fileName = `video_${Date.now()}.mp4`;
    const filePath = path.join(DOWNLOAD_DIR, fileName);
    const cmdPath = fs.existsSync(YTDLP_PATH) ? `./yt-dlp` : `yt-dlp`;
    
    // Updated yt-dlp command with better headers to avoid some blocks
    const command = `${cmdPath} -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --no-check-certificate --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36" -o "${filePath}" "${url}"`;

    exec(command, async (error) => {
        if (!error) {
            await bot.sendVideo(chatId, filePath, { caption: "🎬 **Uploaded Successfully!**" });
            fs.removeSync(filePath);
            bot.deleteMessage(chatId, waitMsg.message_id);
            return;
        }

        // --- STEP 3: Last Resort Fallback (General API) ---
        try {
            const fbResponse = await axios.get(`https://terabox-api.vkrhost.workers.dev/api?url=${url}`);
            if (fbResponse.data && fbResponse.data.download_url) {
                await bot.sendDocument(chatId, fbResponse.data.download_url, { caption: "✅ **File Uploaded**" });
                bot.deleteMessage(chatId, waitMsg.message_id);
                return;
            }
        } catch (e) {}

        bot.editMessageText("❌ **කණගාටුයි, මෙම වීඩියෝව දැනට ලබා ගත නොහැක.**", { chat_id: chatId, message_id: waitMsg.message_id });
    });
}

bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('http')) await handleDownload(msg.chat.id, msg.text);
});
bot.onText(/\/start/, (msg) => bot.sendMessage(msg.chat.id, "👋 **බෝට් සූදානම්!** ලින්ක් එක එවන්න."));
