/**
 * IDS Multi-Link Downloader Bot (PRO Version)
 * Optimized for IDX (Using yt-dlp)
 */

const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

// --- CONFIGURATION ---
const TOKEN = '8782359868:AAGLuGGwmzMkefsf8KFG4pzekkpXxalRAMU';
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

const bot = new TelegramBot(TOKEN, { polling: true });
fs.ensureDirSync(DOWNLOAD_DIR);

console.log('🚀 IDS Multi-Downloader (PRO) is running...');

// --- DOWNLOADER LOGIC ---

async function handleDownload(chatId, url) {
    const waitMsg = await bot.sendMessage(chatId, "⏳ **වීඩියෝව හඳුනාගනිමින් පවතී...**", { parse_mode: 'Markdown' });
    const fileName = `video_${Date.now()}.mp4`;
    const filePath = path.join(DOWNLOAD_DIR, fileName);

    // yt-dlp command to get the best mp4 video
    // We use a universal approach for all social media
    const command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${filePath}" "${url}"`;

    exec(command, async (error, stdout, stderr) => {
        if (error) {
            console.error('yt-dlp error:', stderr);
            
            // Fallback for TeraBox and others
            if (url.includes('terabox') || url.includes('neardl')) {
                bot.editMessageText("🔄 **TeraBox bypass කරමින් පවතී...**", { chat_id: chatId, message_id: waitMsg.message_id });
                try {
                    const tbResponse = await axios.get(`https://terabox-api.vkrhost.workers.dev/api?url=${url}`);
                    if (tbResponse.data && tbResponse.data.download_url) {
                        await bot.sendDocument(chatId, tbResponse.data.download_url, { caption: "📦 **TeraBox File**" });
                        bot.deleteMessage(chatId, waitMsg.message_id);
                        return;
                    }
                } catch (e) {}
            }

            bot.editMessageText(`❌ **අසාර්ථකයි.**\nමෙම ලින්ක් එක දැනට ක්‍රියාත්මක නොවේ.`, {
                chat_id: chatId,
                message_id: waitMsg.message_id
            });
            return;
        }

        bot.editMessageText("📤 **එම වීඩියෝව අප්ලෝඩ් කරමින් පවතී...**", { chat_id: chatId, message_id: waitMsg.message_id });

        try {
            await bot.sendVideo(chatId, filePath, {
                caption: "🎬 **Uploaded by @ids_movie_planet**",
                supports_streaming: true
            });
            // Delete file after upload
            fs.removeSync(filePath);
            bot.deleteMessage(chatId, waitMsg.message_id);
        } catch (uploadError) {
            // If sendVideo fails, try sendDocument
            try {
                await bot.sendDocument(chatId, filePath, { caption: "🎬 **File Uploaded**" });
                fs.removeSync(filePath);
                bot.deleteMessage(chatId, waitMsg.message_id);
            } catch (e) {
                bot.editMessageText("❌ **ටෙලිග්‍රෑම් වෙත අප්ලෝඩ් කිරීමේ ගැටලුවක් මතු විය.**", { chat_id: chatId, message_id: waitMsg.message_id });
            }
        }
    });
}

// --- COMMANDS ---

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "👋 **ආයුබෝවන්!**\nඕනෑම ලින්ක් එකක් එවන්න, මම එය බාගත කර ඔබට ලබා දෙන්නම්.\n\n(YouTube, TikTok, Instagram, FB, TeraBox and more...)", { parse_mode: 'Markdown' });
});

bot.on('message', async (msg) => {
    const text = msg.text;
    if (text && text.startsWith('http')) {
        await handleDownload(msg.chat.id, text);
    }
});
