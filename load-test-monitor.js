// مراقب الأداء المتقدم أثناء اختبار الضغط
import redis from './src/config/redis.js';
import mongoose from 'mongoose';
import os from 'os';
import fs from 'fs';
import { performance } from 'perf_hooks';

class LoadTestMonitor {
    constructor() {
        this.startTime = Date.now();
        this.metrics = {
            requests: [],
            responses: [],
            errors: [],
            memory: [],
            cpu: [],
            redis: [],
            mongodb: []
        };
        this.isMonitoring = false;
        this.interval = null;
    }

    // بدء المراقبة
    start() {
        console.log('📊 بدء مراقبة الأداء المتقدم...');
        this.isMonitoring = true;
        this.startTime = Date.now();

        this.interval = setInterval(() => {
            this.collectMetrics();
        }, 1000); // كل ثانية

        return this;
    }

    // إيقاف المراقبة
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isMonitoring = false;
        console.log('⏹️  تم إيقاف مراقبة الأداء');
        return this.generateReport();
    }

    // جمع المقاييس
    async collectMetrics() {
        const timestamp = Date.now();

        try {
            // مقاييس الذاكرة
            const memUsage = process.memoryUsage();
            this.metrics.memory.push({
                timestamp,
                heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
                heapTotal: memUsage.heapTotal / 1024 / 1024,
                external: memUsage.external / 1024 / 1024,
                rss: memUsage.rss / 1024 / 1024
            });

            // مقاييس CPU
            const cpuUsage = process.cpuUsage();
            this.metrics.cpu.push({
                timestamp,
                user: cpuUsage.user / 1000, // تحويل إلى ميلي ثانية
                system: cpuUsage.system / 1000,
                loadAverage: os.loadavg()
            });

            // مقاييس Redis
            if (redis.isConnected) {
                const redisInfo = await this.getRedisMetrics();
                if (redisInfo) {
                    this.metrics.redis.push({
                        timestamp,
                        ...redisInfo
                    });
                }
            }

            // مقاييس MongoDB
            if (mongoose.connection.readyState === 1) {
                const mongoStats = await this.getMongoMetrics();
                if (mongoStats) {
                    this.metrics.mongodb.push({
                        timestamp,
                        ...mongoStats
                    });
                }
            }

        } catch (error) {
            console.error('خطأ في جمع المقاييس:', error.message);
        }
    }

    // مقاييس Redis
    async getRedisMetrics() {
        try {
            const info = await redis.client.info();
            const lines = info.split('\r\n');
            const stats = {};

            lines.forEach(line => {
                if (line.includes(':')) {
                    const [key, value] = line.split(':');
                    stats[key] = value;
                }
            });

            return {
                connectedClients: parseInt(stats.connected_clients) || 0,
                usedMemory: parseInt(stats.used_memory) / 1024 / 1024, // MB
                keyspaceHits: parseInt(stats.keyspace_hits) || 0,
                keyspaceMisses: parseInt(stats.keyspace_misses) || 0,
                totalCommandsProcessed: parseInt(stats.total_commands_processed) || 0
            };
        } catch (error) {
            return null;
        }
    }

    // مقاييس MongoDB
    async getMongoMetrics() {
        try {
            const admin = mongoose.connection.db.admin();
            const serverStatus = await admin.serverStatus();

            return {
                connections: serverStatus.connections.current,
                opcounters: serverStatus.opcounters,
                memory: {
                    resident: serverStatus.mem.resident,
                    virtual: serverStatus.mem.virtual
                },
                network: serverStatus.network
            };
        } catch (error) {
            return null;
        }
    }

    // تسجيل طلب
    logRequest(method, url, startTime) {
        this.metrics.requests.push({
            timestamp: Date.now(),
            method,
            url,
            startTime
        });
    }

    // تسجيل استجابة
    logResponse(statusCode, responseTime, url) {
        this.metrics.responses.push({
            timestamp: Date.now(),
            statusCode,
            responseTime,
            url
        });
    }

    // تسجيل خطأ
    logError(error, url) {
        this.metrics.errors.push({
            timestamp: Date.now(),
            error: error.message,
            url,
            stack: error.stack
        });
    }

    // إنشاء تقرير شامل
    generateReport() {
        const duration = (Date.now() - this.startTime) / 1000; // ثواني
        const report = {
            testDuration: duration,
            summary: this.calculateSummary(),
            performance: this.analyzePerformance(),
            recommendations: this.generateRecommendations(),
            rawMetrics: this.metrics
        };

        // حفظ التقرير
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `load-test-report-${timestamp}.json`;

        try {
            if (!fs.existsSync('./load-test-results')) {
                fs.mkdirSync('./load-test-results');
            }

            fs.writeFileSync(`./load-test-results/${filename}`, JSON.stringify(report, null, 2));
            console.log(`📋 تم حفظ التقرير: ./load-test-results/${filename}`);
        } catch (error) {
            console.error('خطأ في حفظ التقرير:', error.message);
        }

        return report;
    }

    // حساب الملخص
    calculateSummary() {
        const totalRequests = this.metrics.requests.length;
        const totalResponses = this.metrics.responses.length;
        const totalErrors = this.metrics.errors.length;

        const responseTimes = this.metrics.responses.map(r => r.responseTime);
        const avgResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

        const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
        const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;

        // حساب النسب المئوية (percentiles)
        const sortedTimes = [...responseTimes].sort((a, b) => a - b);
        const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
        const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;

        return {
            totalRequests,
            totalResponses,
            totalErrors,
            successRate: totalResponses > 0 ? ((totalResponses - totalErrors) / totalResponses * 100).toFixed(2) : 0,
            avgResponseTime: avgResponseTime.toFixed(2),
            minResponseTime,
            maxResponseTime,
            p95ResponseTime: p95,
            p99ResponseTime: p99,
            requestsPerSecond: (totalRequests / (Date.now() - this.startTime) * 1000).toFixed(2)
        };
    }

    // تحليل الأداء
    analyzePerformance() {
        const memoryData = this.metrics.memory;
        const cpuData = this.metrics.cpu;
        const redisData = this.metrics.redis;

        const analysis = {
            memory: {
                avg: 0,
                max: 0,
                trend: 'stable'
            },
            cpu: {
                avgUser: 0,
                avgSystem: 0,
                trend: 'stable'
            },
            redis: {
                hitRate: 0,
                avgConnections: 0
            }
        };

        // تحليل الذاكرة
        if (memoryData.length > 0) {
            const heapUsed = memoryData.map(m => m.heapUsed);
            analysis.memory.avg = (heapUsed.reduce((a, b) => a + b, 0) / heapUsed.length).toFixed(2);
            analysis.memory.max = Math.max(...heapUsed).toFixed(2);

            // تحديد الاتجاه
            if (heapUsed.length > 1) {
                const first = heapUsed.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
                const last = heapUsed.slice(-3).reduce((a, b) => a + b, 0) / 3;
                analysis.memory.trend = last > first * 1.1 ? 'increasing' : last < first * 0.9 ? 'decreasing' : 'stable';
            }
        }

        // تحليل CPU
        if (cpuData.length > 0) {
            analysis.cpu.avgUser = (cpuData.reduce((sum, cpu) => sum + cpu.user, 0) / cpuData.length).toFixed(2);
            analysis.cpu.avgSystem = (cpuData.reduce((sum, cpu) => sum + cpu.system, 0) / cpuData.length).toFixed(2);
        }

        // تحليل Redis
        if (redisData.length > 0) {
            const totalHits = redisData[redisData.length - 1].keyspaceHits - redisData[0].keyspaceHits;
            const totalMisses = redisData[redisData.length - 1].keyspaceMisses - redisData[0].keyspaceMisses;
            analysis.redis.hitRate = totalHits + totalMisses > 0
                ? ((totalHits / (totalHits + totalMisses)) * 100).toFixed(2)
                : 0;
            analysis.redis.avgConnections = (redisData.reduce((sum, r) => sum + r.connectedClients, 0) / redisData.length).toFixed(2);
        }

        return analysis;
    }

    // إنشاء التوصيات
    generateRecommendations() {
        const summary = this.calculateSummary();
        const performance = this.analyzePerformance();
        const recommendations = [];

        // توصيات الأداء
        if (parseFloat(summary.avgResponseTime) > 2000) {
            recommendations.push({
                type: 'performance',
                severity: 'high',
                message: 'وقت الاستجابة المتوسط عالي جداً (> 2 ثانية)',
                action: 'راجع استعلامات قاعدة البيانات وتحسين الفهارس'
            });
        }

        if (parseFloat(summary.successRate) < 95) {
            recommendations.push({
                type: 'reliability',
                severity: 'high',
                message: `نسبة النجاح منخفضة (${summary.successRate}%)`,
                action: 'تحقق من الأخطاء وحسن معالجة الاستثناءات'
            });
        }

        // توصيات الذاكرة
        if (performance.memory.trend === 'increasing') {
            recommendations.push({
                type: 'memory',
                severity: 'medium',
                message: 'استهلاك الذاكرة في ازدياد مستمر',
                action: 'تحقق من تسريب الذاكرة وحسن إدارة الكائنات'
            });
        }

        // توصيات Redis
        if (parseFloat(performance.redis.hitRate) < 80) {
            recommendations.push({
                type: 'cache',
                severity: 'medium',
                message: `معدل إصابة الكاش منخفض (${performance.redis.hitRate}%)`,
                action: 'راجع استراتيجية التخزين المؤقت وأوقات انتهاء الصلاحية'
            });
        }

        // توصيات عامة
        if (recommendations.length === 0) {
            recommendations.push({
                type: 'success',
                severity: 'info',
                message: 'الأداء ممتاز! لا توجد مشاكل كبيرة',
                action: 'استمر في المراقبة المنتظمة'
            });
        }

        return recommendations;
    }

    // طباعة تقرير مبسط
    printSimpleReport() {
        const summary = this.calculateSummary();
        const performance = this.analyzePerformance();

        console.log('\n📊 تقرير الأداء السريع');
        console.log('====================');
        console.log(`📈 إجمالي الطلبات: ${summary.totalRequests}`);
        console.log(`✅ نسبة النجاح: ${summary.successRate}%`);
        console.log(`⚡ طلبات/ثانية: ${summary.requestsPerSecond}`);
        console.log(`⏱️  وقت الاستجابة المتوسط: ${summary.avgResponseTime}ms`);
        console.log(`💾 متوسط استهلاك الذاكرة: ${performance.memory.avg}MB`);
        console.log(`🎯 معدل إصابة الكاش: ${performance.redis.hitRate}%`);
    }
}

export default LoadTestMonitor;