# 🔐 دليل الأمان الشامل - Comprehensive Security Guide

## ✅ الإجراءات الأمنية المنفذة | Implemented Security Measures

تم تطبيق مجموعة شاملة من الإجراءات الأمنية لحماية المنصة من الهجمات وحماية بيانات المستخدمين:

---

## 1️⃣ التحقق من المدخلات وتنقيتها | Input Validation & Sanitization

### ✅ تم التنفيذ في: `deposit.controller.js`

**الحمايات المطبقة:**
- 🛡️ **إزالة علامات HTML** - منع هجمات XSS
- 🛡️ **إزالة JavaScript protocols** - منع تنفيذ كود ضار
- 🛡️ **إزالة Event Handlers** - منع التلاعب بالأحداث
- 🛡️ **التحقق من طول النصوص** - منع Buffer Overflow
- 🛡️ **التحقق من صيغة الإيميل/الهاتف** - التأكد من صحة البيانات
- 🛡️ **Whitelist للقيم المحددة** - فقط InstaPay و Vodafone Cash

**مثال على الكود:**
```javascript
const sanitizeInput = (input) => {
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, ''); // Remove event handlers
};
```

---

## 2️⃣ الحد من معدل الطلبات | Rate Limiting

### ✅ تم التنفيذ في: `rateLimiter.js` + `deposit.routes.js`

**الحدود المطبقة:**

| المسار | الحد الأقصى | الفترة الزمنية | الغرض |
|--------|-------------|----------------|-------|
| **رفع الإيداعات** | 5 طلبات | 15 دقيقة | منع السبام وطلبات الإيداع المتكررة |
| **رفع الملفات** | 10 ملفات | ساعة واحدة | منع استنزاف مساحة التخزين |
| **إجراءات الإدمن** | 100 طلب | 5 دقائق | حماية العمليات الإدارية |
| **API العامة** | 10,000 طلب | 15 دقيقة | حماية من DDoS |
| **إعادة إرسال الكود** | 5 طلبات | دقيقة واحدة | منع السبام |
| **إعادة تعيين كلمة المرور** | 3 محاولات | 15 دقيقة | منع Brute Force |

**عند تجاوز الحد:**
```json
{
  "success": false,
  "message": "Too many deposit requests. Please wait 15 minutes",
  "retryAfter": 892
}
```

---

## 3️⃣ رؤوس الأمان | Security Headers

### ✅ تم التنفيذ في: `server-integrated.js` باستخدام Helmet

**الحمايات المطبقة:**

| Header | القيمة | الحماية |
|--------|--------|---------|
| **X-Frame-Options** | DENY | منع Clickjacking - لا يمكن فتح الموقع في iframe |
| **X-Content-Type-Options** | nosniff | منع MIME Sniffing - منع تغيير نوع الملفات |
| **X-XSS-Protection** | 1; mode=block | حماية من XSS في المتصفحات القديمة |
| **Referrer-Policy** | strict-origin-when-cross-origin | التحكم في معلومات الإحالة |
| **HSTS** | max-age=31536000 | إجبار HTTPS لمدة سنة |
| **Content-Security-Policy** | مُفعّل | التحكم في مصادر المحتوى المسموح بها |
| **X-Powered-By** | مخفي | إخفاء معلومات السيرفر |

**فوائد CSP:**
- ✅ منع تحميل سكربتات من مصادر غير موثوقة
- ✅ منع Inline Scripts الخبيثة
- ✅ السماح فقط بالصور من مصادر معتمدة
- ✅ منع تضمين الموقع في Object/Embed tags

---

## 4️⃣ التحقق من الملفات المرفوعة | File Upload Security

### ✅ تم التنفيذ في: `deposit.routes.js` + `deposit.controller.js`

