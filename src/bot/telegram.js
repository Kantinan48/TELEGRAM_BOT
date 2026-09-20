const { Telegraf } = require('telegraf');
const config = require('../config/env');
const { analyzeSlip } = require('../services/gemini');
const { saveToGoogleSheets, updateCategoryByRef, getAdvancedSummary } = require('../services/googleSheet');
const bot = new Telegraf(config.telegramBotToken);

// Middleware: ตัวดักจับและแสดง Log 
bot.use((ctx, next) => {
    const user = ctx.from?.first_name || 'Unknown';
    const msgType = ctx.message?.text ? `ข้อความ: ${ctx.message.text}` : 'รูปภาพ/สลิป หรืออื่นๆ';
    console.log(`📩 ได้รับข้อความจาก [${user}] -> ${msgType}`);
    return next();
});

// คำสั่ง /start 
bot.start((ctx) => {
    ctx.reply(`สวัสดีครับคุณ ${ctx.from.first_name}! 👋\nยินดีต้อนรับสู่ TeleExpense Bot 💸\nพิมพ์ /help เพื่อดูคำสั่งทั้งหมด`);
});

bot.help((ctx) => {
    const helpMessage = `🤖 *เมนูคู่มือการใช้งาน บอทบัญชีอัจฉริยะ (Expense Tracker)*\nยินดีต้อนรับเข้าสู่ระบบจัดการสลิปอัตโนมัติ คำสั่งทั้งหมดมีดังนี้:\n\n` +
    `📸 *[การบันทึกบัญชี]*\n` +
    `• ส่งรูปสลิปโอนเงิน (e-Slip) ให้บอท เพื่อให้ AI วิเคราะห์และบันทึกลง Google Sheets อัตโนมัติ\n\n` +
    `✏️ *[การแก้ไขหมวดหมู่]*\n` +
    `• หลังจากส่งสลิปแล้ว หากต้องการแก้ไขหมวดหมู่ค่าใช้จ่าย ให้กดปุ่ม "แก้ไขหมวดหมู่" ที่บอทส่งกลับมา\n\n` +
    `📊 *[การเรียกดูยอดคำนวณเงินรวม]*\n` +
    `• /total ➡️ สรุปยอดรวมค่าใช้จ่ายทั้งหมดของเดือนปัจจุบัน\n` +
    `• /total day ➡️ สรุปยอดรวมค่าใช้จ่ายเฉพาะของวันนี้\n` +
    `• /total week ➡️ สรุปยอดรวมค่าใช้จ่ายสัปดาห์นี้ (7 วันย้อนหลัง)\n\n` +
    `📝 *[การเรียกดูรายละเอียดรายการย่อย]*\n` +
    `• /total day list ➡️ ดูสรุปเงินวันนี้ พร้อมรายชื่อรายละเอียดร้านย่อย\n` +
    `• /total week list ➡️ ดูสรุปเงินสัปดาห์นี้ พร้อมรายชื่อรายละเอียดร้านย่อย\n` +
    `• /total month list ➡️ ดูสรุปเงินเดือนนี้ พร้อมรายชื่อรายละเอียดร้านย่อย`;
    
    ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});
