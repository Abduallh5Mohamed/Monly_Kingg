# اختبار النظام - البورت 5000

## ✅ تم الإصلاح:
1. **تغيير البورت**: من 3000 إلى 5000 في `.env` و `server-integrated.js`
2. **إصلاح إرسال البريد الإلكتروني**: 
   - أضفت import لـ `sendEmail` 
   - النظام الآن يرسل البريد الفعلي + يطبع في console كـ backup
   - رسائل أفضل للمستخدم

## 🧪 خطوات الاختبار:

### 1. تشغيل السيرفر:
```bash
node server-integrated.js
```
السيرفر يعمل على: http://localhost:5000

### 2. اختبار التسجيل:
- اذهب إلى: http://localhost:5000/register
- سجل بـ email حقيقي
- تحقق من:
  - وصول البريد الإلكتروني
  - ظهور الكود في console الخاص بالسيرفر
  - انتقال إلى صفحة التحقق

### 3. اختبار التحقق:
- استخدم الكود المرسل
- تحقق من نجاح تسجيل الدخول التلقائي

## 📧 إعدادات البريد الإلكتروني:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=baraawael7901@gmail.com
SMTP_PASS=thebdtjxrxifnmat (App Password)
```

## 🔍 مراقبة النظام:
راقب terminal السيرفر للرسائل:
- `📧 Verification code for [email]: [code]`
- `✅ Email sent successfully to [email]`
- `❌ Failed to send email to [email]: [error]`

## ⚠️ ملاحظات مهمة:
1. إذا فشل إرسال البريد، سيظهر الكود في console
2. النظام يستخدم mock storage - البيانات تضيع عند إعادة التشغيل
3. كلمة المرور غير مشفرة حالياً (للتطوير فقط)