**الحمايات المطبقة:**
- ✅ **التحقق من نوع الملف**: فقط صور (JPEG, PNG, WEBP)
- ✅ **التحقق من حجم الملف**: 10MB كحد أقصى
- ✅ **التحقق من MIME Type**: منع رفع ملفات تنفيذية متخفية
- ✅ **أسماء ملفات فريدة**: منع الكتابة فوق ملفات موجودة
- ✅ **حد للرفع**: 10 ملفات كل ساعة لكل IP

**كود التحقق:**
```javascript
const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ message: "Only JPEG, PNG, and WEBP images are allowed" });
}

if (req.file.size > 10 * 1024 * 1024) { // 10MB
    return res.status(400).json({ message: "Image size must not exceed 10MB" });
}
```

---

## 5️⃣ التحقق من منطقية البيانات | Business Logic Validation

### ✅ تم التنفيذ في: `deposit.controller.js`

**التحققات المطبقة:**
- ✅ **الحد الأدنى للمبلغ**: 100 جنيه
- ✅ **الحد الأقصى للمبلغ**: 1,000,000 جنيه (منع قيم غير واقعية)
- ✅ **تاريخ الإيداع**: لا يمكن أن يكون في المستقبل
- ✅ **تاريخ الإيداع**: لا يمكن أن يكون أقدم من 30 يوم
- ✅ **طول الاسم**: 2-100 حرف
- ✅ **منع التكرار**: دقيقة واحدة كحد أدنى بين الطلبات

**كود التحقق:**
```javascript
const depositDateTime = new Date(depositDate);
const now = new Date();
const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

if (depositDateTime > now) {
    return res.status(400).json({ message: "Deposit date cannot be in the future" });
}
if (depositDateTime < thirtyDaysAgo) {
    return res.status(400).json({ message: "Deposit date cannot be older than 30 days" });
}
```

---

## 6️⃣ تسجيل الأحداث الأمنية | Security Logging

### ✅ تم التنفيذ في: `deposit.controller.js` + `rateLimiter.js`

**ما يتم تسجيله:**
- 📝 جميع طلبات الإيداع مع IP Address و Timestamp
- 📝 جميع حالات تجاوز Rate Limit
- 📝 جميع محاولات رفع ملفات غير صالحة
- 📝 جميع الأخطاء مع Stack Trace
- 📝 القرارات الإدارية (قبول/رفض الإيداع)

**فائدة التسجيل:**
- 🔍 تتبع النشاط المشبوه
- 🔍 تحليل محاولات الهجوم
- 🔍 التحقيق في المشاكل
- 🔍 الامتثال للمتطلبات القانونية

---

## 7️⃣ أدوات التشفير | Encryption Utilities

### ✅ تم التنفيذ في: `utils/encryption.js`

**الوظائف المتاحة:**

### 1. تشفير البيانات الحساسة (Encryption)
```javascript
import { encrypt, decrypt } from './utils/encryption.js';

// تشفير رقم الهاتف
const encryptedPhone = encrypt("01234567890");
// Output: "a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."

// فك التشفير
const originalPhone = decrypt(encryptedPhone);
// Output: "01234567890"
```

**الخوارزمية:** AES-256-GCM (أقوى خوارزمية تشفير متماثل)
**الميزات:**
- ✅ تشفير ثنائي الاتجاه (يمكن استرجاع البيانات)
- ✅ Authentication Tag لضمان عدم التلاعب
- ✅ IV عشوائي لكل تشفير
- ✅ مفتاح 256-bit

### 2. Hash البيانات (One-way)
```javascript
import { hash } from './utils/encryption.js';

const hashedEmail = hash("user@example.com");
// Output: "2c26b46b68ffc68ff99b453c1d30413413422d706......"
```

**الاستخدام:** للبيانات التي تحتاج المقارنة فقط (مثل كلمات المرور)
**الخوارزمية:** SHA-256

### 3. إخفاء البيانات للـ Logs
```javascript
import { maskSensitive } from './utils/encryption.js';

const masked = maskSensitive("01234567890");
// Output: "012****7890"
```

