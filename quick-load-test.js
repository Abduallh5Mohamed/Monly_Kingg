#!/usr/bin/env node

// اختبار ضغط سريع ومباشر
import { spawn } from 'child_process';
import axios from 'axios';

const SERVER_URL = 'http://localhost:3000';

// فحص حالة الخادم
async function checkServerHealth() {
    console.log('🔍 فحص حالة الخادم...');
    try {
        const response = await axios.get(SERVER_URL, { timeout: 5000 });
        console.log('✅ الخادم يعمل بشكل طبيعي');
        return true;
    } catch (error) {
        console.log('❌ الخادم غير متاح:', error.message);
        return false;
    }
}

// اختبار ضغط سريع باستخدام curl
async function quickStressTest() {
    console.log('🚀 بدء اختبار الضغط السريع...');

    const tests = [
        {
            name: 'الصفحة الرئيسية',
            command: 'curl',
            args: ['-s', '-o', '/dev/null', '-w', '%{http_code},%{time_total}\\n', SERVER_URL],
            concurrent: 10,
            duration: 30
        },
        {
            name: 'صفحة تسجيل الدخول',
            command: 'curl',
            args: ['-s', '-o', '/dev/null', '-w', '%{http_code},%{time_total}\\n', `${SERVER_URL}/login`],
            concurrent: 8,
            duration: 20
        }
    ];

    for (const test of tests) {
        console.log(`\n📊 اختبار: ${test.name}`);
        console.log(`   ${test.concurrent} طلب متزامن لمدة ${test.duration} ثانية`);

        const promises = [];
        const results = [];
        const startTime = Date.now();

        // تشغيل الطلبات المتزامنة
        for (let i = 0; i < test.concurrent; i++) {
            const promise = new Promise((resolve) => {
                const process = spawn(test.command, test.args);
                let output = '';

                process.stdout.on('data', (data) => {
                    output += data.toString();
                });

                process.on('close', (code) => {
                    const [httpCode, responseTime] = output.trim().split(',');
                    results.push({
                        httpCode: parseInt(httpCode),
                        responseTime: parseFloat(responseTime) * 1000 // تحويل إلى ميلي ثانية
                    });
                    resolve();
                });
            });

            promises.push(promise);
        }

        // انتظار اكتمال جميع الطلبات أو انتهاء المدة
        await Promise.race([
            Promise.all(promises),
            new Promise(resolve => setTimeout(resolve, test.duration * 1000))
        ]);

        // تحليل النتائج
        const successfulRequests = results.filter(r => r.httpCode >= 200 && r.httpCode < 400);
        const averageResponseTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;
        const totalTime = Date.now() - startTime;
        const requestsPerSecond = (results.length / totalTime) * 1000;

        console.log(`   ✅ طلبات ناجحة: ${successfulRequests.length}/${results.length}`);
        console.log(`   ⚡ طلبات/ثانية: ${requestsPerSecond.toFixed(2)}`);
        console.log(`   ⏱️  وقت الاستجابة المتوسط: ${averageResponseTime.toFixed(2)}ms`);

        if (successfulRequests.length < results.length * 0.9) {
            console.log(`   ⚠️  تحذير: نسبة نجاح منخفضة (${((successfulRequests.length / results.length) * 100).toFixed(1)}%)`);
        }
    }
}

// اختبار تسجيل الدخول المتزامن
async function testConcurrentLogins() {
    console.log('\n🔐 اختبار تسجيل الدخول المتزامن...');

    const loginData = {
        email: 'testuser1@example.com',
        password: 'TestPass123'
    };

    const concurrentLogins = 5;
    const promises = [];

    for (let i = 0; i < concurrentLogins; i++) {
        const promise = axios.post(`${SERVER_URL}/api/auth/login`, loginData, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        }).then(response => ({
            success: true,
            status: response.status,
            responseTime: response.headers['x-response-time'] || 'غير متاح'
        })).catch(error => ({
            success: false,
            error: error.message,
            status: error.response?.status || 'غير متاح'
        }));

        promises.push(promise);
    }

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success);

    console.log(`   ✅ تسجيل دخول ناجح: ${successful.length}/${results.length}`);
    console.log(`   ❌ فشل: ${results.length - successful.length}`);

    if (successful.length < results.length) {
        console.log('   تفاصيل الأخطاء:');
        results.filter(r => !r.success).forEach((result, index) => {
            console.log(`     ${index + 1}. ${result.error}`);
        });
    }
}

// مراقب موارد النظام البسيط
function startResourceMonitor() {
    console.log('📊 بدء مراقبة موارد النظام...');

    const stats = {
        memory: [],
        startTime: Date.now()
    };

    const interval = setInterval(() => {
        const memUsage = process.memoryUsage();
        stats.memory.push({
            timestamp: Date.now(),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024)
        });
    }, 2000);

    return {
        stop: () => {
            clearInterval(interval);
            const duration = (Date.now() - stats.startTime) / 1000;
            const avgMemory = stats.memory.reduce((sum, m) => sum + m.heapUsed, 0) / stats.memory.length;
            const maxMemory = Math.max(...stats.memory.map(m => m.heapUsed));

            console.log('\n💾 إحصائيات استهلاك الذاكرة:');
            console.log(`   المدة: ${duration.toFixed(1)} ثانية`);
            console.log(`   متوسط الاستهلاك: ${avgMemory.toFixed(1)} MB`);
            console.log(`   أقصى استهلاك: ${maxMemory} MB`);
        }
    };
}

// الاختبار الرئيسي
async function runQuickLoadTest() {
    console.log('🎯 اختبار ضغط سريع للمنصة');
    console.log('=====================================\n');

    const monitor = startResourceMonitor();

    try {
        // فحص حالة الخادم
        const serverOk = await checkServerHealth();
        if (!serverOk) {
            console.log('❌ لا يمكن المتابعة - الخادم غير متاح');
            return;
        }

        // اختبار الضغط السريع
        await quickStressTest();

        // اختبار تسجيل الدخول المتزامن
        await testConcurrentLogins();

        console.log('\n🎉 انتهى الاختبار بنجاح!');
        console.log('\nتوصيات:');
        console.log('- إذا كانت أوقات الاستجابة > 2000ms، قم بمراجعة الاستعلامات');
        console.log('- إذا كانت نسبة النجاح < 95%، تحقق من الأخطاء');
        console.log('- إذا كان استهلاك الذاكرة يزيد باستمرار، قد يكون هناك تسريب');

    } catch (error) {
        console.error('❌ خطأ أثناء الاختبار:', error.message);
    } finally {
        monitor.stop();
    }
}

// تشغيل الاختبار
if (import.meta.url === `file://${process.argv[1]}`) {
    runQuickLoadTest();
}

export { runQuickLoadTest, checkServerHealth, quickStressTest, testConcurrentLogins };