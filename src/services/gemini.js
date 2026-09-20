const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const config = require('../config/env');

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

async function analyzeSlip(imageUrl) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const base64Image = Buffer.from(response.data).toString("base64");
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

        // Prompt Engineering 
        const prompt = `
            คุณคือ AI ผู้เชี่ยวชาญด้านบัญชี นี่คือภาพสลิปโอนเงิน (e-Slip) ที่ผู้ใช้ส่งมาให้คุณวิเคราะห์ กรุณาดึงข้อมูลสำคัญออกมาในรูปแบบ JSON Object ตาม Schema ด้านล่างนี้เท่านั้น:
            {
                "amount": "ยอดเงิน (เป็นตัวเลขทศนิยมสองตำแหน่ง เช่น 12300.00)",
                "date": "วันที่ทำรายการ (แปลงเป็นรูปแบบ วัน เดือน ปี เช่น 17 ธ.ค. 2024)",
                "category": "หมวดหมู่ค่าใช้จ่าย (วิเคราะห์จากชื่อผู้รับเงิน เช่น อาหาร, เดินทาง/คมนาคม, ช้อปปิ้ง, โอนเงิน/อื่นๆ)",
                "name": "ชื่อร้านค้า หรือ ชื่อบัญชีผู้รับเงิน",
                "referenceNo": "เลขที่อ้างอิง หรือ รหัสอ้างอิงของสลิป"
            }
            หากไม่ใช่รูปใบเสร็จ หรือไม่สามารถดึงข้อมูลได้ หรือไม่พบข้อมูล ไม่สารถบอกได้ว่าเป็นสลิป ให้ตอบกลับ JSON Object ที่มีค่าเป็น "-" หรือ "ไม่ระบุ" ในทุกฟิลด์ เช่น:
            ไม่ต้องเก็บข้อมูล
        
            กรุณาวิเคราะห์และดึงข้อมูลต่อไปนี้ออกมา:
            1. "amount": ยอดเงิน (เป็นตัวเลขทศนิยมสองตำแหน่ง เช่น 12300.00)
            2. "date": วันที่ทำรายการ (แปลงเป็นรูปแบบ วัน เดือน ปี เช่น 17 ธ.ค. 2024)
            3. "category": หมวดหมู่ค่าใช้จ่าย (วิเคราะห์จากชื่อผู้รับเงิน เช่น อาหาร, เดินทาง/คมนาคม, ช้อปปิ้ง, โอนเงิน/อื่นๆ)
            4. "name": ชื่อร้านค้า หรือ ชื่อบัญชีผู้รับเงิน
            5. "referenceNo": เลขที่อ้างอิง หรือ รหัสอ้างอิงของสลิป
            
            ข้อควรระวัง: ตอบกลับมาในรูปแบบ JSON Object เท่านั้น ห้ามมีข้อความอื่นหรือ Markdown ปนเด็ดขาด ตัวอย่าง:
            {
                "amount": "12300.00",
                "date": "17 ธ.ค. 2024",
                "category": "เดินทาง/คมนาคม",
                "name": "Star Pink Tour",
                "referenceNo": "0263424242"
            }
        `;

        const imagePart = {
            inlineData: { data: base64Image, mimeType: "image/jpeg" }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        
        return responseText;

    } catch (error) {
        console.error("❌ Gemini API Error:", error.message);
        throw new Error("วิเคราะห์สลิปไม่สำเร็จ");
    }
}

module.exports = { analyzeSlip };