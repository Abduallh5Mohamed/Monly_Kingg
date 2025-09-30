# اختبار ضغط مبسط وفوري
param(
    [int]$Requests = 5,
    [string]$Url = "http://localhost:5000"
)

Write-Host "🚀 اختبار ضغط مبسط للمنصة" -ForegroundColor Green
Write-Host "URL: $Url" -ForegroundColor Gray
Write-Host "عدد الطلبات: $Requests" -ForegroundColor Gray

# فحص الخادم
Write-Host "`n🔍 فحص حالة الخادم..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ الخادم يعمل - كود: $($response.StatusCode)" -ForegroundColor Green
}
catch {
    Write-Host "❌ الخادم غير متاح" -ForegroundColor Red
    Write-Host "تأكد من تشغيل: npm run dev" -ForegroundColor Yellow
    exit 1
}

# اختبار الضغط
Write-Host "`n📊 بدء اختبار الضغط..." -ForegroundColor Cyan

$successful = 0
$failed = 0
$totalTime = 0
$responseTimeData = @()

for ($i = 1; $i -le $Requests; $i++) {
    try {
        $start = Get-Date
        $result = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
        $end = Get-Date
        
        $responseTime = ($end - $start).TotalMilliseconds
        $responseTimeData += $responseTime
        $totalTime += $responseTime
        $successful++
        
        Write-Host "   طلب $i : ✅ نجح ($($result.StatusCode)) - $([math]::Round($responseTime, 2))ms" -ForegroundColor Green
    }
    catch {
        $failed++
        Write-Host "   طلب $i : ❌ فشل" -ForegroundColor Red
    }
}

# النتائج
Write-Host "`n📈 النتائج:" -ForegroundColor Magenta
Write-Host "✅ نجح: $successful" -ForegroundColor Green
Write-Host "❌ فشل: $failed" -ForegroundColor Red

if ($successful -gt 0) {
    $avgTime = $totalTime / $successful
    Write-Host "⏱️  متوسط وقت الاستجابة: $([math]::Round($avgTime, 2))ms" -ForegroundColor Yellow
    
    if ($avgTime -lt 500) {
        Write-Host "🌟 ممتاز! أداء سريع جداً" -ForegroundColor Green
    } elseif ($avgTime -lt 1500) {
        Write-Host "👍 جيد! أداء مقبول" -ForegroundColor Yellow  
    } else {
        Write-Host "⚠️  بطيء - يحتاج تحسين" -ForegroundColor Red
    }
}

# اختبار API
Write-Host "`n🔐 اختبار API تسجيل الدخول..." -ForegroundColor Cyan

$loginData = @'
{"email":"test@example.com","password":"password123"}
'@

try {
    $start = Get-Date
    $loginResult = Invoke-WebRequest -Uri "$Url/api/auth/login" -Method POST -Body $loginData -ContentType "application/json" -TimeoutSec 10 -UseBasicParsing
    $end = Get-Date
    $apiTime = ($end - $start).TotalMilliseconds
    
    Write-Host "✅ API يعمل - كود: $($loginResult.StatusCode) - $([math]::Round($apiTime, 2))ms" -ForegroundColor Green
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    if ($statusCode -eq 401 -or $statusCode -eq 400) {
        Write-Host "✅ API يعمل - رفض بيانات خاطئة (طبيعي)" -ForegroundColor Green
    } else {
        Write-Host "❌ مشكلة في API: كود $statusCode" -ForegroundColor Red
    }
}

Write-Host "`n🎉 انتهى الاختبار!" -ForegroundColor Green

if ($successful -eq $Requests) {
    Write-Host "🎯 النتيجة: المنصة مستقرة ومستعدة للاستخدام!" -ForegroundColor Green
} else {
    Write-Host "⚠️  النتيجة: قد تحتاج لمراجعة وتحسين" -ForegroundColor Yellow
}

Write-Host "`n💡 للاختبار المتقدم:" -ForegroundColor Gray
Write-Host "npm run stress-test-quick" -ForegroundColor Gray