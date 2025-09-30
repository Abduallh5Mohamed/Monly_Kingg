# اختبار ضغط شامل للمنصة
# يختبر قدرة المنصة على تحمل عدد كبير من المستخدمين المتزامنين

param(
    [int]$Users = 20,
    [int]$Duration = 60,
    [string]$ServerUrl = "http://localhost:3000",
    [switch]$Quick
)

Write-Host "🚀 بدء اختبار الضغط للمنصة" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# فحص توفر Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js متوفر: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js غير متوفر - يرجى تثبيته أولاً" -ForegroundColor Red
    exit 1
}

# فحص حالة الخادم
Write-Host "`n🔍 فحص حالة الخادم..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $ServerUrl -TimeoutSec 10 -UseBasicParsing
    Write-Host "✅ الخادم يعمل بشكل طبيعي (الحالة: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ الخادم غير متاح: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "تأكد من تشغيل الخادم باستخدام: npm start" -ForegroundColor Yellow
    exit 1
}

# إنشاء مجلد النتائج
$resultsDir = "load-test-results"
if (!(Test-Path $resultsDir)) {
    New-Item -ItemType Directory -Path $resultsDir | Out-Null
    Write-Host "📁 تم إنشاء مجلد النتائج: $resultsDir" -ForegroundColor Green
}

# تثبيت autocannon إذا لم يكن مثبت
Write-Host "`n📦 التحقق من أدوات الاختبار..." -ForegroundColor Yellow
try {
    npm list autocannon -g | Out-Null
} catch {
    Write-Host "🔧 تثبيت autocannon..." -ForegroundColor Yellow
    npm install -g autocannon
}

# دالة اختبار الضغط
function Test-LoadEndpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$Connections,
        [int]$Duration,
        [string]$Method = "GET",
        [string]$Body = $null
    )
    
    Write-Host "`n📊 اختبار: $Name" -ForegroundColor Cyan
    Write-Host "   URL: $Url" -ForegroundColor Gray
    Write-Host "   الاتصالات المتزامنة: $Connections" -ForegroundColor Gray
    Write-Host "   المدة: $Duration ثانية" -ForegroundColor Gray
    
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $outputFile = "$resultsDir\$($Name.Replace(' ', '-'))-$timestamp.json"
    
    if ($Body) {
        $result = autocannon -c $Connections -d $Duration -m $Method -H "Content-Type=application/json" -b $Body $Url
    } else {
        $result = autocannon -c $Connections -d $Duration $Url
    }
    
    # حفظ النتائج
    $result | Out-File -FilePath $outputFile -Encoding UTF8
    
    Write-Host "✅ انتهى اختبار: $Name" -ForegroundColor Green
    return $result
}

# اختبار سريع (إذا تم تحديد العلامة Quick)
if ($Quick) {
    Write-Host "`n⚡ تشغيل اختبار سريع..." -ForegroundColor Yellow
    
    # اختبار الصفحة الرئيسية
    Test-LoadEndpoint -Name "الصفحة الرئيسية" -Url $ServerUrl -Connections 5 -Duration 15
    
    # اختبار صفحة تسجيل الدخول
    Test-LoadEndpoint -Name "صفحة تسجيل الدخول" -Url "$ServerUrl/login" -Connections 3 -Duration 10
    
    Write-Host "`n🎉 انتهى الاختبار السريع!" -ForegroundColor Green
    exit 0
}

# اختبار شامل
Write-Host "`n🔥 بدء الاختبار الشامل..." -ForegroundColor Yellow
Write-Host "المستخدمين المتزامنين: $Users" -ForegroundColor Gray
Write-Host "مدة كل اختبار: $Duration ثانية" -ForegroundColor Gray

$allResults = @()

# المرحلة 1: اختبار خفيف
Write-Host "`n=== المرحلة 1: اختبار خفيف ===" -ForegroundColor Magenta
$lightConnections = [Math]::Max(1, [Math]::Floor($Users * 0.25))
$lightDuration = [Math]::Max(10, [Math]::Floor($Duration * 0.5))

