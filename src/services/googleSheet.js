// src/services/googleSheet.js
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// โหลดไฟล์กุญแจที่ต้องอยู่ในโฟลเดอร์ src/config/
const creds = require('../config/google-credentials.json'); 

// Spreadsheet ID ของคุณ
const SPREADSHEET_ID = '11uBiA2dDH7kv9g-cipupmvK97Nn2S5vHYC75h37MQAI';

async function saveToGoogleSheets(aiData) {
    try {
        // 1. ตั้งค่าการยืนยันตัวตน
        const serviceAccountAuth = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        // 2. เชื่อมต่อ Google Sheets
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
        await doc.loadInfo(); 
        const sheet = doc.sheetsByIndex[0];

        // 3. สร้าง Header ถ้าตารางว่างเปล่า
        // (เช็ก rowCount เผื่อกรณีไฟล์ใหม่ที่ยังไม่มีข้อมูลเลย)
        const rows = await sheet.getRows();
        if (rows.length === 0 && sheet.rowCount <= 1) {
            await sheet.setHeaderRow(['Timestamp', 'Date', 'Name', 'Category', 'Amount', 'ReferenceNo']);
            console.log("📝 [Google Sheets] สร้าง Header ใหม่เรียบร้อย");
        }

        // 4. ตรวจสอบสลิปซ้ำ (Duplicate Check)
        // ตรวจสอบเฉพาะกรณีที่มีเลข ReferenceNo และไม่ใช่ค่าว่างหรือค่า '-'
        const currentRefNo = aiData.referenceNo;
        if (currentRefNo && currentRefNo !== '-' && currentRefNo !== 'ไม่ระบุ') {
            
            // เช็กทุกแถวว่ามีเลข Ref นี้อยู่แล้วหรือไม่
            const isDuplicate = rows.some(row => row.get('ReferenceNo') === currentRefNo);

            if (isDuplicate) {
                console.log(`⚠️ [Google Sheets] ปฏิเสธการบันทึก: พบสลิปซ้ำ (เลขอ้างอิง: ${currentRefNo})`);
                // ส่ง Error พิเศษนี้ไปให้ Telegram Bot จัดการต่อ
                throw new Error("DUPLICATE_SLIP"); 
            }
        }

        // 5. บันทึกข้อมูลบรรทัดใหม่
        await sheet.addRow({
            Timestamp: new Date().toLocaleString('th-TH'),
            Date: aiData.date || '-',
            Name: aiData.name || 'ไม่ระบุ',
            Category: aiData.category || 'อื่นๆ',
            Amount: parseFloat(String(aiData.amount).replace(/,/g, '')) || 0,
            ReferenceNo: currentRefNo || '-'
        });

        console.log("☁️ [Google Sheets] บันทึกข้อมูลขึ้น Cloud สำเร็จ!");
        
    } catch (error) {
        // ถ้าเป็น Error สลิปซ้ำ ให้โยนต่อออกไปเพื่อแจ้งเตือนผู้ใช้
        if (error.message === "DUPLICATE_SLIP") throw error;
        
        // ถ้าเป็น Error อื่น ให้ log และแจ้งเตือนทั่วไป
        console.error("❌ [Google Sheets] Error:", error.message);
        throw new Error("ไม่สามารถบันทึกข้อมูลลง Google Sheets ได้");
    }
}

// ฟังก์ชันสำหรับดึงข้อมูลมาสรุปยอด
// --- ระบบจัดการวันที่และคำนวณยอด (Advanced Analytics) ---

// 1. ฟังก์ชันช่วยแปลงวันที่ภาษาไทย (เช่น "17 ธ.ค. 2024") เป็น JavaScript Date
function parseThaiDate(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr === 'ไม่ระบุ') return null;
    const months = { 'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3, 'พ.ค.': 4, 'มิ.ย.': 5, 'ก.ค.': 6, 'ส.ค.': 7, 'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11 };
    
    const parts = dateStr.split(' ');
    if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const month = months[parts[1]];
        let year = parseInt(parts[2]);
        
        // แปลง พ.ศ. เป็น ค.ศ. (เผื่อ AI ส่งมาเป็น 2567)
        if (year > 2500) year -= 543; 

        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return new Date(year, month, day);
        }
    }
    return null;
}

// 2. ฟังก์ชันสรุปยอดแบบกำหนดช่วงเวลา (day, week, month) และดึงรายการย่อย (list)
async function getAdvancedSummary(period = 'month', includeList = false) {
    try {
        const serviceAccountAuth = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();

        if (rows.length === 0) return null;

        // กำหนดเวลา "วันนี้" เพื่อใช้เป็นจุดอ้างอิง
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let totalAmount = 0;
        let categorySummary = {};
        let transactionList = [];

        // วนลูปเช็กข้อมูลทุกบรรทัด
        rows.forEach(row => {
            const dateStr = row.get('Date');
            const rowDate = parseThaiDate(dateStr);
            if (!rowDate) return; // ข้ามถ้ารูปแบบวันที่ผิด

            rowDate.setHours(0, 0, 0, 0);
            let isIncluded = false;

            // ตรรกะการกรองเวลา (Time Filtering Logic)
            if (period === 'day') {
                isIncluded = rowDate.getTime() === now.getTime();
            } else if (period === 'week') {
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 7);
                isIncluded = rowDate >= sevenDaysAgo && rowDate <= now;
            } else { // 'month'
                isIncluded = rowDate.getMonth() === now.getMonth() && rowDate.getFullYear() === now.getFullYear();
            }

            // ถ้าอยู่ในช่วงเวลาที่กำหนด ให้นำมาคำนวณ
            if (isIncluded) {
                const amount = parseFloat(row.get('Amount')) || 0;
                const category = row.get('Category') || 'อื่นๆ';
                const name = row.get('Name') || 'ไม่ระบุ';

                totalAmount += amount;
                categorySummary[category] = (categorySummary[category] || 0) + amount;

                if (includeList) {
                    transactionList.push({ date: dateStr, name, amount, category });
                }
            }
        });

        return { total: totalAmount, categories: categorySummary, list: transactionList, period };

    } catch (error) {
        console.error("❌ [Google Sheets] Error getting summary:", error.message);
        throw new Error("ไม่สามารถดึงข้อมูลสรุปยอดได้");
    }
}

// ฟังก์ชันสำหรับอัปเดตหมวดหมู่
async function updateCategoryByRef(referenceNo, newCategory) {
    try {
        const serviceAccountAuth = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows();
        
        // ค้นหาบรรทัดที่มี ReferenceNo ตรงกับสลิป
        const rowToUpdate = rows.find(row => row.get('ReferenceNo') === referenceNo);
        
        if (rowToUpdate) {
            rowToUpdate.set('Category', newCategory);
            await rowToUpdate.save(); // บันทึกข้อมูลที่แก้กลับลง Google Sheets
            console.log(`📝 [Google Sheets] แก้ไขหมวดหมู่สลิป ${referenceNo} เป็น ${newCategory} สำเร็จ`);
            return true;
        }
        return false; // หาไม่เจอ
    } catch (error) {
        console.error("❌ [Google Sheets] Error updating category:", error.message);
        throw new Error("ไม่สามารถอัปเดตหมวดหมู่ได้");
    }
}

// ⚠️ อัปเดต Export ฟังก์ชันใหม่
module.exports = { saveToGoogleSheets, updateCategoryByRef, getAdvancedSummary };