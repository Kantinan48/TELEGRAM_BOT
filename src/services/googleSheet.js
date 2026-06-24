const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// โหลดไฟล์กุญแจแบบ Dynamic (รองรับทั้ง Local และ Render Cloud)
let creds;
if (process.env.RENDER) {
    creds = require('/etc/secrets/google-credentials.json');
} else {
    creds = require('../config/google-credentials.json');
}

// Spreadsheet ID ของคุณ
const SPREADSHEET_ID = '11uBiA2dDH7kv9g-cipupmvK97Nn2S5vHYC75h37MQAI';

// --- ฟังก์ชันช่วยเหลือ (Helper Functions) ---

// 1. เชื่อมต่อและดึง Tab ของผู้ใช้ (ระบบ Multi-User)
async function getUserSheet(userId, userName) {
    const serviceAccountAuth = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo(); 

    // ตั้งชื่อ Tab ตาม ID_Name (ลบอักขระพิเศษออกเพื่อป้องกัน Error)
    const safeUserName = String(userName).replace(/[^a-zA-Z0-9ก-๙]/g, '');
    const sheetTitle = `${userId}_${safeUserName}`;

    let sheet = doc.sheetsByTitle[sheetTitle];

    // ถ้ายังไม่มี Tab นี้ ให้สร้างใหม่และเขียน Header
    if (!sheet) {
        sheet = await doc.addSheet({ title: sheetTitle });
        await sheet.setHeaderRow(['Timestamp', 'Date', 'Name', 'Category', 'Amount', 'ReferenceNo']);
        console.log(`📝 [Google Sheets] สร้างหน้าบัญชีใหม่สำหรับ: ${userName} (${userId})`);
    }

    return sheet;
}

// 2. แปลงวันที่ภาษาไทยเป็น JavaScript Date
function parseThaiDate(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr === 'ไม่ระบุ') return null;
    const months = { 'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3, 'พ.ค.': 4, 'มิ.ย.': 5, 'ก.ค.': 6, 'ส.ค.': 7, 'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11 };
    
    const parts = dateStr.split(' ');
    if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const month = months[parts[1]];
        let year = parseInt(parts[2]);
        if (year > 2500) year -= 543; 
        if (!isNaN(day) && month !== undefined && !isNaN(year)) return new Date(year, month, day);
    }
    return null;
}

// --- ฟังก์ชันหลัก (Core Functions) ---

// บันทึกสลิปลงชีต (แยกตามบุคคล)
async function saveToGoogleSheets(aiData, userId, userName) {
    try {
        const sheet = await getUserSheet(userId, userName);
        const rows = await sheet.getRows();

        const currentRefNo = aiData.referenceNo;
        if (currentRefNo && currentRefNo !== '-' && currentRefNo !== 'ไม่ระบุ') {
            const isDuplicate = rows.some(row => row.get('ReferenceNo') === currentRefNo);
            if (isDuplicate) throw new Error("DUPLICATE_SLIP"); 
        }

        await sheet.addRow({
            Timestamp: new Date().toLocaleString('th-TH'),
            Date: aiData.date || '-',
            Name: aiData.name || 'ไม่ระบุ',
            Category: aiData.category || 'อื่นๆ',
            Amount: parseFloat(String(aiData.amount).replace(/,/g, '')) || 0,
            ReferenceNo: currentRefNo || '-'
        });

        console.log(`☁️ [Google Sheets] บันทึกข้อมูลของ ${userName} สำเร็จ!`);
    } catch (error) {
        if (error.message === "DUPLICATE_SLIP") throw error;
        console.error("❌ [Google Sheets] Error:", error.message);
        throw new Error("ไม่สามารถบันทึกข้อมูลลง Google Sheets ได้");
    }
}

// แก้ไขหมวดหมู่ (แยกตามบุคคล)
async function updateCategoryByRef(referenceNo, newCategory, userId, userName) {
    try {
        const sheet = await getUserSheet(userId, userName);
        const rows = await sheet.getRows();
        const rowToUpdate = rows.find(row => row.get('ReferenceNo') === referenceNo);
        
        if (rowToUpdate) {
            rowToUpdate.set('Category', newCategory);
            await rowToUpdate.save();
            return true;
        }
        return false;
    } catch (error) {
        console.error("❌ [Google Sheets] Error updating category:", error.message);
        throw new Error("ไม่สามารถอัปเดตหมวดหมู่ได้");
    }
}

// สรุปยอด (แยกตามบุคคล)
async function getAdvancedSummary(period = 'month', includeList = false, userId, userName) {
    try {
        const sheet = await getUserSheet(userId, userName);
        const rows = await sheet.getRows();

        if (rows.length === 0) return null;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let totalAmount = 0;
        let categorySummary = {};
        let transactionList = [];

        rows.forEach(row => {
            const dateStr = row.get('Date');
            const rowDate = parseThaiDate(dateStr);
            if (!rowDate) return; 

            rowDate.setHours(0, 0, 0, 0);
            let isIncluded = false;

            if (period === 'day') {
                isIncluded = rowDate.getTime() === now.getTime();
            } else if (period === 'week') {
                const sevenDaysAgo = new Date(now);
                sevenDaysAgo.setDate(now.getDate() - 7);
                isIncluded = rowDate >= sevenDaysAgo && rowDate <= now;
            } else {
                isIncluded = rowDate.getMonth() === now.getMonth() && rowDate.getFullYear() === now.getFullYear();
            }

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

module.exports = { saveToGoogleSheets, updateCategoryByRef, getAdvancedSummary };