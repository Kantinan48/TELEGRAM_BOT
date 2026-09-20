# TeleExpense Bot

TeleExpense Bot คือบอต Telegram สำหรับบันทึกรายรับ-รายจ่ายจากสลิปโอนเงินหรือใบเสร็จ โดยใช้ Google Gemini วิเคราะห์ข้อมูลจากภาพ และบันทึกผลลง Google Sheets อัตโนมัติ ผู้ใช้สามารถตรวจสอบยอดรวม แก้ไขหมวดหมู่ และป้องกันการบันทึกสลิปซ้ำด้วยเลขอ้างอิงของรายการได้

## ความสามารถหลัก

- วิเคราะห์ภาพสลิปด้วย Google Gemini และดึงข้อมูลยอดเงิน วันที่ ชื่อร้านค้า หมวดหมู่ และเลขอ้างอิง
- จัดหมวดหมู่ค่าใช้จ่ายจากข้อมูลในสลิปโดยอัตโนมัติ
- บันทึกข้อมูลแยกตามผู้ใช้ลงในแท็บของ Google Sheets
- ตรวจสอบเลขอ้างอิงเพื่อป้องกันการบันทึกสลิปซ้ำ
- แก้ไขหมวดหมู่ผ่านปุ่มโต้ตอบใน Telegram
- สรุปยอดค่าใช้จ่ายตามช่วงเวลาผ่านคำสั่ง `/total`
- มี HTTP endpoint สำหรับตรวจสอบสถานะการทำงานและรองรับการ deploy บนแพลตฟอร์มคลาวด์

## เทคโนโลยีที่ใช้

- **Runtime:** Node.js
- **Telegram framework:** Telegraf
- **AI:** Google Gemini API (`gemini-3.1-flash-lite`)
- **Data storage:** Google Sheets API
- **Web server:** Express
- **Development tool:** Nodemon

## ข้อกำหนดเบื้องต้น

ก่อนเริ่มใช้งาน ให้ติดตั้งหรือเตรียมรายการต่อไปนี้:

