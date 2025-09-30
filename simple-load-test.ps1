# اختبار ضغط مبسط باستخدام PowerShell
param(
    [int]$Requests = 10,
    [string]$Url = "http://localhost:5000"
)

Write-Host "🚀 اختبار ضغط مبسط للمنصة" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# فحص الخادم
Write-Host "`n🔍 فحص حالة الخادم..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $Url -TimeoutSec 10 -UseBasicParsing
    Write-Host "✅ الخادم يعمل - كود الاستجابة: $($response.StatusCode)" -ForegroundColor Green
}
catch {
    Write-Host "❌ الخادم غير متاح: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 تأكد من تشغيل الخادم باستخدام: npm run dev" -ForegroundColor Yellow
    exit 1
}

# اختبار ضغط بسيط
Write-Host "`n📊 اختبار الضغط: $Requests طلب متزامن" -ForegroundColor Cyan

$jobs = @()
$startTime = Get-Date

# إنشاء طلبات متزامنة
for ($i = 1; $i -le $Requests; $i++) {
    $job = Start-Job -ScriptBlock {
        param($url)
        try {
            $start = Get-Date
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 10 -UseBasicParsing
            $end = Get-Date
            return @{
                Success = $true
                StatusCode = $response.StatusCode
                ResponseTime = ($end - $start).TotalMilliseconds
            }
        } 
        catch {
            return @{
                Success = $false
                Error = $_.Exception.Message
                ResponseTime = 0
            }
        }
    } -ArgumentList $Url
    
    $jobs += $job
}

# انتظار النتائج
Write-Host "⏳ انتظار النتائج..." -ForegroundColor Yellow
$results = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job

$endTime = Get-Date
$totalTime = ($endTime - $startTime).TotalMilliseconds

# تحليل النتائج
$successful = ($results | Where-Object { $_.Success }).Count
$failed = $results.Count - $successful
$avgResponseTime = ($results | Where-Object { $_.Success } | Measure-Object -Property ResponseTime -Average).Average

Write-Host "`n📈 النتائج:" -ForegroundColor Green
Write-Host "   ✅ طلبات ناجحة: $successful/$($results.Count)" -ForegroundColor White
Write-Host "   ❌ طلبات فاشلة: $failed" -ForegroundColor White
Write-Host "   ⏱️  متوسط وقت الاستجابة: $([math]::Round($avgResponseTime, 2)) ميلي ثانية" -ForegroundColor White
Write-Host "   🕒 الوقت الإجمالي: $([math]::Round($totalTime, 2)) ميلي ثانية" -ForegroundColor White
Write-Host "   ⚡ طلبات في الثانية: $([math]::Round($results.Count / ($totalTime / 1000), 2))" -ForegroundColor White

# تقييم الأداء
Write-Host "`n🎯 تقييم الأداء:" -ForegroundColor Magenta
if ($successful -eq $results.Count -and $avgResponseTime -lt 1000) {
    Write-Host "   🌟 ممتاز! الأداء رائع" -ForegroundColor Green
}
elseif ($successful -ge ($results.Count * 0.9) -and $avgResponseTime -lt 2000) {
    Write-Host "   ✅ جيد - الأداء مقبول" -ForegroundColor Yellow
}
else {
    Write-Host "   ⚠️  يحتاج تحسين - راجع إعدادات الخادم" -ForegroundColor Red
}

# اختبار تسجيل دخول إذا كان متاح
Write-Host "`n🔐 اختبار تسجيل الدخول..." -ForegroundColor Cyan

$loginData = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$Url/api/auth/login" -Method POST -Body $loginData -ContentType "application/json" -TimeoutSec 10 -UseBasicParsing
    Write-Host "   ✅ endpoint تسجيل الدخول يعمل - كود: $($loginResponse.StatusCode)" -ForegroundColor Green
}
catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   ✅ endpoint تسجيل الدخول يعمل - رفض بيانات خاطئة (طبيعي)" -ForegroundColor Green
    } 
    else {
        Write-Host "   ❌ مشكلة في endpoint تسجيل الدخول: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 انتهى اختبار الضغط!" -ForegroundColor Green
Write-Host "💡 للاختبار المتقدم استخدم: npm run stress-test" -ForegroundColor Yellow