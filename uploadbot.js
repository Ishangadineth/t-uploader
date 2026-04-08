/**
 * IDS Multi-Link Downloader (MTProto PRO)
 * Fixed Event Handlers
 */

const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const apiId = 36437118;
const apiHash = "0f5923b0fdee99f860a523ffbcb78ca5";
const botToken = "8782359868:AAGLuGGwmzMkefsf8KFG4pzekkpXxalRAMU";

const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
const YTDLP_PATH = path.join(__dirname, 'yt-dlp');
fs.ensureDirSync(DOWNLOAD_DIR);

const stringSession = new StringSession("");

(async () => {
    const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
    await client.start({ botAuthToken: botToken });
    console.log("✅ Bot is Online and Listening...");

    client.addEventHandler(async (event) => {
        const message = event.message;
        if (!message || !message.text) return;

        const text = message.text;
        const chatId = message.peerId;

        if (text.startsWith("/start")) {
            await client.sendMessage(chatId, { message: "👋 **බෝට් සූදානම්!**\n\nදැන් ඕනෑම ලින්ක් එකක් එවන්න. 2GB දක්වා ඕනෑම වීඩියෝවක් මම අප්ලෝඩ් කර දෙන්නම්." });
            return;
        }

        if (text.startsWith("http")) {
            const waitMsg = await client.sendMessage(chatId, { message: "⏳ **වීඩියෝව පරීක්ෂා කරමින් පවතී...**" });
            const fileName = `video_${Date.now()}.mp4`;
            const filePath = path.join(DOWNLOAD_DIR, fileName);

            // YouTube / Short Links using Cobalt API
            if (text.includes('youtube.com') || text.includes('youtu.be') || text.includes('tiktok.com')) {
                try {
                    const yResponse = await axios.post('https://api.cobalt.tools/api/json', { url: text, vQuality: '720' }, { headers: { 'Accept': 'application/json' } }).catch(() => null);
                    if (yResponse && yResponse.data && yResponse.data.url) {
                        await client.sendFile(chatId, { file: yResponse.data.url, caption: "🎬 **Video Processed Successfully**" });
                        await client.deleteMessages(chatId, [waitMsg.id], { revoke: true });
                        return;
                    }
                } catch (e) {}
            }

            // yt-dlp fallback
            const cmd = `./yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --no-check-certificate -o "${filePath}" "${text}"`;
            
            exec(cmd, async (error) => {
                if (error) {
                    await client.editMessage(chatId, { message: waitMsg.id, text: "❌ **බාගත කිරීම අසාර්ථකයි.**\nමෙම වීඩියෝව දැනට ලබා ගත නොහැක." });
                    return;
                }

                await client.editMessage(chatId, { message: waitMsg.id, text: "📤 **වීඩියෝව අප්ලෝඩ් වෙමින් පවතී...**" });

                try {
                    await client.sendFile(chatId, {
                        file: filePath,
                        caption: "🎬 **Uploaded by IDS Bot**",
                        workers: 8,
                        supportsStreaming: true,
                    });
                    fs.removeSync(filePath);
                    await client.deleteMessages(chatId, [waitMsg.id], { revoke: true });
                } catch (err) {
                    await client.editMessage(chatId, { message: waitMsg.id, text: "❌ **අප්ලෝඩ් කිරීමේ ගැටලුවක් මතු විය.**" });
                }
            });
        }
    }, new NewMessage({}));

})();