$result1 = Test-LoadEndpoint -Name "الصفحة الرئيسية (خفيف)" -Url $ServerUrl -Connections $lightConnections -Duration $lightDuration
$allResults += $result1

Start-Sleep -Seconds 5

# المرحلة 2: اختبار متوسط
Write-Host "`n=== المرحلة 2: اختبار متوسط ===" -ForegroundColor Magenta
$mediumConnections = [Math]::Max(1, [Math]::Floor($Users * 0.5))
$mediumDuration = [Math]::Max(15, [Math]::Floor($Duration * 0.75))

$result2 = Test-LoadEndpoint -Name "صفحة تسجيل الدخول (متوسط)" -Url "$ServerUrl/login" -Connections $mediumConnections -Duration $mediumDuration
$allResults += $result2

Start-Sleep -Seconds 5

# المرحلة 3: اختبار API تسجيل الدخول
Write-Host "`n=== المرحلة 3: اختبار API ===" -ForegroundColor Magenta
$apiConnections = [Math]::Max(1, [Math]::Floor($Users * 0.3))
$loginBody = '{"email":"testuser1@example.com","password":"TestPass123"}'

$result3 = Test-LoadEndpoint -Name "API تسجيل الدخول" -Url "$ServerUrl/api/auth/login" -Connections $apiConnections -Duration $mediumDuration -Method "POST" -Body $loginBody
$allResults += $result3

Start-Sleep -Seconds 10

# المرحلة 4: اختبار الضغط الأقصى
Write-Host "`n=== المرحلة 4: اختبار الضغط الأقصى ===" -ForegroundColor Magenta
$maxConnections = $Users
$maxDuration = $Duration

$result4 = Test-LoadEndpoint -Name "الصفحة الرئيسية (أقصى ضغط)" -Url $ServerUrl -Connections $maxConnections -Duration $maxDuration
$allResults += $result4

# تحليل النتائج
Write-Host "`n📈 تحليل النتائج الإجمالية" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

$totalRequests = 0
$totalErrors = 0
$avgLatency = 0

foreach ($result in $allResults) {
    if ($result -match "(\d+) requests in") {
        $requests = [int]$matches[1]
        $totalRequests += $requests
    }
    
    if ($result -match "(\d+) errors") {
        $errors = [int]$matches[1]
        $totalErrors += $errors
    }
}

Write-Host "📊 الإحصائيات الإجمالية:" -ForegroundColor Cyan
Write-Host "   إجمالي الطلبات: $totalRequests" -ForegroundColor White
Write-Host "   إجمالي الأخطاء: $totalErrors" -ForegroundColor White
Write-Host "   نسبة النجاح: $([Math]::Round((($totalRequests - $totalErrors) / $totalRequests) * 100, 2))%" -ForegroundColor White

# التوصيات
Write-Host "`n💡 التوصيات:" -ForegroundColor Yellow
if ($totalErrors -eq 0) {
    Write-Host "✅ ممتاز! لا توجد أخطاء - المنصة مستقرة" -ForegroundColor Green
} elseif ($totalErrors -lt ($totalRequests * 0.05)) {
    Write-Host "⚠️  جيد - نسبة أخطاء قليلة ($([Math]::Round(($totalErrors / $totalRequests) * 100, 2))%)" -ForegroundColor Yellow
} else {
    Write-Host "❌ تحتاج تحسين - نسبة أخطاء عالية ($([Math]::Round(($totalErrors / $totalRequests) * 100, 2))%)" -ForegroundColor Red
    Write-Host "   - تحقق من إعدادات قاعدة البيانات" -ForegroundColor White
    Write-Host "   - راجع إعدادات Redis" -ForegroundColor White
    Write-Host "   - تأكد من كفاية موارد الخادم" -ForegroundColor White
}

Write-Host "`n📁 النتائج محفوظة في: $resultsDir" -ForegroundColor Green
Write-Host "🎯 انتهى اختبار الضغط بنجاح!" -ForegroundColor Green