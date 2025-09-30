// إنشاء مستخدمين تجريبيين لاختبار الضغط
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/modules/users/user.model.js';
import connectDB from './src/config/db.js';

dotenv.config();

const BCRYPT_ROUNDS = 12;

// إنشاء مستخدمين للاختبار
async function createTestUsers(count = 20) {
    console.log(`🔧 إنشاء ${count} مستخدم للاختبار...`);

    try {
        await connectDB();

        const users = [];
        const batchSize = 10; // معالجة 10 مستخدمين في كل مرة

        for (let i = 1; i <= count; i++) {
            const hashedPassword = await bcrypt.hash(`TestPass123${i}`, BCRYPT_ROUNDS);

            const userData = {
                username: `testuser${i}`,
                email: `testuser${i}@example.com`,
                passwordHash: hashedPassword,
                dateOfBirth: new Date('1990-01-01'),
                role: 'user',
                isEmailVerified: true, // تفعيل البريد مسبقاً للاختبار
                createdAt: new Date(),
                refreshTokens: []
            };

            users.push(userData);

            // معالجة المستخدمين في دفعات
            if (users.length === batchSize || i === count) {
                try {
                    await User.insertMany(users, { ordered: false });
                    console.log(`✅ تم إنشاء ${users.length} مستخدمين (${i}/${count})`);
                } catch (error) {
                    // تجاهل أخطاء التكرار
                    if (error.code === 11000) {
                        console.log(`⚠️  بعض المستخدمين موجودين مسبقاً`);
                    } else {
                        console.error('خطأ في إنشاء المستخدمين:', error.message);
                    }
                }
                users.length = 0; // مسح المصفوفة
            }
        }

        console.log(`🎉 انتهى إنشاء مستخدمي الاختبار!`);
        return true;

    } catch (error) {
        console.error('❌ خطأ في إنشاء مستخدمي الاختبار:', error.message);
        return false;
    }
}

// مسح مستخدمي الاختبار
async function cleanupTestUsers() {
    console.log('🧹 مسح مستخدمي الاختبار...');

    try {
        await connectDB();

        const result = await User.deleteMany({
            email: { $regex: /^testuser\d+@example\.com$/ }
        });

        console.log(`✅ تم مسح ${result.deletedCount} مستخدم تجريبي`);
        return true;

    } catch (error) {
        console.error('❌ خطأ في مسح مستخدمي الاختبار:', error.message);
        return false;
    }
}

// إنشاء مستخدمين بأدوار مختلفة
async function createMixedTestUsers() {
    console.log('🎭 إنشاء مستخدمين بأدوار مختلفة...');

    try {
        await connectDB();

        const roles = ['user', 'premium', 'seller'];
        const users = [];

        for (let i = 1; i <= 30; i++) {
            const role = roles[i % roles.length];
            const hashedPassword = await bcrypt.hash(`TestPass123${i}`, BCRYPT_ROUNDS);

            const userData = {
                username: `${role}${i}`,
                email: `${role}${i}@example.com`,
                passwordHash: hashedPassword,
                dateOfBirth: new Date('1990-01-01'),
                role: role,
                isEmailVerified: true,
                profile: {
                    fullName: `Test ${role} ${i}`,
                    phoneNumber: `+201000000${i.toString().padStart(3, '0')}`,
                    country: 'Egypt',
                    city: 'Cairo'
                },
                createdAt: new Date(),
                refreshTokens: []
            };

            users.push(userData);
        }

        try {
            await User.insertMany(users, { ordered: false });
            console.log(`✅ تم إنشاء ${users.length} مستخدم بأدوار مختلفة`);
        } catch (error) {
            if (error.code === 11000) {
                console.log(`⚠️  بعض المستخدمين موجودين مسبقاً`);
            } else {
                throw error;
            }
        }

        return true;

    } catch (error) {
        console.error('❌ خطأ في إنشاء المستخدمين المختلطين:', error.message);
        return false;
    }
}

// التحقق من المستخدمين الموجودين
async function checkTestUsers() {
    console.log('🔍 التحقق من مستخدمي الاختبار...');

    try {
        await connectDB();

        const testUsersCount = await User.countDocuments({
            email: { $regex: /^testuser\d+@example\.com$/ }
        });

        const mixedUsersCount = await User.countDocuments({
            email: { $regex: /^(user|premium|seller)\d+@example\.com$/ }
        });

        console.log(`📊 الإحصائيات:`);
        console.log(`   مستخدمي الاختبار العاديين: ${testUsersCount}`);
        console.log(`   مستخدمي الاختبار المختلطين: ${mixedUsersCount}`);
        console.log(`   المجموع: ${testUsersCount + mixedUsersCount}`);

        if (testUsersCount + mixedUsersCount === 0) {
            console.log('⚠️  لا توجد مستخدمين للاختبار - قم بإنشائهم أولاً');
        } else {
            console.log('✅ المستخدمين جاهزون للاختبار');
        }

        return { testUsers: testUsersCount, mixedUsers: mixedUsersCount };

    } catch (error) {
        console.error('❌ خطأ في التحقق من المستخدمين:', error.message);
        return null;
    }
}

// دالة اختبار تسجيل الدخول
async function testUserLogin(email, password) {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return { success: false, error: 'المستخدم غير موجود' };
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return { success: false, error: 'كلمة المرور خاطئة' };
        }

        return {
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

// تشغيل حسب الأمر
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';

    switch (command) {
        case 'create':
            const count = parseInt(args[1]) || 20;
            await createTestUsers(count);
            break;

        case 'mixed':
            await createMixedTestUsers();
            break;

        case 'check':
            await checkTestUsers();
            break;

        case 'cleanup':
            await cleanupTestUsers();
            break;

        case 'test-login':
            const email = args[1] || 'testuser1@example.com';
            const password = args[2] || 'TestPass1231';
            const result = await testUserLogin(email, password);
            console.log('نتيجة اختبار تسجيل الدخول:', result);
            break;

        case 'all':
            console.log('🚀 إعداد شامل لاختبار الضغط...');
            await cleanupTestUsers(); // مسح القديم
            await createTestUsers(20); // إنشاء عاديين
            await createMixedTestUsers(); // إنشاء مختلطين
            await checkTestUsers(); // التحقق
            break;

        default:
            console.log(`
🎯 إدارة مستخدمي اختبار الضغط

الاستخدام:
  node create-test-users.js [command] [options]

الأوامر:
  create [count]  - إنشاء مستخدمين عاديين (افتراضي: 20)
  mixed          - إنشاء مستخدمين بأدوار مختلفة
  check          - التحقق من المستخدمين الموجودين
  cleanup        - مسح جميع مستخدمي الاختبار
  test-login     - اختبار تسجيل دخول مستخدم
  all            - إعداد شامل (مسح + إنشاء + تحقق)

أمثلة:
  node create-test-users.js create 50
  node create-test-users.js mixed
  node create-test-users.js all
  node create-test-users.js test-login testuser1@example.com TestPass1231
      `);
            break;
    }

    await mongoose.disconnect();
    process.exit(0);
}

// تشغيل إذا كان الملف مستدعى مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('خطأ:', error.message);
        process.exit(1);
    });
}

export {
    createTestUsers,
    cleanupTestUsers,
    createMixedTestUsers,
    checkTestUsers,
    testUserLogin
};