// คำสั่ง /summary 
// คำสั่งตระกูล /total 
bot.command('total', async (ctx) => {
    let loadingMessage;
    try {
        // วิเคราะห์คำสั่งที่ผู้ใช้พิมพ์มา เช่น "/total day list"
        const text = ctx.message.text.toLowerCase();
        let period = 'month'; 
        let includeList = text.includes('list');

        if (text.includes('day')) period = 'day';
        else if (text.includes('week')) period = 'week';
        else if (text.includes('month')) period = 'month';

        loadingMessage = await ctx.reply('📊 กำลังรวบรวมข้อมูลและคำนวณยอด รอดักครู่นะครับ...');

        // ส่ง ID และชื่อของผู้ใช้
        const summaryData = await getAdvancedSummary(period, includeList, ctx.from.id, ctx.from.first_name);

        if (!summaryData || summaryData.total === 0) {
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);
            return ctx.reply('📝 ยังไม่มีข้อมูลค่าใช้จ่ายในช่วงเวลาที่คุณเลือกครับ');
        }

        // จัดหัวข้อข้อความตาม Period
        let title = 'เดือนปัจจุบัน';
        if (period === 'day') title = 'วันนี้';
        if (period === 'week') title = 'สัปดาห์นี้ (7 วันย้อนหลัง)';

        let replyMessage = `📊 *สรุปยอดค่าใช้จ่าย (${title})* 📊\n\n`;
        replyMessage += `💰 *ยอดรวมทั้งสิ้น:* ${summaryData.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท\n\n`;
        replyMessage += `📑 *แยกตามหมวดหมู่:*\n`;

        // สรุปหมวดหมู่
        for (const [category, amount] of Object.entries(summaryData.categories)) {
            replyMessage += `  🔸 ${category}: ${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท\n`;
        }

        // หากมีการขอ list ให้แสดงรายละเอียดรายบัญชีด้วย
        if (includeList && summaryData.list.length > 0) {
            replyMessage += `\n📝 *รายละเอียดรายการย่อย:*\n`;
            summaryData.list.forEach((item, index) => {
                replyMessage += `${index + 1}. ${item.date} | ${item.name} ➡️ ${item.amount.toLocaleString()} บาท [${item.category}]\n`;
            });
        }

        await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);
        await ctx.reply(replyMessage, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error("❌ Telegram Bot Error (Total):", error.message);
        if (loadingMessage) {
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id).catch(() => {});
        }
        ctx.reply('😥 ขออภัยครับ เกิดข้อผิดพลาดในการดึงข้อมูล โปรดลองใหม่อีกครั้ง');
    }
});
// Event: ดักจับรูปภาพ (e-Slip)
bot.on('photo', async (ctx) => {
    let loadingMessage;
    try {
        // 1. ส่งข้อความให้ผู้ใช้
        loadingMessage = await ctx.reply('🔍 กำลังใช้ AI วิเคราะห์สลิป รอสักครู่...');

        // 2. ดึงข้อมูลรูปภาพ 
        const photoArray = ctx.message.photo;
        const highestResPhoto = photoArray[photoArray.length - 1];

        // 3. ขอ URL ของรูปภาพนั้นจาก Telegram
        const fileLink = await ctx.telegram.getFileLink(highestResPhoto.file_id);

        // 4. ส่ง URL ไปให้ Gemini Service ประมวลผล
        const aiResultString = await analyzeSlip(fileLink.href);

        // 5. Clean Code: ลบ Markdown ```json ที่ AI อาจจะใส่มา และแปลงเป็น Object
        const cleanJsonString = aiResultString.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(cleanJsonString);

        // ☁️ 6. ส่งข้อมูล JSON พร้อม ID ผู้ใช้ไปบันทึกลง Google Sheets
        await saveToGoogleSheets(aiData, ctx.from.id, ctx.from.first_name);

        // 7. สร้างชื่อไฟล์แบบ Dynamic ตามวันเวลาปัจจุบัน (ไว้โชว์ในแชท)
        const now = new Date();
        const fileName = `receipt_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.jpg`;

        // 8. จัดรูปแบบข้อความแสดงผล
        const replyMessage = `✅ บันทึกข้อมูลและเซฟสลิปสำเร็จ! \n📒 ไฟล์: ${fileName} \n📈 ข้อมูลที่ลงตารางระบบ (Expense_Data): \n🛒 ร้านค้า: ${aiData.name} \n💰 จำนวนเงิน: ${aiData.amount} บาท \n⌛ วันที่ทำรายการ: ${aiData.date} \n📃 หมวดหมู่: ${aiData.category} \n🆔เลขอ้างอิง: ${aiData.referenceNo}`;

        // 9. ส่งผลลัพธ์กลับไป และลบข้อความกำลังโหลดออก
        await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id);
        
        // ถ้าไม่มีเลขอ้างอิง (AI อ่านไม่ได้) จะไม่โชว์ปุ่มแก้
        if (aiData.referenceNo && aiData.referenceNo !== '-' && aiData.referenceNo !== 'ไม่ระบุ') {
            await ctx.reply(replyMessage, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '✏️ แก้ไขหมวดหมู่', callback_data: `edit_${aiData.referenceNo}` }]
                    ]
                }
            });
        } else {
            await ctx.reply(replyMessage);
        }

    } catch (error) {
        console.error("❌ Telegram Bot Error:", error.message);
        
        if (loadingMessage) {
            await ctx.telegram.deleteMessage(ctx.chat.id, loadingMessage.message_id).catch(() => {});
        }

        // 🟢 เพิ่มการดักจับ Error กรณีสลิปซ้ำ (UX ที่ดีต้องบอกสาเหตุที่ชัดเจน)
        if (error.message === "DUPLICATE_SLIP") {
            ctx.reply('⚠️ สลิปใบนี้ถูกบันทึกลงระบบไปแล้ว (ตรวจพบเลขอ้างอิงซ้ำ)');
        } else {
            ctx.reply('😥 ขออภัยครับ AI ไม่สามารถอ่านสลิปนี้ได้ หรือมีปัญหาการเชื่อมต่อ Google Sheets โปรดลองใหม่อีกครั้ง');
        }
    }
});

