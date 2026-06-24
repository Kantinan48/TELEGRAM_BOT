// src/index.js
const config = require('./config/env');
const bot = require('./bot/telegram'); // นำเข้า Bot จากโฟลเดอร์ bot

console.log("🚀 TeleExpense System is starting...");

// สั่งให้ Bot เริ่มทำงาน (Polling)
bot.launch().then(() => {
    console.log("✅ Telegram Bot is ONLINE and ready! (กำลังรอรับข้อความ...)");
}).catch((err) => {
    console.error("❌ Failed to start Telegram Bot:", err);
});

// Best Practice: จัดการการปิดโปรแกรมอย่างปลอดภัย (Graceful Shutdown)
// เพื่อไม่ให้ Bot ค้างในระบบเวลาเรากด Ctrl+C ปิด Terminal
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));