// إعداد اختبار الضغط الشامل للمنصة
import autocannon from 'autocannon';
import { spawn } from 'child_process';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const SERVER_URL = 'http://localhost:3000';
const TEST_RESULTS_DIR = './load-test-results';

// إنشاء مجلد النتائج
if (!fs.existsSync(TEST_RESULTS_DIR)) {
    fs.mkdirSync(TEST_RESULTS_DIR);
}

// بيانات تسجيل دخول وهمية
const generateTestUsers = (count) => {
    const users = [];
    for (let i = 1; i <= count; i++) {
        users.push({
            email: `testuser${i}@example.com`,
            password: `TestPass123${i}`,
            username: `testuser${i}`,
            dateOfBirth: '1990-01-01'
        });
    }
    return users;
};

// اختبار تسجيل الدخول
async function testLogin(users = 10, connections = 10, duration = 30) {
    console.log(`🔐 اختبار تسجيل الدخول: ${users} مستخدم، ${connections} اتصال متزامن، ${duration} ثانية`);

    const testData = generateTestUsers(users);

    const instance = autocannon({
        url: `${SERVER_URL}/api/auth/login`,
        connections: connections,
        duration: duration,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        setupClient: (client) => {
            client.setBody(JSON.stringify({
                email: testData[Math.floor(Math.random() * testData.length)].email,
                password: 'TestPass123'
            }));
        }
    });

    return new Promise((resolve) => {
        autocannon.track(instance);
        instance.on('done', (result) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            fs.writeFileSync(
                path.join(TEST_RESULTS_DIR, `login-test-${timestamp}.json`),
                JSON.stringify(result, null, 2)
            );
            console.log('📊 نتائج اختبار تسجيل الدخول:');
            console.log(`   الطلبات الإجمالية: ${result.requests.total}`);
            console.log(`   الطلبات في الثانية: ${result.requests.average}`);
            console.log(`   وقت الاستجابة المتوسط: ${result.latency.average}ms`);
            console.log(`   الأخطاء: ${result.errors}`);
            resolve(result);
        });
    });
}

// اختبار التسجيل
async function testRegistration(users = 5, connections = 5, duration = 20) {
    console.log(`📝 اختبار التسجيل: ${users} مستخدم، ${connections} اتصال متزامن، ${duration} ثانية`);

    let counter = 0;

    const instance = autocannon({
        url: `${SERVER_URL}/api/auth/register`,
        connections: connections,
        duration: duration,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        setupClient: (client) => {
            const uniqueId = Date.now() + Math.random();
            client.setBody(JSON.stringify({
                email: `loadtest${uniqueId}@example.com`,
                password: 'TestPass123!',
                username: `loaduser${uniqueId}`,
                dateOfBirth: '1990-01-01'
            }));
        }
    });

    return new Promise((resolve) => {
        autocannon.track(instance);
        instance.on('done', (result) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            fs.writeFileSync(
                path.join(TEST_RESULTS_DIR, `register-test-${timestamp}.json`),
                JSON.stringify(result, null, 2)
            );
            console.log('📊 نتائج اختبار التسجيل:');
            console.log(`   الطلبات الإجمالية: ${result.requests.total}`);
            console.log(`   الطلبات في الثانية: ${result.requests.average}`);
            console.log(`   وقت الاستجابة المتوسط: ${result.latency.average}ms`);
            console.log(`   الأخطاء: ${result.errors}`);
            resolve(result);
        });
    });
}

// اختبار الصفحة الرئيسية
async function testHomePage(connections = 20, duration = 30) {
    console.log(`🏠 اختبار الصفحة الرئيسية: ${connections} اتصال متزامن، ${duration} ثانية`);

    const instance = autocannon({
        url: SERVER_URL,
        connections: connections,
        duration: duration
    });

    return new Promise((resolve) => {
        autocannon.track(instance);
        instance.on('done', (result) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            fs.writeFileSync(
                path.join(TEST_RESULTS_DIR, `homepage-test-${timestamp}.json`),
                JSON.stringify(result, null, 2)
            );
            console.log('📊 نتائج اختبار الصفحة الرئيسية:');
            console.log(`   الطلبات الإجمالية: ${result.requests.total}`);
            console.log(`   الطلبات في الثانية: ${result.requests.average}`);
            console.log(`   وقت الاستجابة المتوسط: ${result.latency.average}ms`);
            console.log(`   الأخطاء: ${result.errors}`);
            resolve(result);
        });
    });
}

