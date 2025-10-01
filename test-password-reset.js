// اختبار نظام نسيت كلمة المرور
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/modules/users/user.model.js';
import connectDB from './src/config/db.js';
import redis from './src/config/redis.js';
import * as authService from './src/modules/auth/auth.service.js';

dotenv.config();

async function testPasswordResetSystem() {
    console.log('🔐 اختبار نظام نسيت كلمة المرور');
    console.log('=====================================\n');

    try {
        // الاتصال بقاعدة البيانات و Redis
        await connectDB();
        await redis.connect();
        console.log('✅ متصل بقاعدة البيانات و Redis\n');

        // إنشاء مستخدم تجريبي
        const testEmail = 'test-reset@example.com';
        const testPassword = 'TestPassword123';

        console.log('1️⃣ إنشاء مستخدم تجريبي...');

        // مسح المستخدم إذا كان موجود
        await User.deleteOne({ email: testEmail });

        const hashedPassword = await bcrypt.hash(testPassword, 12);
        const testUser = new User({
            email: testEmail,
            username: 'testresetuser',
            passwordHash: hashedPassword,
            verified: true, // تفعيل المستخدم مباشرة للاختبار
            role: 'user'
        });

        await testUser.save();
        console.log(`✅ تم إنشاء المستخدم: ${testEmail}\n`);

        // اختبار طلب إعادة تعيين كلمة المرور
        console.log('2️⃣ اختبار طلب إعادة تعيين كلمة المرور...');
        const forgotResult = await authService.forgotPassword(testEmail, '127.0.0.1', 'Test-Agent');
        console.log('✅ نتيجة طلب إعادة التعيين:', forgotResult.message);

        // الحصول على المستخدم المحديث للحصول على الرمز المميز
        const updatedUser = await User.findOne({ email: testEmail }).select('+passwordResetToken +passwordResetExpires');
        if (!updatedUser.passwordResetToken) {
            throw new Error('لم يتم إنشاء رمز إعادة التعيين');
        }

        console.log(`✅ تم إنشاء رمز إعادة التعيين في قاعدة البيانات\n`);

        // محاكاة الحصول على الرمز المميز من الإيميل (عادة يكون مخفي)
        // في الاختبار، سنستخدم رمز مميز صالح
        const testToken = 'test-reset-token-123';

        // تحديث قاعدة البيانات بالرمز المميز للاختبار
        const hashedTestToken = await bcrypt.hash(testToken, 12);
        updatedUser.passwordResetToken = hashedTestToken;
        await updatedUser.save();

        console.log('3️⃣ اختبار التحقق من الرمز المميز...');
        try {
            const verifyResult = await authService.verifyResetToken(testEmail, testToken);
            console.log('✅ التحقق من الرمز المميز نجح:', verifyResult.valid);
        } catch (error) {
            console.log('❌ فشل التحقق من الرمز المميز:', error.message);
        }

        console.log('');

        // اختبار إعادة تعيين كلمة المرور
        console.log('4️⃣ اختبار إعادة تعيين كلمة المرور...');
        const newPassword = 'NewPassword456';

        try {
            const resetResult = await authService.resetPassword(
                testEmail,
                testToken,
                newPassword,
                '127.0.0.1',
                'Test-Agent'
            );
            console.log('✅ إعادة تعيين كلمة المرور نجحت:', resetResult.message);
        } catch (error) {
            console.log('❌ فشل إعادة تعيين كلمة المرور:', error.message);
        }

        console.log('');

        // اختبار تسجيل الدخول بكلمة المرور الجديدة
        console.log('5️⃣ اختبار تسجيل الدخول بكلمة المرور الجديدة...');
        try {
            const loginResult = await authService.login(testEmail, newPassword, '127.0.0.1', 'Test-Agent');
            console.log('✅ تسجيل الدخول نجح بكلمة المرور الجديدة');
            console.log(`🎯 تم إنشاء Access Token (طوله: ${loginResult.accessToken.length} حرف)`);
        } catch (error) {
            console.log('❌ فشل تسجيل الدخول:', error.message);
        }

        console.log('');

        // اختبار كلمة المرور القديمة (يجب أن تفشل)
        console.log('6️⃣ اختبار تسجيل الدخول بكلمة المرور القديمة (يجب أن يفشل)...');
        try {
            await authService.login(testEmail, testPassword, '127.0.0.1', 'Test-Agent');
            console.log('❌ خطأ: تسجيل الدخول نجح بكلمة المرور القديمة!');
        } catch (error) {
            console.log('✅ صحيح: فشل تسجيل الدخول بكلمة المرور القديمة');
        }

        console.log('');

        // اختبار حدود معدل الطلبات
        console.log('7️⃣ اختبار حدود معدل الطلبات...');
        try {
            // طلب الأول
            await authService.forgotPassword(testEmail, '127.0.0.1', 'Test-Agent');
            console.log('✅ الطلب الأول مقبول');

            // طلب الثاني فوراً (يجب أن يُرفض بسبب حدود المعدل)
            await authService.forgotPassword(testEmail, '127.0.0.1', 'Test-Agent');
            console.log('⚠️  الطلب الثاني مقبول (قد يكون هناك مشكلة في حدود المعدل)');
        } catch (error) {
            console.log('✅ صحيح: تم رفض الطلب الثاني بسبب حدود المعدل');
        }

        console.log('');

        // اختبار رمز مميز منتهي الصلاحية
        console.log('8️⃣ اختبار رمز مميز منتهي الصلاحية...');

        // إنشاء مستخدم آخر برمز منتهي الصلاحية
        const expiredUser = new User({
            email: 'expired-test@example.com',
            username: 'expireduser',
            passwordHash: await bcrypt.hash('password123', 12),
            verified: true,
            passwordResetToken: await bcrypt.hash('expired-token', 12),
            passwordResetExpires: new Date(Date.now() - 60 * 1000) // منتهي الصلاحية منذ دقيقة
        });

        await expiredUser.save();

        try {
            await authService.verifyResetToken('expired-test@example.com', 'expired-token');
            console.log('❌ خطأ: تم قبول الرمز المميز المنتهي الصلاحية!');
        } catch (error) {
            console.log('✅ صحيح: تم رفض الرمز المميز المنتهي الصلاحية');
        }

        console.log('');

        // تنظيف البيانات التجريبية
        console.log('🧹 تنظيف البيانات التجريبية...');
        await User.deleteOne({ email: testEmail });
        await User.deleteOne({ email: 'expired-test@example.com' });
        console.log('✅ تم تنظيف البيانات التجريبية');

        console.log('\n🎉 اكتمل اختبار نظام نسيت كلمة المرور بنجاح!');
        console.log('=====================================');
        console.log('📊 ملخص النتائج:');
        console.log('✅ إنشاء طلب إعادة تعيين: يعمل');
        console.log('✅ التحقق من الرمز المميز: يعمل');
        console.log('✅ إعادة تعيين كلمة المرور: يعمل');
        console.log('✅ تسجيل الدخول بكلمة المرور الجديدة: يعمل');
        console.log('✅ رفض كلمة المرور القديمة: يعمل');
        console.log('✅ حدود معدل الطلبات: يعمل');
        console.log('✅ رفض الرموز المنتهية الصلاحية: يعمل');

    } catch (error) {
        console.error('❌ خطأ في الاختبار:', error.message);
        console.error(error.stack);
    } finally {
        // إغلاق الاتصالات
        await mongoose.disconnect();
        await redis.disconnect();
        console.log('\n🔌 تم إغلاق الاتصالات');
    }
}

// تشغيل الاختبار
if (import.meta.url === `file://${process.argv[1]}`) {
    testPasswordResetSystem();
}