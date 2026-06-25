# 💸 TeleExpense Bot (AI-Powered Expense Tracker)

TeleExpense คือแอปพลิเคชันบัญชีรายรับ-รายจ่ายอัจฉริยะบนแพลตฟอร์ม Telegram ที่ช่วยลดภาระการจดบันทึกบัญชีด้วยมือ (Manual Data Entry) โดยผู้ใช้สามารถส่ง "รูปภาพสลิปโอนเงิน" เข้ามาในแชท จากนั้นระบบจะใช้เทคโนโลยี AI ในการสกัดข้อมูล (Data Extraction) และบันทึกลงบนฐานข้อมูล Google Sheets ให้อัตโนมัติ พร้อมระบบสรุปยอดอัจฉริยะ

## 🏗 System Architecture (สถาปัตยกรรมระบบ)
โปรเจกต์นี้ถูกออกแบบด้วยหลักการ **Clean Architecture** โดยแบ่งแยกความรับผิดชอบของแต่ละส่วน (Separation of Concerns) อย่างชัดเจน:
* **Presentation Layer (Frontend):** `Telegram Bot API` ทำหน้าที่รับรูปภาพสลิปและโต้ตอบกับผู้ใช้
* **Intelligence Layer (AI Engine):** `Google Gemini 3.1 Flash Lite` ทำหน้าที่ทำ OCR และแปลงข้อมูลภาพเป็นโครงสร้าง JSON
* **Data Layer (Backend/Database):** `Google Sheets API` ทำหน้าที่เป็น Cloud Database เก็บข้อมูลและป้องกันการบันทึกสลิปซ้ำ

## ✨ Features (ความสามารถหลัก)
* 📸 **Smart Slip Extraction:** อ่านสลิปและสกัดข้อมูล (ชื่อร้านค้า, ยอดเงิน, วันที่, เลขอ้างอิง) อัตโนมัติ
* 🤖 **Auto Categorization:** AI วิเคราะห์และจัดหมวดหมู่ค่าใช้จ่ายจากชื่อผู้รับเงิน
* 🛡️ **Duplicate Slip Detection:** ระบบตรวจสอบและป้องกันการบันทึกสลิปซ้ำด้วยเลข Reference Number
* 🎛️ **Interactive Editing:** ผู้ใช้สามารถกดปุ่ม (Inline Keyboard) เพื่อแก้ไขหมวดหมู่ที่ AI คาดเดาผิดได้ทันที
* 📊 **Advanced Analytics:** สรุปยอดรวมค่าใช้จ่ายตามช่วงเวลา (วันนี้, สัปดาห์นี้, เดือนนี้) ผ่านคำสั่ง `/total`

## 🛠 Tech Stack
* **Runtime:** Node.js
* **Bot Framework:** Telegraf (Telegram API)
* **AI Service:** `@google/generative-ai` (Gemini API)
* **Database Integration:** `google-spreadsheet` & `google-auth-library`

---

## 🚀 Installation & Setup (วิธีการติดตั้ง)

### 1. Clone Project และติดตั้ง Dependencies
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd TeleExpense
npm install
// ทดสอบการเชื่อมต่อ GitHub