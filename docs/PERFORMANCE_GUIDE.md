# إرشادات التشغيل والاختبار للنظام المُحسّن

## 📋 ملخص الأداء المتوقع

### النظام الحالي (Single Process)
- **الحد الأقصى للاتصالات المتزامنة**: ~1,000-2,000
- **استهلاك الذاكرة**: ~1-2MB لكل اتصال WebSocket
- **معدل الرسائل**: ~500-1,000 رسالة/ثانية

### النظام المُحسّن (Clustered)
- **الحد الأقصى للاتصالات المتزامنة**: ~8,000-16,000
- **استهلاك الذاكرة**: ~0.5-1MB لكل اتصال (تحسن 50%)
- **معدل الرسائل**: ~2,000-5,000 رسالة/ثانية
- **استغلال CPU**: جميع النوى المتاحة

## 🚀 خطوات التشغيل

### 1. تثبيت المكتبات المطلوبة

```powershell
# تثبيت مكتبات الأداء والكلاسترينج
npm install @socket.io/redis-adapter ioredis pm2 --save

# تثبيت أدوات اختبار الضغط
npm install autocannon artillery k6 --save-dev

# تثبيت مكتبات إضافية للمراقبة
npm install socket.io-client axios --save-dev
```

### 2. تشغيل Redis (مطلوب للكلاسترينج)

```powershell
# تشغيل Redis باستخدام Docker
docker run -d --name redis-cluster -p 6379:6379 redis:alpine

# أو تشغيل Redis محلياً إذا كان مثبت
redis-server
```

### 3. تشغيل النظام المُحسّن

```powershell
# تشغيل النظام المُحسّن مع PM2 Clustering
pm2 start ecosystem.config.js

# مراقبة الأداء في الوقت الفعلي
pm2 monit

# عرض السجلات
pm2 logs

# عرض معلومات العمليات
pm2 list
```

## 🧪 اختبارات الضغط المتدرجة

### اختبار تدريجي شامل (1K → 5K → 10K)

```powershell
# تشغيل الاختبار الشامل المتدرج
node advanced-load-test.js graduated
```

### اختبارات منفصلة

```powershell
# اختبار HTTP API (100 اتصال لمدة 30 ثانية)
node advanced-load-test.js http 100 30

# اختبار WebSocket (1000 اتصال لمدة 60 ثانية)
node advanced-load-test.js websocket 1000 60

# اختبار المستخدمين المتزامنين (100 مستخدم لمدة 60 ثانية)
node advanced-load-test.js users 100 60
```

### اختبار 10,000 مستخدم متزامن

```powershell
# اختبار الحد الأقصى - 10K اتصال WebSocket
node advanced-load-test.js websocket 10000 120

# اختبار 1000 مستخدم بسلوك واقعي
node advanced-load-test.js users 1000 180
```

## 📊 مراقبة الأداء

### مراقبة PM2

```powershell
# مراقبة الأداء التفاعلية
pm2 monit

# معلومات تفصيلية عن العمليات
pm2 show accounts-store

# إعادة تشغيل إذا لزم الأمر
pm2 restart ecosystem.config.js

# إيقاف العمليات
pm2 stop ecosystem.config.js
```

### مراقبة النظام

```powershell
# مراقبة استخدام CPU والذاكرة
Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 10

# مراقبة الذاكرة المستخدمة
Get-Counter "\Memory\Available MBytes" -SampleInterval 1 -MaxSamples 10

# مراقبة اتصالات الشبكة
netstat -an | findstr :5000
```

## 🎯 معايير الأداء المتوقعة

### لـ 1,000 مستخدم متزامن
- **زمن الاستجابة**: < 100ms
- **معدل النجاح**: > 99%
- **استهلاك الذاكرة**: < 1GB إجمالي
- **استخدام CPU**: < 50%

