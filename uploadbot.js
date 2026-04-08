/**
 * IDS Multi-Link Downloader (MTProto PRO)
 * Supports up to 2GB uploads using GramJS
 */

const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

// --- CREDENTIALS ---
const apiId = 36437118;
const apiHash = "0f5923b0fdee99f860a523ffbcb78ca5";
const botToken = "8782359868:AAGLuGGwmzMkefsf8KFG4pzekkpXxalRAMU";

const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
const YTDLP_PATH = path.join(__dirname, 'yt-dlp');
fs.ensureDirSync(DOWNLOAD_DIR);

const stringSession = new StringSession(""); // Empty for Bot Login

(async () => {
    console.log("🚀 Starting IDS MTProto Uploader...");
    
    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.start({
        botAuthToken: botToken,
    });

    console.log("✅ Bot is Online (MTProto Mode Enabled)");

    // Ensure yt-dlp exists
    if (!fs.existsSync(YTDLP_PATH)) {
        console.log("📥 Downloading yt-dlp...");
        const resp = await axios({ url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp', method: 'GET', responseType: 'stream' });
        const writer = fs.createWriteStream(YTDLP_PATH);
        resp.data.pipe(writer);
        await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
        fs.chmodSync(YTDLP_PATH, '755');
    }

    // --- Message Handler ---
    client.addEventHandler(async (event) => {
        const message = event.message;
        if (!message || !message.text) return;

        const text = message.text;
        const chatId = message.chatId.toString();

        if (text === "/start") {
            await client.sendMessage(chatId, { message: "👋 **බෝට් සූදානම්!** ඕනෑම ලින්ක් එකක් එවන්න (2GB දක්වා සහය දක්වයි)." });
            return;
        }

        if (text.startsWith("http")) {
            const waitMsg = await client.sendMessage(chatId, { message: "⏳ **වීඩියෝව හඳුනාගනිමින් පවතී...**" });
            const fileName = `video_${Date.now()}.mp4`;
            const filePath = path.join(DOWNLOAD_DIR, fileName);

            // YT Fallsback for speed
            if (text.includes('youtube.com') || text.includes('youtu.be')) {
                try {
                    const yResponse = await axios.post('https://api.cobalt.tools/api/json', { url: text, vQuality: '720' }, { headers: { 'Accept': 'application/json' } }).catch(() => null);
                    if (yResponse && yResponse.data && yResponse.data.url) {
                        await client.sendFile(chatId, { file: yResponse.data.url, caption: "🎬 **YouTube Video Uploaded**", parseMode: 'html' });
                        await client.deleteMessages(chatId, [waitMsg.id], { revoke: true });
                        return;
                    }
                } catch (e) {}
            }

            // yt-dlp for everything else (or if API fails)
            const cmd = `./yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --no-check-certificate -o "${filePath}" "${text}"`;
            
            exec(cmd, async (error, stdout, stderr) => {
                if (error) {
                    await client.editMessage(chatId, { message: waitMsg.id, text: "❌ **බාගත කිරීම අසාර්ථකයි.**" });
                    return;
                }

                await client.editMessage(chatId, { message: waitMsg.id, text: "📤 **ලොකු වීඩියෝවක් බැවින් අප්ලෝඩ් වීමට මද වෙලාවක් ගතවේ...**" });

                try {
                    // GramJS handles large files automatically using MTProto chunks
                    await client.sendFile(chatId, {
                        file: filePath,
                        caption: "🎬 **Uploaded by IDS Bot (High Quality)**",
                        workers: 4, // More workers for faster upload
                        supportsStreaming: true,
                    });
                    fs.removeSync(filePath);
                    await client.deleteMessages(chatId, [waitMsg.id], { revoke: true });
                } catch (err) {
                    console.error("Upload Error:", err);
                    await client.editMessage(chatId, { message: waitMsg.id, text: "❌ **අප්ලෝඩ් කිරීමේ ගැටලුවක් මතු විය.**" });
                }
            });
        }
    });

})();
