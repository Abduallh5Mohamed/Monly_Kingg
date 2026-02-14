# 🔐 كيفية تفعيل تشفير البيانات الحساسة | How to Enable Data Encryption

## 📋 الخطوات السريعة | Quick Steps

### 1️⃣ توليد مفتاح التشفير (خطوة واحدة فقط)

في Terminal, اكتب:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**سيظهر لك مفتاح مثل:**
```
7f3a9b2c5d8e1f4a6b9c0d3e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a
```

### 2️⃣ إضافة المفتاح في `.env`

افتح ملف `.env` (أو أنشئه إذا لم يكن موجوداً), وأضف:
```env
ENCRYPTION_KEY=7f3a9b2c5d8e1f4a6b9c0d3e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a
```

⚠️ **مهم جداً:** استبدل المفتاح أعلاه بالمفتاح الذي ظهر لك في الخطوة 1

### 3️⃣ تطبيق التشفير على الإيداعات

افتح `src/modules/deposits/deposit.controller.js` وأضف في بداية الملف:
```javascript
import { encrypt, decrypt } from "../../utils/encryption.js";
```

ثم في دالة `submitDeposit`, غيّر:
```javascript
// ❌ بدون تشفير (قديم)
const deposit = new Deposit({
    user: userId,
    paymentMethod,
    amount: parsedAmount,
    senderFullName: sanitizedFullName,
    senderPhoneOrEmail: sanitizedPhoneOrEmail,
    // ...
});
```

إلى:
```javascript
// ✅ مع تشفير (جديد)
const deposit = new Deposit({
    user: userId,
    paymentMethod,
    amount: parsedAmount,
    senderFullName: encrypt(sanitizedFullName), // 🔒 مشفر
    senderPhoneOrEmail: encrypt(sanitizedPhoneOrEmail), // 🔒 مشفر
    depositDate: depositDateTime,
    receiptImage: receiptImagePath,
    gameTitle: sanitizedGameTitle ? encrypt(sanitizedGameTitle) : undefined, // 🔒 مشفر
    paidAmount: parsedAmount,
    creditedAmount: parsedAmount
});
```

### 4️⃣ فك التشفير عند القراءة

في دالة `getMyDeposits`, أضف بعد الاستعلام:
```javascript
// الاستعلام العادي
const deposits = await Deposit.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

// ✅ فك التشفير قبل الإرسال
const decryptedDeposits = deposits.map(deposit => {
    const depositObj = deposit.toObject();
    return {
        ...depositObj,
        senderFullName: decrypt(depositObj.senderFullName),
        senderPhoneOrEmail: decrypt(depositObj.senderPhoneOrEmail),
        gameTitle: depositObj.gameTitle ? decrypt(depositObj.gameTitle) : undefined
    };
});

return res.status(200).json({
    message: "Deposits fetched successfully",
    data: decryptedDeposits, // ← استخدم هذا بدل deposits
    pagination: { ... }
});
```

في دالة `getAllDeposits` (للإدمن), نفس الشيء:
```javascript
const deposits = await Deposit.find()
    .populate("user", "username email phone province")
    .sort({ createdAt: -1 });

const decryptedDeposits = deposits.map(deposit => {
    const depositObj = deposit.toObject();
    return {
        ...depositObj,
        senderFullName: decrypt(depositObj.senderFullName),
        senderPhoneOrEmail: decrypt(depositObj.senderPhoneOrEmail),
        gameTitle: depositObj.gameTitle ? decrypt(depositObj.gameTitle) : undefined
    };
});

return res.status(200).json({
    message: "All deposits fetched successfully",
    data: decryptedDeposits
});
```

---

## ✅ اختبار التشفير | Testing Encryption

### في Terminal:
```bash
# تأكد من وجود ENCRYPTION_KEY في .env
cat .env | grep ENCRYPTION_KEY

# قم بتشغيل السيرفر
npm run dev
```

### قم بإنشاء إيداع جديد من الواجهة:
1. سجل دخول كمستخدم
2. اذهب لصفحة Payments
3. اضغط Add Permission Request
4. أدخل البيانات وارفع صورة الإيصال
5. اضغط Submit

### تحقق من التشفير في قاعدة البيانات:
```bash
# افتح MongoDB Shell
mongosh accountsstore

# اعرض آخر إيداع
db.deposits.find().sort({createdAt: -1}).limit(1).pretty()
```

**ستجد البيانات مشفرة:**
```json
{
  "senderFullName": "a1b2c3d4e5f6:g7h8i9j0k1l2:m3n4o5p6q7r8...",
  "senderPhoneOrEmail": "x9y0z1a2b3c4:d5e6f7g8h9i0:j1k2l3m4n5o6...",
  "gameTitle": "p7q8r9s0t1u2:v3w4x5y6z7a8:b9c0d1e2f3g4..."
}
```