// Event: ดักจับข้อความธรรมดา 
bot.on('text', (ctx) => {
    ctx.reply('รูปสลิปโอนเงินหรือใบเสร็จเท่านั้นนะจ๊ะ 💋');
});

const categoryMap = {
    '1': 'อาหาร',
    '2': 'เดินทาง/คมนาคม',
    '3': 'ช้อปปิ้ง',
    '4': 'โอนเงิน/อื่นๆ'
};

// 1. เมื่อผู้ใช้กดปุ่ม "แก้ไขหมวดหมู่"
bot.action(/^edit_(.+)$/, async (ctx) => {
    const refNo = ctx.match[1]; 
    
    const categoryButtons = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🍽 อาหาร', callback_data: `cat_1_${refNo}` },
                    { text: '🚗 เดินทาง', callback_data: `cat_2_${refNo}` }
                ],
                [
                    { text: '🛍 ช้อปปิ้ง', callback_data: `cat_3_${refNo}` },
                    { text: '💸 อื่นๆ', callback_data: `cat_4_${refNo}` }
                ]
            ]
        }
    };

    await ctx.editMessageReplyMarkup(categoryButtons.reply_markup);
    await ctx.answerCbQuery(); // ส่งสัญญาณบอก Telegram ว่าบอทรับทราบแล้ว ปุ่มจะได้ไม่โหลดค้าง
});

bot.action(/^cat_(\d)_(.+)$/, async (ctx) => {
    const catId = ctx.match[1];
    const refNo = ctx.match[2];
    const newCategory = categoryMap[catId];

    try {
        const isUpdated = await updateCategoryByRef(refNo, newCategory, ctx.from.id, ctx.from.first_name);

        if (isUpdated) {
            const oldText = ctx.callbackQuery.message.text;
            const updatedText = oldText.replace(/📃 หมวดหมู่: .*/, `📃 หมวดหมู่: ${newCategory} (แก้ไขแล้ว ✅)`);
            
            await ctx.editMessageText(updatedText);
            await ctx.answerCbQuery(`อัปเดตเป็น ${newCategory} สำเร็จ!`);
        } else {
            await ctx.answerCbQuery('❌ ไม่พบสลิปนี้ในระบบ', { show_alert: true });
        }
    } catch (error) {
        console.error("Update Category Error:", error);
        await ctx.answerCbQuery('❌ เกิดข้อผิดพลาดในการอัปเดต', { show_alert: true });
    }
});
module.exports = bot;