**الاستخدام:** عند طباعة بيانات حساسة في Logs

### 4. توليد Tokens عشوائية
```javascript
import { generateToken } from './utils/encryption.js';

const token = generateToken(32); // 32 bytes = 64 hex characters
// Output: "a1b2c3d4e5f6......" (64 characters)
```

---

## 8️⃣ إعداد مفتاح التشفير | Encryption Key Setup

### 🔴 خطوات مهمة جداً (CRITICAL):

#### 1. توليد مفتاح التشفير:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**مثال على المخرج:**
```
3a7bd3e2f1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0
```

#### 2. إضافة المفتاح للملف `.env`:
```env
ENCRYPTION_KEY=3a7bd3e2f1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0
```

#### 3. التأكد من عدم رفع `.env` على Git:
```bash
# تحقق من وجود .env في .gitignore
cat .gitignore | grep .env
```

### ⚠️ تحذيرات هامة:
- 🚫 **لا تشارك مفتاح التشفير مع أحد**
- 🚫 **لا ترفع `.env` على GitHub أو أي مكان عام**
- 🚫 **استخدم مفاتيح مختلفة لكل بيئة (Development, Production)**
- ✅ **احفظ نسخة احتياطية آمنة من المفتاح**
- ✅ **إذا فقدت المفتاح، لن تستطيع فك تشفير البيانات القديمة**

---

## 9️⃣ حماية CORS | CORS Protection

### ✅ تم التنفيذ في: `server-integrated.js`

**القواعد المطبقة:**
```javascript
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',')
      : true, // Allow all in development
    credentials: true,
    optionsSuccessStatus: 200
};
```

**في الإنتاج:**
- فقط النطاقات المحددة في `ALLOWED_ORIGINS` يمكنها الوصول للـ API
- يجب تضمين Credentials (Cookies) في الطلبات

**في التطوير:**
- جميع النطاقات مسموح بها للتسهيل

---

## 🔟 الخطوات المستقبلية المقترحة | Future Recommendations

### 1. CSRF Protection (مطبق جزئياً)
```javascript
// موجود في server-integrated.js لكن غير مفعّل على deposit routes
import csrfProtection from "./src/middlewares/csrf.js";

// يجب إضافته لـ deposit routes:
router.post("/request", csrfProtection, depositLimiter, ...);
```

### 2. تشفير البيانات في قاعدة البيانات
```javascript
// في deposit.controller.js قبل الحفظ:
import { encrypt } from '../../utils/encryption.js';

const deposit = new Deposit({
    senderFullName: encrypt(sanitizedFullName), // ✅ مشفر
    senderPhoneOrEmail: encrypt(sanitizedPhoneOrEmail), // ✅ مشفر
    // ... باقي الحقول
});

// عند القراءة:
const deposits = await Deposit.find({ user: userId });
const decrypted = deposits.map(d => ({
    ...d.toObject(),
    senderFullName: decrypt(d.senderFullName),
    senderPhoneOrEmail: decrypt(d.senderPhoneOrEmail)
}));
```

### 3. Two-Factor Authentication (2FA)
- إضافة OTP عند موافقة الإدمن على الإيداع
- إضافة 2FA للحسابات الإدارية

### 4. IP Whitelisting للـ Admin
```javascript
const adminIPWhitelist = process.env.ADMIN_IPS?.split(',') || [];

export const requireAdminIP = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    if (!adminIPWhitelist.includes(ip)) {
        return res.status(403).json({ message: 'Access denied from this IP' });
    }
    next();
};
```

### 5. Database Encryption at Rest
- استخدام MongoDB Encryption at Rest
- تشفير النسخ الاحتياطية

### 6. SSL/TLS Certificate
```bash
# استخدام Let's Encrypt للحصول على شهادة SSL مجانية
sudo apt-get install certbot
sudo certbot --nginx -d yourdomain.com
```

