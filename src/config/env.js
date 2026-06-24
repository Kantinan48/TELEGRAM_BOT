require('dotenv').config();

const config = {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    geminiApiKey: process.env.GEMINI_API_KEY,
    port: process.env.PORT || 3000
};

if (!config.telegramBotToken || !config.geminiApiKey) {
    console.error("❌ ERROR: ตัวแปรในไฟล์ .env ไม่ครบ! กรุณาตรวจสอบ TELEGRAM_BOT_TOKEN และ GEMINI_API_KEY");
    process.exit(1); // สั่งหยุดการทำงานทันที
}

module.exports = config;