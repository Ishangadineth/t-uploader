/**
 * IDS Multi-Link Downloader Bot
 * Highly Optimized for Node.js (IDX Environment)
 * Supports: TikTok, YT, Insta, FB, Mega, G-Drive, TeraBox, Direct Links
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// --- CONFIGURATION ---
const TOKEN = '8782359868:AAGLuGGwmzMkefsf8KFG4pzekkpXxalRAMU'; // ඔබේ Bot Token එක මෙහි ඇතුළත් කරන්න
const ADMIN_IDS = [8512163462]; // ඇඩ්මින් ලැයිස්තුව
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');

// Initialize Bot
const bot = new TelegramBot(TOKEN, { polling: true });

// Ensure download directory exists
fs.ensureDirSync(DOWNLOAD_DIR);

console.log('🚀 IDS Multi-Downloader Bot is running...');

// --- HELPER FUNCTIONS ---

const formatMessage = (text) => {
    return text;
};

const sendError = (chatId, errorMsg) => {
    bot.sendMessage(chatId, `❌ **Error:** ${errorMsg}`, { parse_mode: 'Markdown' });
};

const getFileNameFromUrl = (url) => {
    const parts = url.split('/');
    return parts[parts.length - 1].split('?')[0] || 'file_uploaded';
};

// --- DOWNLOADER LOGIC ---

/**
 * Handle Social Media Links (TikTok, YT, Insta, FB, etc.)
 */
async function handleSocialMedia(chatId, url) {
    const waitMsg = await bot.sendMessage(chatId, "⏳ **Social Media වීඩියෝව සකස් කරමින් පවතී...**", { parse_mode: 'Markdown' });

    try {
        // Using Cobalt API (A very powerful open-source downloader api)
        const response = await axios.post('https://api.cobalt.tools/api/json', {
            url: url,
            videoQuality: '720',
            filenameStyle: 'basic'
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;

        if (data.status === 'error') {
            throw new Error(data.text);
        }

        if (data.url) {
            await bot.sendVideo(chatId, data.url, {
                caption: `🎬 **Uploaded by IDS Bot**\n\n🔗 [Original Link](${url})`,
                parse_mode: 'Markdown'
            });
        } else if (data.picker) {
            // Some links (like TikTok slides) return multiple items
            for (const item of data.picker) {
                if (item.type === 'video' || item.type === 'photo') {
                    await bot.sendDocument(chatId, item.url);
                }
            }
        }

        bot.deleteMessage(chatId, waitMsg.message_id);
    } catch (error) {
        console.error('Social Media Error:', error);
        bot.editMessageText(`❌ **හඳුනාගත නොහැකි ලින්ක් එකක් හෝ error එකක් සිදු වුණා.**\n\nError: ${error.message}`, {
            chat_id: chatId,
            message_id: waitMsg.message_id,
            parse_mode: 'Markdown'
        });
    }
}

/**
 * Handle Cloud Storage & Direct Links
 */
async function handleCloudAndDirect(chatId, url) {
    const waitMsg = await bot.sendMessage(chatId, "⏳ **Cloud/Direct ලින්ක් එක පරීක්ෂා කරමින් පවතී...**", { parse_mode: 'Markdown' });

    try {
        // Special Handling for TeraBox (Bypass API)
        if (url.includes('terabox') || url.includes('neardl') || url.includes('4sync')) {
            bot.editMessageText("🔄 **TeraBox ලින්ක් එක Bypass කරමින් පවතී...**", { chat_id: chatId, message_id: waitMsg.message_id, parse_mode: 'Markdown' });
            
            // Note: TeraBox bypass requires a working API. 
            // Here we use a common public bypass structure (replace with yours if you have a private one)
            const tbResponse = await axios.get(`https://terabox-api.vkrhost.workers.dev/api?url=${url}`);
            if (tbResponse.data && tbResponse.data.download_url) {
                await bot.sendDocument(chatId, tbResponse.data.download_url, {
                    caption: `📦 **TeraBox File Uploaded!**`,
                    parse_mode: 'Markdown'
                });
            } else {
                throw new Error("TeraBox link bypass failed.");
            }
        } 
        // Google Drive (Direct link check)
        else if (url.includes('drive.google.com')) {
            const fileId = url.match(/\/d\/(.+?)\//);
            if (fileId && fileId[1]) {
                const directLink = `https://to-direct-link.com/api/gdrive?id=${fileId[1]}`; // Example GDrive API
                await bot.sendDocument(chatId, directLink, { caption: "📂 **Google Drive File**" });
            }
        }
        // Direct Links or Fallback
        else {
            await bot.sendDocument(chatId, url, {
                caption: `✅ **Direct Link Uploaded!**`,
                parse_mode: 'Markdown'
            });
        }

        bot.deleteMessage(chatId, waitMsg.message_id);
    } catch (error) {
        bot.editMessageText(`❌ **අප්ලෝඩ් කිරීම අසාර්ථකයි.**\nමෙය සෘජු ලින්ක් එකක් (Direct Link) නොවිය හැක.`, {
            chat_id: chatId,
            message_id: waitMsg.message_id,
            parse_mode: 'Markdown'
        });
    }
}

// --- BOT COMMANDS ---

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeText = `👋 **ආයුබෝවන්! මම IDS Multi-Link Downloader බෝට්.**\n\n` +
        `මට ඕනෑම Social Media ලින්ක් එකක් හෝ Cloud ලින්ක් එකක් එවන්න. මම එය ඔබට කෙලින්ම අප්ලෝඩ් කර දෙන්නම්.\n\n` +
        `✅ **සහාය දක්වන සේවාවන්:**\n` +
        `• YouTube, TikTok, Facebook, Instagram\n` +
        `• Mega, Google Drive, TeraBox\n` +
        `• Direct Video/File Links`;
    
    bot.sendMessage(chatId, welcomeText, { 
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[{ text: "Support Group", url: "https://t.me/ids_movie_planet" }]]
        }
    });
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/')) return;

    if (text.startsWith('http')) {
        // Social Media Domains
        const socialDomains = ['tiktok.com', 'youtube.com', 'youtu.be', 'instagram.com', 'facebook.com', 'fb.watch', 'twitter.com', 'x.com', 'threads.net'];
        const isSocial = socialDomains.some(domain => text.includes(domain));

        if (isSocial) {
            await handleSocialMedia(chatId, text);
        } else {
            await handleCloudAndDirect(chatId, text);
        }
    }
});

// --- ADMIN COMMANDS ---
bot.onText(/\/stats/, (msg) => {
    if (!ADMIN_IDS.includes(msg.from.id)) return;
    bot.sendMessage(msg.chat.id, "📊 **Bot Status:** Active\nEnvironment: Google IDX (Node.js)");
});
