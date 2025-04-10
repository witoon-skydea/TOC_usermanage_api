# TOC User Management API

ระบบจัดการผู้ใช้และสิทธิ์การใช้งานแบบกลางสำหรับบริการต่างๆ ของ TOC

## ลักษณะการทำงาน

ระบบนี้ถูกออกแบบมาให้เป็น API กลางในการจัดการผู้ใช้งานและสิทธิ์การเข้าถึงสำหรับหลากหลายบริการภายใต้ระบบ TOC โดยมีความสามารถหลักดังนี้:

- การจัดการบัญชีผู้ใช้ (User Management)
- การจัดการบทบาทและสิทธิ์ (Role & Permission Management)
- การจัดการบริการ (Service Management)
- การจัดการความสัมพันธ์ระหว่างผู้ใช้และบริการ (User-Service Relationship)
- การบันทึกการใช้งานระบบ (Audit Logging)

## โครงสร้างโปรเจค

```
TOC_usermanage_api/
├── .env                   # ไฟล์การตั้งค่าสภาพแวดล้อม
├── package.json           # ไฟล์การกำหนดค่าโปรเจคและการพึ่งพา
├── README.md              # เอกสารนี้
├── scripts/               # สคริปต์สำหรับการตรวจสอบและสร้างข้อมูลเริ่มต้น
└── src/                   # โค้ดหลักของแอปพลิเคชัน
    ├── config/            # ไฟล์การตั้งค่า
    ├── controllers/       # ตัวควบคุมการทำงาน
    ├── middlewares/       # มิดเดิลแวร์
    ├── models/            # โมเดลข้อมูล
    ├── routes/            # เส้นทาง API
    ├── utils/             # ยูทิลิตี้ต่างๆ
    └── server.js          # ไฟล์หลักของเซิร์ฟเวอร์
```

## การติดตั้งและการตั้งค่า

### ข้อกำหนดเบื้องต้น

- Node.js (เวอร์ชัน 14 ขึ้นไป)
- MongoDB (MongoDB Atlas)

### การติดตั้ง

1. โคลนโปรเจค
   ```bash
   git clone <repository-url>
   cd TOC_usermanage_api
   ```

2. ติดตั้งแพ็คเกจที่จำเป็น
   ```bash
   npm install
   ```

3. สร้างไฟล์ .env ใหม่หรือปรับแต่งไฟล์ที่มีอยู่ ตัวอย่างดังนี้:
   ```
   PORT=3000
   NODE_ENV=development
   API_PREFIX=/api
   
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/toc_user_management
   
   JWT_SECRET=your-jwt-secret-key
   JWT_EXPIRES_IN=1h
   JWT_REFRESH_EXPIRES_IN=7d
   
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-admin-password
   ADMIN_EMAIL=admin@example.com
   ADMIN_DISPLAY_NAME=System Administrator
   
   LOG_LEVEL=info
   ```

### การเตรียมฐานข้อมูล

1. ตรวจสอบการเชื่อมต่อกับฐานข้อมูล:
   ```bash
   npm run check-db
   ```

2. สร้างบัญชีผู้ดูแลระบบและบทบาทเริ่มต้น:
   ```bash
   npm run seed:admin
   ```

## การใช้งาน

### การเริ่มต้นเซิร์ฟเวอร์

1. สำหรับการพัฒนา (พร้อม nodemon):
   ```bash
   npm run dev
   ```

2. สำหรับการใช้งานจริง:
   ```bash
   npm start
   ```

### API Endpoints

API จะใช้งานภายใต้ prefix `/api` (หรือตามที่กำหนดใน .env)

#### การจัดการผู้ใช้
- `POST /api/users/register` - ลงทะเบียนผู้ใช้ใหม่
- `POST /api/users/login` - เข้าสู่ระบบ
- `GET /api/users/profile` - ดูข้อมูลโปรไฟล์ของตนเอง
- `PUT /api/users/profile` - แก้ไขข้อมูลโปรไฟล์
- `PUT /api/users/change-password` - เปลี่ยนรหัสผ่าน
- `POST /api/users/logout` - ออกจากระบบ
- `GET /api/users` - รายการผู้ใช้ทั้งหมด (สำหรับผู้ดูแลระบบ)

#### การจัดการบทบาท
- `GET /api/roles` - รายการบทบาททั้งหมด
- `POST /api/roles` - สร้างบทบาทใหม่
- `GET /api/roles/:id` - ดูรายละเอียดบทบาท
- `PUT /api/roles/:id` - แก้ไขบทบาท
- `DELETE /api/roles/:id` - ลบบทบาท

#### การจัดการบริการ
- `GET /api/services` - รายการบริการทั้งหมด
- `POST /api/services` - สร้างบริการใหม่
- `GET /api/services/:id` - ดูรายละเอียดบริการ
- `PUT /api/services/:id` - แก้ไขบริการ
- `DELETE /api/services/:id` - ลบบริการ

#### การจัดการความสัมพันธ์ผู้ใช้-บริการ
- `GET /api/user-services` - รายการความสัมพันธ์ทั้งหมด
- `POST /api/user-services` - สร้างความสัมพันธ์ใหม่
- `PUT /api/user-services/:id` - แก้ไขความสัมพันธ์
- `DELETE /api/user-services/:id` - ลบความสัมพันธ์

#### การบันทึกการใช้งาน
- `GET /api/audit-logs` - รายการบันทึกการใช้งาน
- `GET /api/audit-logs/summary` - สรุปข้อมูลการใช้งาน

## การนำไปใช้งานกับ Oracle Cloud Server

ระบบได้ถูกออกแบบให้รองรับการเข้าถึงผ่าน Nginx ที่กำหนด route ในรูปแบบ `ip x.x.x.x/api/` โดยได้มีการกำหนดค่า `API_PREFIX` ใน .env เพื่อให้ระบบทำงานได้อย่างถูกต้องในสภาพแวดล้อมดังกล่าว

### ตัวอย่างการตั้งค่า Nginx

```nginx
server {
    listen 80;
    server_name your-server-ip-or-domain;

    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## เทคโนโลยีที่ใช้

- **Express**: เฟรมเวิร์ค Node.js สำหรับสร้าง API
- **MongoDB/Mongoose**: ฐานข้อมูลและ ODM
- **JWT**: สำหรับการยืนยันตัวตนและการจัดการ token
- **Bcrypt**: สำหรับการเข้ารหัสรหัสผ่าน
- **Joi**: สำหรับการตรวจสอบความถูกต้องของข้อมูล
- **Winston**: สำหรับการจัดการบันทึก (logging)
- **Morgan**: สำหรับการบันทึกการเข้าถึง HTTP
- **Helmet**: สำหรับการรักษาความปลอดภัยของ HTTP headers
- **CORS**: สำหรับการจัดการการเข้าถึงข้าม domain
- **Express Rate Limit**: สำหรับป้องกันการโจมตีแบบ brute force

## การพัฒนาเพิ่มเติม

1. ความสามารถในการส่งอีเมลยืนยันและรีเซ็ตรหัสผ่าน
2. เพิ่มการทดสอบอัตโนมัติ (Unit/Integration Tests)
3. การทำ API Documentation ด้วย Swagger/OpenAPI
4. การจัดการไฟล์ (File Upload) สำหรับรูปโปรไฟล์
5. การเพิ่มความสามารถในการ 2FA (Two-Factor Authentication)

## ผู้พัฒนา

ทีมพัฒนา TOC
