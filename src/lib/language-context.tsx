'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

type Language = 'en' | 'ar';

type TranslationKey =
    | 'loading'
    | 'search_placeholder'
    | 'my_store'
    | 'sell_now'
    | 'profile_menu'
    | 'profile'
    | 'settings'
    | 'discounts'
    | 'favourites'
    | 'technical_support'
    | 'logout'
    | 'language'
    | 'switch_to_arabic'
    | 'switch_to_english'
    | 'notifications'
    | 'mark_all_read'
    | 'no_notifications'
    | 'chat'
    | 'store'
    | 'alerts'
    | 'orders'
    | 'pay'
    | 'home'
    | 'just_now';

const translations: Record<Language, Record<TranslationKey, string>> = {
    en: {
        loading: 'Loading...',
        search_placeholder: 'Search games, accounts, gift cards...',
        my_store: 'My Store',
        sell_now: 'Sell Now',
        profile_menu: 'Profile Menu',
        profile: 'Profile',
        settings: 'Settings',
        discounts: 'Discounts',
        favourites: 'Favourites',
        technical_support: 'Technical Support',
        logout: 'Logout',
        language: 'Language',
        switch_to_arabic: 'Switch to Arabic',
        switch_to_english: 'Switch to English',
        notifications: 'Notifications',
        mark_all_read: 'Mark all read',
        no_notifications: 'No notifications yet',
        chat: 'Chat',
        store: 'Store',
        alerts: 'Alerts',
        orders: 'Orders',
        pay: 'Pay',
        home: 'Home',
        just_now: 'Just now',
    },
    ar: {
        loading: 'جاري التحميل...',
        search_placeholder: 'ابحث عن الألعاب والحسابات وبطاقات الهدايا...',
        my_store: 'متجري',
        sell_now: 'ابدأ البيع',
        profile_menu: 'قائمة الحساب',
        profile: 'الحساب',
        settings: 'الإعدادات',
        discounts: 'الخصومات',
        favourites: 'المفضلة',
        technical_support: 'الدعم الفني',
        logout: 'تسجيل الخروج',
        language: 'اللغة',
        switch_to_arabic: 'التبديل إلى العربية',
        switch_to_english: 'التبديل إلى الإنجليزية',
        notifications: 'الإشعارات',
        mark_all_read: 'تحديد الكل كمقروء',
        no_notifications: 'لا توجد إشعارات حتى الآن',
        chat: 'الدردشة',
        store: 'المتجر',
        alerts: 'التنبيهات',
        orders: 'الطلبات',
        pay: 'الدفع',
        home: 'الرئيسية',
        just_now: 'الآن',
    },
};

const STORAGE_KEY = 'site-language';
const ENGLISH_ONLY_PATHS = new Set([
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
]);

interface LanguageContextValue {
    language: Language;
    isRTL: boolean;
    setLanguage: (language: Language) => void;
    toggleLanguage: () => void;
    t: (key: TranslationKey) => string;
}

const fallbackLanguageContext: LanguageContextValue = {
    language: 'ar',
    isRTL: true,
    setLanguage: () => { },
    toggleLanguage: () => { },
    t: (key) => translations.ar[key] ?? key,
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('ar');
    const pathname = usePathname();

    const normalizedPath = useMemo(() => {
        if (!pathname) return '/';
        return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    }, [pathname]);

    const isEnglishOnlyRoute = ENGLISH_ONLY_PATHS.has(normalizedPath);
    const effectiveLanguage: Language = isEnglishOnlyRoute ? 'en' : language;

    useEffect(() => {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === 'en' || saved === 'ar') {
            setLanguageState(saved);
        }
    }, []);

    useEffect(() => {
        const dir = effectiveLanguage === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = effectiveLanguage;
        document.documentElement.dir = dir;
        window.localStorage.setItem(STORAGE_KEY, language);
    }, [effectiveLanguage, language]);

    const setLanguage = useCallback((nextLanguage: Language) => {
        setLanguageState(nextLanguage);
    }, []);

    const toggleLanguage = useCallback(() => {
        setLanguageState((prev) => (prev === 'en' ? 'ar' : 'en'));
    }, []);

    const t = useCallback((key: TranslationKey) => {
        return translations[effectiveLanguage][key] ?? key;
    }, [effectiveLanguage]);

    const value = useMemo<LanguageContextValue>(() => ({
        language,
        isRTL: effectiveLanguage === 'ar',
        setLanguage,
        toggleLanguage,
        t,
    }), [effectiveLanguage, language, setLanguage, toggleLanguage, t]);

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        return fallbackLanguageContext;
    }
    return context;
}
