# ربط صفحة User Dashboard بقاعدة البيانات

## التعديلات المنفذة

### 1. **إضافة State للألعاب الحقيقية**
تمت إضافة states جديدة لجلب بيانات حقيقية من قاعدة البيانات:

```typescript
const [valorantListings, setValorantListings] = useState<Listing[]>([]);
const [pubgListings, setPubgListings] = useState<Listing[]>([]);
const [fifaListings, setFifaListings] = useState<Listing[]>([]);
const [lolListings, setLolListings] = useState<Listing[]>([]);
const [fortniteListings, setFortniteListings] = useState<Listing[]>([]);
const [arcRaidersListings, setArcRaidersListings] = useState<Listing[]>([]);
const [gameIdMap, setGameIdMap] = useState<Record<string, string>>({});
```

### 2. **دالة جلب Listings حسب اللعبة**
```typescript
const fetchGameListings = useCallback(async (gameName: string, setter) => {
  const gameId = gameIdMap[gameName.toLowerCase()];
  if (!gameId) return;
  
  const res = await fetch(`/api/v1/listings/browse?game=${gameId}&limit=12&sort=newest`);
  const data = await res.json();
  if (data.data && data.data.length > 0) {
    setter(data.data);
  }
}, [gameIdMap]);
```

### 3. **استبدال البيانات الثابتة بالديناميكية**

#### قبل:
```tsx
<HorizontalScroll>
  {VALORANT_ACCOUNTS.map((product) => (
    <StaticProductCard key={product.id} product={product} />
  ))}
</HorizontalScroll>
```

#### بعد:
```tsx
{valorantListings.length > 0 && (
  <section>
    <SectionHeader icon={Gamepad2} title="Valorant Accounts" />
    <HorizontalScroll>
      {valorantListings.map((listing) => (
        <ProductCard key={listing._id} listing={listing} currentUserId={user?.id} />
      ))}
    </HorizontalScroll>
  </section>
)}
```

## الألعاب المربوطة بقاعدة البيانات

1. ✅ **Valorant** - `/api/v1/listings/browse?game={valorant_id}`
2. ✅ **PUBG** - `/api/v1/listings/browse?game={pubg_id}`
3. ✅ **FIFA** - `/api/v1/listings/browse?game={fifa_id}`
4. ✅ **League of Legends** - `/api/v1/listings/browse?game={lol_id}`
5. ✅ **Fortnite** - `/api/v1/listings/browse?game={fortnite_id}`
6. ✅ **Arc Raiders** - `/api/v1/listings/browse?game={arc_raiders_id}`

## كيفية إضافة لعبة جديدة

### 1. **أضف اللعبة في قاعدة البيانات**
```bash
# استخدم MongoDB أو Admin Panel
db.games.insertOne({
  name: "Apex Legends",
  slug: "apex-legends",
  status: "active",
  category: "Battle Royale"
});
```

### 2. **أضف State في الصفحة**
```typescript
const [apexListings, setApexListings] = useState<Listing[]>([]);
```

### 3. **اجلب البيانات**
```typescript
useEffect(() => {
  if (Object.keys(gameIdMap).length === 0) return;
  fetchGameListings('apex legends', setApexListings);
}, [gameIdMap, fetchGameListings]);
```

### 4. **أضف القسم في UI**
```tsx
{apexListings.length > 0 && (
  <section>
    <SectionHeader 
      icon={Gamepad2} 
      title="Apex Legends" 
      color="from-orange-500 to-red-600" 
      subtitle="High-rank Apex accounts"
    />
    <HorizontalScroll>
      {apexListings.map((listing) => (
        <ProductCard key={listing._id} listing={listing} currentUserId={user?.id} />
      ))}
    </HorizontalScroll>
  </section>
)}
```

## API Endpoints المستخدمة

| Endpoint | الغرض | Parameters |
|----------|-------|------------|
| `/api/v1/games` | جلب قائمة الألعاب | - |
| `/api/v1/listings/browse` | جلب listings حسب اللعبة | `game`, `limit`, `sort` |
| `/api/v1/rankings/homepage` | جلب Best Sellers, Trending, Popular | `limit` |
| `/api/v1/ads/active` | جلب الإعلانات | `position` |
| `/api/v1/discounts/active` | جلب الخصومات النشطة | - |

## ملاحظات مهمة

### 1. **Game Name Mapping**
- يتم تحويل اسم اللعبة إلى lowercase للبحث
- مثال: `"League of Legends"` → `"league of legends"`
- تأكد من تطابق الأسماء في قاعدة البيانات

### 2. **Conditional Rendering**
- الأقسام تظهر فقط عندما توجد بيانات: `{valorantListings.length > 0 && ...}`
- هذا يمنع عرض أقسام فارغة

### 3. **Performance**
- يتم جلب كل لعبة في request منفصل
- يمكن تحسين ذلك بإنشاء endpoint واحد يجلب كل الألعاب

### 4. **Cache**
- الـ browse endpoint يستخدم cache لمدة 2 دقيقة
- التغييرات قد لا تظهر فوراً

## اختبار التكامل

### 1. **تأكد من وجود ألعاب في قاعدة البيانات**
```bash
# MongoDB Shell
use your_database
db.games.find({ status: "active" })
```

### 2. **تأكد من وجود listings لكل لعبة**
```bash
db.listings.find({ status: "available" }).populate("game")
```

### 3. **اختبر الـ API مباشرة**
```bash
# جلب الألعاب
curl http://localhost:5000/api/v1/games

# جلب listings للعبة معينة (استبدل GAME_ID)
curl "http://localhost:5000/api/v1/listings/browse?game=GAME_ID&limit=12"
```

### 4. **افتح صفحة User Dashboard**
```
http://localhost:5000/user
```

## Troubleshooting

### المشكلة: الأقسام لا تظهر
**الحل:**
1. تحقق من Console للأخطاء
2. تأكد من أن اسم اللعبة في قاعدة البيانات مطابق للكود
3. تحقق من وجود listings متاحة (`status: "available"`)

### المشكلة: الصور لا تظهر
**الحل:**
1. تأكد من أن `coverImage` أو `images` موجودة في الـ listing
2. تحقق من صحة مسار الصورة
3. راجع الـ `uploads` folder

### المشكلة: بطء في التحميل
**الحل:**
1. تحقق من الـ database indexes (راجع [SOCKET_TIMEOUT_FIX.md](SOCKET_TIMEOUT_FIX.md))
2. قلل عدد الـ listings: `limit=6` بدلاً من `12`
3. استخدم lazy loading

## التحسينات المستقبلية

### أفكار للتطوير:
- [ ] دمج جميع الـ game listings في API call واحد
- [ ] إضافة pagination
- [ ] إضافة filters (price range, rating)
- [ ] إضافة search functionality
- [ ] Cache في Frontend (React Query or SWR)
- [ ] Skeleton loading states
- [ ] Infinite scroll بدلاً من "View All"
- [ ] إضافة Game icons ديناميكية من database
- [ ] Sort options (newest, price, popularity)