### 7. Web Application Firewall (WAF)
- استخدام Cloudflare أو AWS WAF
- حماية من هجمات DDoS
- حماية من SQL Injection و XSS

### 8. Regular Security Audits
```bash
# فحص الثغرات في Dependencies:
npm audit

# إصلاح الثغرات:
npm audit fix

# فحص شامل:
npm audit fix --force
```

### 9. Penetration Testing
- استخدام OWASP ZAP للفحص الأمني
- استخدام Burp Suite
- تشغيل Security Scanning على GitHub

### 10. Compliance
- GDPR compliance للمستخدمين الأوروبيين
- PCI DSS للمدفوعات
- توثيق سياسة الخصوصية

---

## 📊 ملخص الحماية | Security Summary

| المجال | الحالة | التفاصيل |
|--------|--------|----------|
| **Input Validation** | ✅ مُنفّذ | تنقية كاملة لجميع المدخلات |
| **Rate Limiting** | ✅ مُنفّذ | حدود صارمة على جميع Endpoints |
| **Security Headers** | ✅ مُنفّذ | Helmet مع CSP و HSTS |
| **File Upload** | ✅ مُنفّذ | تحقق كامل من النوع والحجم |
| **Business Logic** | ✅ مُنفّذ | تحققات منطقية شاملة |
| **Security Logging** | ✅ مُنفّذ | تسجيل جميع الأحداث الهامة |
| **Encryption Tools** | ✅ جاهز | AES-256-GCM متوفر للاستخدام |
| **CORS Protection** | ✅ مُنفّذ | محدود للنطاقات المعتمدة |
| **Data Encryption** | ⚠️ جزئي | الأدوات جاهزة، تحتاج تطبيق |
| **CSRF Protection** | ⚠️ جزئي | موجود لكن غير مفعّل على deposits |
| **2FA** | ❌ مستقبلي | مقترح للتطبيق |
| **WAF** | ❌ مستقبلي | يحتاج خدمة خارجية |

---

## 🎯 نقاط القوة | Strengths

1. ✅ **حماية متعددة الطبقات** (Defense in Depth)
2. ✅ **Rate Limiting فعّال** ضد DDoS و Brute Force
3. ✅ **تنقية شاملة للمدخلات** ضد XSS و Injection
4. ✅ **رؤوس أمان قوية** تمنع Clickjacking و MIME Sniffing
5. ✅ **تحقق صارم من الملفات** يمنع رفع ملفات خبيثة
6. ✅ **تسجيل أمني** للتتبع والتحليل
7. ✅ **أدوات تشفير احترافية** مع AES-256-GCM

---

## ⚠️ نقاط تحتاج تحسين | Areas for Improvement

1. ⚠️ **تطبيق التشفير على البيانات المخزنة** - الأدوات جاهزة لكن تحتاج تفعيل
2. ⚠️ **CSRF Protection على Deposit Routes**
3. ⚠️ **مراقبة أمنية في الوقت الفعلي** (Real-time monitoring)
4. ⚠️ **Automated Security Scans** في CI/CD
5. ⚠️ **تشفير النسخ الاحتياطية**

---

## 📞 الدعم | Support

للحصول على مساعدة أو الإبلاغ عن مشكلة أمنية:
- 🐛 افتح Issue على GitHub (للمشاكل العامة)
- 🔒 للثغرات الأمنية: security@yourdomain.com (لا تنشرها علناً)

---

## 📜 License & Compliance

هذا المشروع يلتزم بـ:
- ✅ OWASP Top 10 Security Guidelines
- ✅ Node.js Security Best Practices
- ✅ Express.js Security Recommendations

---

**آخر تحديث:** ${new Date().toISOString().split('T')[0]}
**الإصدار:** 1.0.0
**الحالة:** 🟢 Production Ready with noted improvements needed