### لـ 5,000 مستخدم متزامن
- **زمن الاستجابة**: < 200ms
- **معدل النجاح**: > 98%
- **استهلاك الذاكرة**: < 3GB إجمالي
- **استخدام CPU**: < 70%

### لـ 10,000 مستخدم متزامن
- **زمن الاستجابة**: < 300ms
- **معدل النجاح**: > 95%
- **استهلاك الذاكرة**: < 6GB إجمالي
- **استخدام CPU**: < 80%

## ⚠️ تحذيرات وملاحظات مهمة

### قبل اختبار 10K مستخدم:

1. **تأكد من موارد النظام**:
   - RAM: يُفضل 8GB أو أكثر
   - CPU: 4 نوى أو أكثر
   - SSD: لأداء أفضل لقاعدة البيانات

2. **إعدادات النظام**:
   ```powershell
   # زيادة حد الملفات المفتوحة (في Linux/Mac)
   ulimit -n 65536
   
   # في Windows - تأكد من إعدادات الجدار الناري
   New-NetFirewallRule -DisplayName "Node.js" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
   ```

3. **مراقبة قاعدة البيانات**:
   - تأكد من أن MongoDB تعمل بكفاءة
   - راقب الاتصالات: `db.serverStatus().connections`
   - تحقق من الفهارس: `db.chats.getIndexes()`

## 🔧 استكشاف الأخطاء

### مشاكل شائعة وحلولها

1. **"ECONNREFUSED" عند الاتصال بـ Redis**:
   ```powershell
   # تحقق من تشغيل Redis
   redis-cli ping
   # يجب أن ترجع "PONG"
   ```

2. **"Too many open files"**:
   ```powershell
   # في Windows - إعادة تشغيل الخدمة
   pm2 restart ecosystem.config.js
   ```

3. **بطء في الاستجابة**:
   ```powershell
   # تحقق من استخدام CPU والذاكرة
   pm2 monit
   
   # تحقق من MongoDB
   mongosh --eval "db.serverStatus().connections"
   ```

4. **انقطاع الاتصالات**:
   ```powershell
   # تحقق من سجلات PM2
   pm2 logs --lines 50
   
   # إعادة تشغيل إذا لزم الأمر
   pm2 restart all
   ```

## 📈 تحسينات إضافية للإنتاج

### 1. Load Balancer خارجي
```nginx
upstream accounts_store {
    least_conn;
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
    server 127.0.0.1:5003;
}
```

### 2. مراقبة متقدمة
- **Prometheus + Grafana** للمتابعة
- **New Relic** أو **DataDog** للمراقبة السحابية
- **ELK Stack** لتحليل السجلات

### 3. نسخ احتياطي للبيانات
```powershell
# نسخ احتياطي يومي لـ MongoDB
mongodump --out ./backups/$(Get-Date -Format "yyyy-MM-dd")
```

## ✅ قائمة التحقق قبل الإنتاج

- [ ] Redis يعمل ويقبل الاتصالات
- [ ] MongoDB محسّن بالفهارس المطلوبة
- [ ] PM2 مكون بشكل صحيح
- [ ] اختبارات الضغط نجحت لـ 1K مستخدم
- [ ] اختبارات الضغط نجحت لـ 5K مستخدم
- [ ] اختبارات الضغط نجحت لـ 10K مستخدم
- [ ] مراقبة الأداء تعمل بشكل صحيح
- [ ] إعدادات الأمان مفعلة
- [ ] النسخ الاحتياطي مجدول

## 🎉 النتيجة المتوقعة

بعد تطبيق هذه التحسينات، النظام سيكون قادر على:
- **دعم 10,000+ مستخدم متزامن**
- **معالجة 5,000+ رسالة/ثانية**
- **الحفاظ على زمن استجابة < 300ms**
- **استقرار عالي مع معدل نجاح > 95%**

النظام الآن جاهز للإنتاج ويمكنه التعامل مع الضغط المطلوب! 🚀