### لكن في الـ API Response, ستجدها واضحة:
```json
{
  "senderFullName": "محمد أحمد",
  "senderPhoneOrEmail": "01234567890",
  "gameTitle": "PUBG Mobile"
}
```

---

## 🔄 تشفير البيانات القديمة | Encrypting Existing Data

إذا كان عندك بيانات قديمة غير مشفرة, أنشئ سكربت للتشفير:

أنشئ ملف `scripts/encrypt-existing-deposits.js`:
```javascript
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Deposit from '../src/modules/deposits/deposit.model.js';
import { encrypt, decrypt } from '../src/utils/encryption.js';

dotenv.config();

async function encryptExistingDeposits() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/accountsstore');
        console.log('✅ Connected to MongoDB');

        const deposits = await Deposit.find();
        console.log(\`📊 Found \${deposits.length} deposits\`);

        let encrypted = 0;
        let skipped = 0;

        for (const deposit of deposits) {
            // تحقق إذا كانت البيانات مشفرة بالفعل
            // البيانات المشفرة تحتوي على ":" (من format: iv:authTag:data)
            const isAlreadyEncrypted = deposit.senderFullName?.includes(':');

            if (isAlreadyEncrypted) {
                skipped++;
                continue;
            }

            // تشفير البيانات
            deposit.senderFullName = encrypt(deposit.senderFullName);
            deposit.senderPhoneOrEmail = encrypt(deposit.senderPhoneOrEmail);
            if (deposit.gameTitle) {
                deposit.gameTitle = encrypt(deposit.gameTitle);
            }

            await deposit.save();
            encrypted++;
            console.log(\`✅ Encrypted deposit #\${deposit._id}\`);
        }

        console.log(\`\n✅ Done!`);
        console.log(\`   Encrypted: \${encrypted}\`);
        console.log(\`   Skipped (already encrypted): \${skipped}\`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

encryptExistingDeposits();
```

**قم بتشغيل السكربت:**
```bash
node scripts/encrypt-existing-deposits.js
```

---

## 🎯 الفوائد | Benefits

بعد تطبيق التشفير:

- ✅ **الأسماء**, **الإيميلات**, **أرقام الهواتف**, **عناوين الألعاب** كلها مشفرة في قاعدة البيانات
- ✅ حتى لو حصل أحد على نسخة من Database, لن يستطيع قراءة البيانات
- ✅ فقط من يملك `ENCRYPTION_KEY` يستطيع فك التشفير
- ✅ التشفير تلقائي - لا يحتاج تدخل يدوي عند كل إيداع
- ✅ البيانات تُفك تشفيرها تلقائياً عند عرضها للمستخدم/الإدمن

---

## ⚠️ تحذيرات مهمة | Important Warnings

### 1. لا تفقد مفتاح التشفير!
- إذا فقدت `ENCRYPTION_KEY`, **لن تستطيع** فك تشفير البيانات أبداً
- احفظ نسخة احتياطية آمنة من الملف `.env`
- يُفضل حفظ المفتاح في:
  - مدير كلمات المرور (LastPass, 1Password)
  - خزنة آمنة (AWS Secrets Manager, Azure Key Vault)
  - ملف مشفر بـ GPG

### 2. لا ترفع `.env` على Git
```bash
# تأكد من وجود .env في .gitignore
echo ".env" >> .gitignore

# تأكد أنه لم يُرفع من قبل
git rm --cached .env
```

### 3. استخدم مفاتيح مختلفة لكل بيئة
- Development: مفتاح خاص
- Staging: مفتاح خاص
- Production: مفتاح خاص (الأكثر أماناً)

**لا تستخدم نفس المفتاح في بيئات مختلفة!**

---

## 🔍 استكشاف الأخطاء | Troubleshooting

### Error: "Failed to encrypt data"
**السبب:** `ENCRYPTION_KEY` غير موجود أو غير صحيح
**الحل:** تأكد من وجود المفتاح في `.env` بطول 64 حرف hex

### Error: "Failed to decrypt data"
**السبب:** المفتاح المستخدم في فك التشفير يختلف عن المستخدم في التشفير
**الحل:** تأكد من استخدام نفس `ENCRYPTION_KEY`

### البيانات تظهر مشفرة في الـ API
**السبب:** لم تضف دالة `decrypt()` في Controller
**الحل:** راجع الخطوة 4 أعلاه

### البيانات القديمة لا تعمل
**السبب:** البيانات القديمة غير مشفرة
**الحل:** شغّل سكربت `encrypt-existing-deposits.js`

---

## 📞 المساعدة | Help

إذا واجهت مشكلة:
1. تأكد من اتباع الخطوات بالترتيب
2. تحقق من وجود `ENCRYPTION_KEY` في `.env`
3. تحقق من Logs في Terminal
4. افتح Issue على GitHub

---

**هذا كل شيء! الآن البيانات محمية بتشفير AES-256 🔒**
