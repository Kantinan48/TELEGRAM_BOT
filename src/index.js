// src/index.js
const express = require('express');
const config = require('./config/env');
const bot = require('./bot/telegram');

// --- 1. สร้าง Web Server จำลองให้ Cloud รู้ว่าแอปยังทำงานอยู่ ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('✅ TeleExpense Bot is ONLINE and running!');
});

app.listen(PORT, () => {
    console.log(`🌐 Web server is running on port ${PORT}`);
});

// --- 2. สั่งให้ Bot เริ่มทำงาน ---
console.log("🚀 TeleExpense System is starting...");
bot.launch().then(() => {
    console.log("✅ Telegram Bot is ONLINE and ready!");
}).catch((err) => {
    console.error("❌ Failed to start Telegram Bot:", err);
});

// Best Practice: จัดการการปิดโปรแกรมอย่างปลอดภัย
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));