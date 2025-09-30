#!/usr/bin/env node

// اختبار ضغط فوري ومبسط
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const SERVER_URL = 'http://localhost:5000';

// فحص إذا كان الخادم يعمل
async function checkServer() {
    try {
        console.log('🔍 فحص حالة الخادم...');
        await execAsync(`curl -s --max-time 5 ${SERVER_URL} > nul`);
        console.log('✅ الخادم يعمل');
        return true;
    } catch (error) {
        console.log('❌ الخادم غير متاح');
        console.log('💡 تأكد من تشغيل الخادم بـ: npm start');
        return false;
    }
}

// اختبار ضغط مبسط باستخدام curl
async function simpleLoadTest() {
    console.log('\n🚀 بدء اختبار الضغط المبسط...');

    const tests = [
        {
            name: 'الصفحة الرئيسية',
            url: SERVER_URL,
            requests: 10
        },
        {
            name: 'صفحة تسجيل الدخول',
            url: `${SERVER_URL}/login`,
            requests: 5
        }
    ];

    for (const test of tests) {
        console.log(`\n📊 اختبار: ${test.name}`);

        const startTime = Date.now();
        const promises = [];

        // إنشاء طلبات متزامنة
        for (let i = 0; i < test.requests; i++) {
            const promise = execAsync(`curl -s -w "%{http_code},%{time_total}" -o nul "${test.url}"`)
                .then(({ stdout }) => {
                    const [httpCode, responseTime] = stdout.trim().split(',');
                    return {
                        success: parseInt(httpCode) >= 200 && parseInt(httpCode) < 400,
                        responseTime: parseFloat(responseTime) * 1000 // تحويل إلى ميلي ثانية
                    };
                })
                .catch(() => ({ success: false, responseTime: 0 }));

            promises.push(promise);
        }

        try {
            const results = await Promise.all(promises);
            const totalTime = Date.now() - startTime;
            const successfulRequests = results.filter(r => r.success);
            const averageResponseTime = results
                .filter(r => r.success)
                .reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;

            console.log(`   ✅ نجح: ${successfulRequests.length}/${results.length}`);
            console.log(`   ⚡ الوقت الإجمالي: ${totalTime}ms`);
            console.log(`   ⏱️  متوسط وقت الاستجابة: ${averageResponseTime?.toFixed(2) || 'غير متاح'}ms`);

            if (successfulRequests.length === results.length) {
                console.log(`   🎉 ممتاز - جميع الطلبات نجحت!`);
            } else {
                console.log(`   ⚠️  تحذير - فشل ${results.length - successfulRequests.length} طلب`);
            }

        } catch (error) {
            console.log(`   ❌ خطأ في الاختبار: ${error.message}`);
        }
    }
}

// اختبار تسجيل دخول مباشر
async function testDirectLogin() {
    console.log('\n🔐 اختبار تسجيل الدخول...');

    const loginData = JSON.stringify({
        email: 'testuser1@example.com',
        password: 'TestPass1231'
    });

    try {
        const command = `curl -s -X POST -H "Content-Type: application/json" -d "${loginData}" -w "%{http_code},%{time_total}" "${SERVER_URL}/api/auth/login"`;
        const { stdout } = await execAsync(command);

        // استخراج كود الاستجابة ووقت الاستجابة من آخر سطر
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const [httpCode, responseTime] = lastLine.split(',');

        if (parseInt(httpCode) === 200) {
            console.log(`   ✅ تسجيل الدخول نجح`);
            console.log(`   ⏱️  وقت الاستجابة: ${(parseFloat(responseTime) * 1000).toFixed(2)}ms`);
        } else if (parseInt(httpCode) === 401) {
            console.log(`   ⚠️  بيانات الدخول خاطئة أو المستخدم غير موجود`);
            console.log(`   💡 قم بإنشاء مستخدمين تجريبيين بـ: npm run create-test-users`);
        } else {
            console.log(`   ❌ فشل تسجيل الدخول - كود: ${httpCode}`);
        }

    } catch (error) {
        console.log(`   ❌ خطأ في اختبار تسجيل الدخول: ${error.message}`);
    }
}

// التقرير النهائي
function showReport() {
    console.log('\n📋 تقرير اختبار الضغط المبسط');
    console.log('=====================================');
    console.log('✅ إذا نجحت جميع الاختبارات - المنصة مستقرة للاستخدام العادي');
    console.log('⚠️  إذا فشلت بعض الطلبات - قد تحتاج لتحسين الأداء');
    console.log('❌ إذا فشلت معظم الطلبات - هناك مشكلة تحتاج حل');
    console.log('\n🚀 للاختبار المتقدم استخدم:');
    console.log('   npm run stress-test-quick  (اختبار سريع)');
    console.log('   npm run stress-test        (اختبار متوسط)');
    console.log('   npm run stress-test-heavy  (اختبار ثقيل)');
}

// الاختبار الرئيسي
async function main() {
    console.log('⚡ اختبار ضغط سريع ومباشر');
    console.log('=========================\n');

    const serverReady = await checkServer();
    if (!serverReady) {
        return;
    }

    await simpleLoadTest();
    await testDirectLogin();
    showReport();
}

// تشغيل الاختبار
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('❌ خطأ في الاختبار:', error.message);
        process.exit(1);
    });
}

export { checkServer, simpleLoadTest, testDirectLogin };