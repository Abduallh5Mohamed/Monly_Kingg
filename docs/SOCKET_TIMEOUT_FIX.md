# حل مشكلة Socket Hang Up و Slow Requests

## المشاكل التي تم إصلاحها

### 1. **Socket Hang Up (ECONNRESET)**
- **السبب**: انقطاع الاتصال بين Next.js proxy والـ backend
- **الحل**: 
  - إضافة `httpAgentOptions` مع `keepAlive` في [next.config.js](next.config.js)
  - زيادة server timeout من 30 ثانية إلى 60 ثانية
  - إضافة `Connection: keep-alive` headers في API requests

### 2. **Slow Requests (30+ seconds)**
- **السبب**: استعلامات MongoDB بطيئة + عدم وجود timeout handling
- **الحل**:
  - إضافة `.maxTimeMS(5000)` للاستعلامات في [rankingService.js](src/services/rankingService.js)
  - إضافة timeout wrapper للـ homepage rankings (10 seconds)
  - تحسين error handling مع fallback للنتائج الفارغة

### 3. **Deprecation Warning (util._extend)**
- **السبب**: مكتبة خارجية تستخدم API مهمل
- **الحل**: التحذير من dependencies خارجية (غير حرج)

## التحسينات المطبقة

### 📁 [next.config.js](next.config.js)
```javascript
// HTTP Agent Options for better connection handling
httpAgentOptions: {
  keepAlive: true,
  keepAliveMsecs: 30000,
},

// Server runtime config for timeouts
serverRuntimeConfig: {
  proxyTimeout: 60000, // 60 seconds
},
```

### 📁 [src/lib/api.ts](src/lib/api.ts)
- إضافة timeout parameter (default: 30 seconds)
- استخدام AbortController للـ timeout handling
- إضافة `Connection: keep-alive` header
- تحسين error messages (عربي + إنجليزي)

### 📁 [server-integrated.js](server-integrated.js)
```javascript
server.timeout = 60000; // 60 seconds
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
```

### 📁 [src/server.js](src/server.js)
```javascript
server.timeout = 60000; // زيادة من 30 إلى 60 ثانية
```

### 📁 [src/services/rankingService.js](src/services/rankingService.js)
- إضافة `.maxTimeMS(5000)` للاستعلامات
- إضافة timeout wrapper للـ homepage rankings (10 seconds)
- تحسين error handling و logging
- إضافة fallback للنتائج الفارغة عند الفشل

### 📁 [package.json](package.json)
```json
"dev": "set NODE_OPTIONS=--max-http-header-size=16384 && node server-integrated.js"
```
- إضافة `NODE_OPTIONS` لجميع الـ dev scripts
- إضافة سكريبت جديد: `npm run db:check-indexes`

## أدوات التشخيص

### فحص Database Indexes
```bash
npm run db:check-indexes
```
هذا السكريبت سيقوم بـ:
- التحقق من الـ indexes الموجودة
- إنشاء indexes مفقودة
- عرض إحصائيات الـ collection
- اختبار أداء الاستعلامات

## خطوات استكشاف الأخطاء

### إذا استمرت المشكلة:

1. **تحقق من اتصال MongoDB**
   ```bash
   # في MongoDB shell
   db.listings.getIndexes()
   ```

2. **تحقق من اتصال Redis**
   ```bash
   redis-cli ping
   ```

3. **راقب أداء الاستعلامات**
   ```bash
   # شغل الـ server مع verbose logging
   npm run dev
   ```

4. **افحص الـ indexes**
   ```bash
   npm run db:check-indexes
   ```

5. **تحقق من حجم البيانات**
   - إذا كانت listings كثيرة جداً (100k+), فكر في:
     - Sharding
     - Read replicas
     - Query optimization

## التوقيت المتوقع بعد الإصلاحات

| Endpoint | قبل | بعد |
|----------|-----|-----|
| `/api/v1/rankings/homepage` | 30s+ (timeout) | < 1s (with cache) |
| `/api/v1/rankings/homepage` | - | < 5s (without cache) |
| `/user` page | 1.5s | < 500ms |

## ملاحظات مهمة

1. **Cache**: الاستعلامات الأولى قد تكون بطيئة قليلاً، لكن النتائج تُحفظ في Redis لمدة 2 دقيقة
2. **Indexes**: تأكد من أن الـ indexes تم إنشاؤها بنجاح
3. **Monitoring**: راقب الـ server logs للتأكد من عدم وجود timeout warnings

## الخطوات التالية (اختياري)

- [ ] تحسين استعلامات MongoDB (aggregation pipeline)
- [ ] إضافة monitoring (Prometheus, Grafana)
- [ ] تفعيل MongoDB query profiling
- [ ] إضافة circuit breaker pattern لـ external services
- [ ] تطبيق request queuing للحماية من overload