1. Node.js เวอร์ชัน 18 ขึ้นไป และ npm
2. Telegram Bot และ Bot Token จาก [BotFather](https://t.me/BotFather)
3. Gemini API Key จาก [Google AI Studio](https://aistudio.google.com/)
4. Google Cloud Service Account ที่เปิดใช้งาน Google Sheets API แล้ว
5. Google Sheets ที่แชร์ให้กับอีเมลของ Service Account โดยมีสิทธิ์ **Editor**

## การติดตั้งและตั้งค่า

### 1. ดาวน์โหลดโครงการ

```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY>.git
cd TeleExpense
npm install
```

หากโครงการอยู่ในเครื่องอยู่แล้ว ให้เปิด Terminal ที่โฟลเดอร์โครงการและเรียกใช้เฉพาะ:

```bash
npm install
```

### 2. สร้างไฟล์ตัวแปรแวดล้อม

สร้างไฟล์ `.env` ที่โฟลเดอร์รากของโครงการ:

```env
TELEGRAM_BOT_TOKEN=ใส่โทเคนของ Telegram Bot
GEMINI_API_KEY=ใส่คีย์ของ Google Gemini
PORT=3000
```

ห้ามเผยแพร่ไฟล์ `.env` หรือใส่ค่าคีย์จริงลงใน GitHub

### 3. ตั้งค่า Google Service Account

1. สร้าง Service Account ใน Google Cloud Console
2. เปิดใช้งาน Google Sheets API
3. ดาวน์โหลดไฟล์ credentials แบบ JSON
4. บันทึกไฟล์เป็น `src/config/google-credentials.json`
5. เปิด Google Sheets ที่ใช้จัดเก็บข้อมูล แล้วแชร์ให้กับค่า `client_email` ในไฟล์ credentials โดยกำหนดสิทธิ์เป็น **Editor**

ไฟล์ credentials ถูกระบุไว้ใน `.gitignore` และต้องไม่ถูก commit ขึ้น GitHub

> โครงการใช้ Spreadsheet ID ที่กำหนดไว้ใน `src/services/googleSheet.js` หากต้องการใช้ Spreadsheet อื่น ให้แก้ค่า `SPREADSHEET_ID` ในไฟล์ดังกล่าวก่อนเริ่มใช้งาน

## การเรียกใช้

### โหมดพัฒนา

โหมดนี้จะเริ่มต้นบอตด้วย Nodemon และรีสตาร์ตเมื่อมีการแก้ไขไฟล์:

```bash
npm run dev
```

### โหมดใช้งานจริง

```bash
npm start
```

เมื่อเริ่มทำงานสำเร็จ โปรแกรมจะแสดงสถานะของ HTTP server และ Telegram Bot ใน Terminal โดย endpoint ตรวจสอบสถานะคือ:

```text
http://localhost:3000/
```

## วิธีใช้งานผ่าน Telegram

1. เปิดห้องสนทนากับบอต
2. ส่งคำสั่ง `/start` เพื่อเริ่มต้นใช้งาน
3. ส่งคำสั่ง `/help` เพื่อดูคู่มือการใช้งาน
4. ส่งภาพสลิปหรือใบเสร็จให้บอต
5. ตรวจสอบข้อมูลที่บอตวิเคราะห์และผลการบันทึกลง Google Sheets
6. หากต้องการแก้ไขหมวดหมู่ ให้กดปุ่มแก้ไขหมวดหมู่จากข้อความตอบกลับ
7. ใช้คำสั่ง `/total` เพื่อดูสรุปยอดค่าใช้จ่าย

ควรส่งภาพที่คมชัด เห็นข้อความครบถ้วน และมีข้อมูลยอดเงินกับเลขอ้างอิงชัดเจน เพื่อเพิ่มความถูกต้องของผลการวิเคราะห์

## โครงสร้างโครงการ

```text
TeleExpense/
├── src/
│   ├── bot/
│   │   └── telegram.js              # คำสั่งและ event handler ของ Telegram Bot
│   ├── config/
│   │   ├── env.js                   # อ่านและตรวจสอบตัวแปรแวดล้อม
│   │   └── google-credentials.json  # Credentials สำหรับ Google Sheets (ไม่ commit)
│   ├── services/
│   │   ├── gemini.js                # วิเคราะห์ภาพด้วย Gemini
│   │   └── googleSheet.js           # อ่านและเขียนข้อมูลใน Google Sheets
│   └── index.js                     # จุดเริ่มต้นของ HTTP server และบอต
├── .env                             # ค่าความลับสำหรับการรัน (ไม่ commit)
├── .gitignore
├── package.json
└── README.md
```

## การ Deploy

แอปพลิเคชันสามารถ deploy บนผู้ให้บริการที่รองรับ Node.js และมี HTTP health check ได้ เช่น Render โดยกำหนดค่าดังนี้:

- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variables:** `TELEGRAM_BOT_TOKEN`, `GEMINI_API_KEY`, `PORT`
- **Secret file:** สำหรับ `google-credentials.json` ให้ใช้ระบบ Secret Files ของผู้ให้บริการ และกำหนดตัวแปร `RENDER` เพื่อให้โค้ดอ่านไฟล์จาก `/etc/secrets/google-credentials.json`

ก่อน deploy ควรตรวจสอบว่า Telegram Bot Token, Gemini API Key และสิทธิ์ของ Service Account ถูกต้อง

## การอัปโหลดโครงการขึ้น GitHub

### กรณีสร้าง Repository ใหม่

1. สร้าง Repository ใหม่บน GitHub โดยไม่ต้องสร้าง README ซ้ำ
2. เปิด Terminal ในโฟลเดอร์โครงการ
3. ตรวจสอบว่าไม่มีไฟล์ลับอยู่ในรายการที่จะ commit:

```bash
git status
```

4. หากโครงการยังไม่เป็น Git repository ให้เริ่มต้นและเชื่อมต่อ remote:

```bash
git init
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY>.git
```

5. เพิ่มไฟล์ commit และส่งขึ้น GitHub:

```bash
git add .
git commit -m "docs: update project documentation"
git push -u origin main
```

### กรณีโครงการเชื่อมต่อ GitHub อยู่แล้ว

ตรวจสอบ remote และสถานะก่อน:

```bash
git remote -v
git status
```

จากนั้นส่งเฉพาะการเปลี่ยนแปลงที่ต้องการ:

```bash
git add README.md
git commit -m "docs: improve README"
git push origin main
```

หากมีไฟล์อื่นถูกแก้ไขค้างอยู่และยังไม่ต้องการส่งขึ้น GitHub ให้ระบุชื่อไฟล์แทนการใช้ `git add .` ตัวอย่างเช่น:

```bash
git add README.md
```

## ความปลอดภัย

- ห้าม commit `.env`, `google-credentials.json`, Bot Token หรือ API Key
- หากคีย์รั่วไหล ให้ยกเลิกและสร้างคีย์ใหม่ทันที
- จำกัดสิทธิ์ของ Google Service Account ให้เฉพาะ Spreadsheet ที่จำเป็น
- ตรวจสอบ `.gitignore` ก่อนการใช้ `git add .`

## การแก้ไขปัญหาเบื้องต้น

- **บอตไม่เริ่มทำงาน:** ตรวจสอบ `TELEGRAM_BOT_TOKEN` ใน `.env`
- **วิเคราะห์ภาพไม่สำเร็จ:** ตรวจสอบ `GEMINI_API_KEY`, โควตา API และคุณภาพของภาพ
- **บันทึก Google Sheets ไม่สำเร็จ:** ตรวจสอบไฟล์ credentials, Spreadsheet ID และสิทธิ์ Editor ของ Service Account
- **พอร์ตถูกใช้งานอยู่:** เปลี่ยนค่า `PORT` ใน `.env` หรือหยุดโปรเซสที่ใช้พอร์ตดังกล่าว
- **พบสลิปซ้ำ:** ระบบจะป้องกันการบันทึกเมื่อเลข `ReferenceNo` ซ้ำในแท็บของผู้ใช้

## License