// اختبار مختلط (تسجيل دخول + تصفح)
async function testMixedLoad(connections = 15, duration = 60) {
    console.log(`🔄 اختبار مختلط: ${connections} اتصال، ${duration} ثانية`);

    const requests = [
        {
            method: 'GET',
            path: '/',
            weight: 4
        },
        {
            method: 'POST',
            path: '/api/auth/login',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'testuser1@example.com',
                password: 'TestPass123'
            }),
            weight: 2
        },
        {
            method: 'GET',
            path: '/login',
            weight: 2
        },
        {
            method: 'GET',
            path: '/register',
            weight: 1
        }
    ];

    const instance = autocannon({
        url: SERVER_URL,
        connections: connections,
        duration: duration,
        requests: requests
    });

    return new Promise((resolve) => {
        autocannon.track(instance);
        instance.on('done', (result) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            fs.writeFileSync(
                path.join(TEST_RESULTS_DIR, `mixed-test-${timestamp}.json`),
                JSON.stringify(result, null, 2)
            );
            console.log('📊 نتائج الاختبار المختلط:');
            console.log(`   الطلبات الإجمالية: ${result.requests.total}`);
            console.log(`   الطلبات في الثانية: ${result.requests.average}`);
            console.log(`   وقت الاستجابة المتوسط: ${result.latency.average}ms`);
            console.log(`   الأخطاء: ${result.errors}`);
            resolve(result);
        });
    });
}

// مراقب الأداء
async function monitorPerformance() {
    console.log('📊 بدء مراقبة الأداء...');

    const stats = {
        cpu: [],
        memory: [],
        redis: [],
        mongodb: []
    };

    const interval = setInterval(async () => {
        try {
            // مراقبة Redis
            const redisInfo = await axios.get(`${SERVER_URL}/api/cache-monitor`).catch(() => null);
            if (redisInfo?.data) {
                stats.redis.push({
                    timestamp: new Date(),
                    ...redisInfo.data
                });
            }

            // مراقبة استهلاك الذاكرة
            const memUsage = process.memoryUsage();
            stats.memory.push({
                timestamp: new Date(),
                heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
                heapTotal: memUsage.heapTotal / 1024 / 1024,
                external: memUsage.external / 1024 / 1024
            });

        } catch (error) {
            console.error('خطأ في مراقبة الأداء:', error.message);
        }
    }, 2000);

    return {
        stop: () => {
            clearInterval(interval);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            fs.writeFileSync(
                path.join(TEST_RESULTS_DIR, `performance-monitor-${timestamp}.json`),
                JSON.stringify(stats, null, 2)
            );
            console.log('✅ تم حفظ بيانات مراقبة الأداء');
        },
        getStats: () => stats
    };
}

// تشغيل جميع الاختبارات
async function runFullLoadTest() {
    console.log('🚀 بدء اختبار الضغط الشامل للمنصة...\n');

    const monitor = await monitorPerformance();
    const results = {};

    try {
        // اختبار خفيف أولاً
        console.log('=== المرحلة 1: اختبار خفيف ===');
        results.lightLoad = {
            homepage: await testHomePage(5, 20),
            login: await testLogin(3, 3, 20)
        };

        await new Promise(resolve => setTimeout(resolve, 5000)); // راحة 5 ثواني

        // اختبار متوسط
        console.log('\n=== المرحلة 2: اختبار متوسط ===');
        results.mediumLoad = {
            homepage: await testHomePage(15, 30),
            login: await testLogin(10, 10, 30),
            register: await testRegistration(5, 5, 20)
        };

        await new Promise(resolve => setTimeout(resolve, 10000)); // راحة 10 ثواني

        // اختبار ثقيل
        console.log('\n=== المرحلة 3: اختبار ثقيل ===');
        results.heavyLoad = {
            mixed: await testMixedLoad(25, 60),
            login: await testLogin(20, 20, 45)
        };

        // اختبار الضغط القصوى (اختياري)
        console.log('\n=== المرحلة 4: اختبار الضغط القصوى ===');
        results.stressTest = {
            homepage: await testHomePage(50, 30),
            mixed: await testMixedLoad(40, 45)
        };

    } catch (error) {
        console.error('❌ خطأ أثناء اختبار الضغط:', error.message);
    } finally {
        monitor.stop();

        // حفظ النتائج الإجمالية
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        fs.writeFileSync(
            path.join(TEST_RESULTS_DIR, `full-load-test-${timestamp}.json`),
            JSON.stringify(results, null, 2)
        );

        console.log('\n🎯 ملخص نتائج اختبار الضغط:');
        console.log('=====================================');

        Object.entries(results).forEach(([testType, tests]) => {
            console.log(`\n${testType.toUpperCase()}:`);
            Object.entries(tests).forEach(([testName, result]) => {
                console.log(`  ${testName}:`);
                console.log(`    طلبات/ثانية: ${result.requests?.average || 'غير متاح'}`);
                console.log(`    وقت الاستجابة: ${result.latency?.average || 'غير متاح'}ms`);
                console.log(`    الأخطاء: ${result.errors || 0}`);
            });
        });
    }
}

// تصدير الوظائف
export {
    testLogin,
    testRegistration,
    testHomePage,
    testMixedLoad,
    monitorPerformance,
    runFullLoadTest
};

// تشغيل مباشر إذا تم استدعاء الملف
if (import.meta.url === `file://${process.argv[1]}`) {
    runFullLoadTest();
}