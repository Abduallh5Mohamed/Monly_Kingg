# 📁 Scripts Directory

هذا المجلد يحتوي على جميع السكريبتات المساعدة للمشروع، منظمة حسب الوظيفة.

## 📂 هيكل المجلدات

```
scripts/
├── load-tests/         # سكريبتات اختبار الأحمال والأداء
├── tests/              # سكريبتات الاختبار الوظيفي
├── setup/              # سكريبتات الإعداد الأولي
├── monitoring/         # سكريبتات المراقبة والتتبع
├── redis/              # أدوات إدارة Redis Cache
└── utilities/          # أدوات مساعدة عامة
```

---

## 🚀 Load Tests (اختبار الأحمال)

سكريبتات لاختبار أداء النظام تحت ضغط:

### Socket.IO Load Test (جديد):
```bash
# اختبار خفيف: 100 مستخدم متصل
node scripts/socket-load-test.js

# اختبار متوسط: 1,000 مستخدم، 60 ثانية
node scripts/socket-load-test.js --users 1000 --duration 60

# اختبار ثقيل: 10,000 مستخدم، دقيقتين
node scripts/socket-load-test.js --users 10000 --duration 120 --messageRate 0.2

# اختبار استطلاعي للإنتاج: 50,000 مستخدم
node scripts/socket-load-test.js --users 50000 --duration 300 --messageRate 0.05
```

### JavaScript Scripts:
```bash
node scripts/load-tests/create-load-test-users.js    # إنشاء مستخدمين للاختبار
node scripts/load-tests/quick-load-test.js           # اختبار سريع
node scripts/load-tests/advanced-load-test.js        # اختبار متقدم
node scripts/load-tests/comprehensive-load-test.js   # اختبار شامل
node scripts/load-tests/instant-load-test.js         # اختبار فوري
node scripts/load-tests/system-capacity-test.js      # اختبار سعة النظام
```

### PowerShell Scripts:
```powershell
.\scripts\load-tests\fast-load-test.ps1              # اختبار سريع
.\scripts\load-tests\simple-load-test.ps1            # اختبار بسيط
.\scripts\load-tests\quick-stress-test.ps1           # اختبار ضغط سريع
.\scripts\load-tests\run-load-test.ps1               # تشغيل اختبار شامل
```

---

## 🧪 Tests (الاختبارات)

سكريبتات لاختبار وظائف النظام:

```bash
# Rate Limiter
node scripts/test-rate-limiter.js                   # اختبار إعدادات Rate Limiter

# Server Tests
node scripts/tests/test-server.js                    # اختبار السيرفر
node scripts/tests/test-cache.mjs                    # اختبار الكاش
node scripts/tests/test-login-cache.mjs              # اختبار كاش تسجيل الدخول
node scripts/tests/test-mongo-auth.js                # اختبار مصادقة MongoDB
node scripts/tests/test-password-reset.js            # اختبار إعادة تعيين كلمة المرور
node scripts/tests/test-optimizations.js             # اختبار التحسينات
node scripts/tests/verify-optimizations.js           # التحقق من التحسينات
node scripts/tests/simple-test-server.js             # اختبار سيرفر بسيط
```

---

## ⚙️ Setup (الإعداد)

سكريبتات الإعداد الأولي للنظام:

```bash
# إعداد قاعدة البيانات
node scripts/setup/create-mongo-user.js              # إنشاء مستخدم MongoDB

# إضافة البيانات التجريبية
node scripts/seed-games.js                           # إضافة الألعاب إلى قاعدة البيانات
node scripts/seed-test-user.js                       # إنشاء مستخدم تجريبي
node scripts/create-test-users.js                    # إنشاء مستخدمين تجريبيين
```

```powershell
.\scripts\setup\setup-redis.ps1                      # إعداد Redis
```

---

## 🎮 Game Seeding (إضافة الألعاب)

لإضافة الألعاب إلى قاعدة البيانات، استخدم:

```bash
node scripts/seed-games.js
```

**الألعاب المتاحة:**
- FIFA
- PUBG
- Arc Raiders
- Valorant
- League of Legends
- Fortnite
- Counter-Strike 2
- Minecraft
- GTA V
- Roblox

---

## 📊 Monitoring (المراقبة)

سكريبتات مراقبة النظام في الوقت الفعلي:

```bash
node scripts/monitoring/cache-monitor.js             # مراقبة الكاش
```

---

## 🔴 Redis Tools (أدوات Redis)

أدوات لإدارة وفحص Redis Cache:

### PowerShell Scripts:
```powershell
.\scripts\redis\show-sessions.ps1                    # عرض الجلسات النشطة مع الأوقات
.\scripts\redis\show-redis-cache.ps1                 # فحص شامل للكاش
.\scripts\redis\inspect-redis-cache.ps1              # فحص تفصيلي
```

### JavaScript Scripts:
```bash
node scripts/redis/clear-user-cache.js               # مسح كاش مستخدم معين
```

**مثال: عرض الجلسات النشطة**
```powershell
.\scripts\redis\show-sessions.ps1
```
النتيجة:
```
[1] session:68dc6297ea6649ef04ed569c
    Login Time: 05/10/2025 05:54:24 PM
    IP Address: ::1
    Expires in: 1338.8 minutes
```

---

## 🛠️ Utilities (الأدوات المساعدة)

أدوات عامة للصيانة:

```bash
node scripts/clean-test-users.js                     # حذف المستخدمين التجريبيين
node scripts/unlock-user.js                          # فتح حساب مستخدم
```

---

## ⚡ Quick Reference

### الأوامر الأكثر استخداماً:

| الوظيفة | الأمر |
|---------|-------|
| عرض الجلسات النشطة | `.\scripts\redis\show-sessions.ps1` |
| فحص الكاش بالكامل | `.\scripts\redis\show-redis-cache.ps1` |
| حذف مستخدمين تجريبيين | `node scripts/clean-test-users.js` |
| اختبار سريع للأداء | `node scripts/load-tests/quick-load-test.js` |
| اختبار السيرفر | `node scripts/tests/test-server.js` |

---

## 📝 ملاحظات مهمة

1. **تشغيل من Root:**
   - كل السكريبتات يجب تشغيلها من مجلد الـ root للمشروع
   - مثال: `node scripts/tests/test-server.js` ✅
   - خطأ: `cd scripts/tests && node test-server.js` ❌

2. **متطلبات البيئة:**
   - ملف `.env` يجب أن يكون في الـ root
   - MongoDB يجب أن يكون شغال
   - Redis Docker container يجب أن يكون شغال

3. **PowerShell Execution Policy:**
   ```powershell
   # إذا واجهت مشكلة في التنفيذ:
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
   ```

---

## 🔒 Security Notes

- **لا تشارك** ملفات الـ load test results (تحتوي على بيانات حساسة)
- سكريبتات `clean-test-users.js` آمنة - تحذف فقط حسابات الاختبار
- سكريبتات Redis محمية بكلمة مرور قوية

---

## 📚 للمزيد من المعلومات

راجع مجلد `docs/` للحصول على:
- دليل اختبار الأحمال: `docs/LOAD_TEST_GUIDE.md`
- دليل الأمان: `docs/SECURITY.md`
- دليل الكاش: `docs/CACHE_GUIDE.md`
- دليل الأداء: `docs/PERFORMANCE_GUIDE.md`
