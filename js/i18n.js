// js/i18n.js - Internationalization Helper
const SUPPORTED_LANGS = ['en', 'fr', 'ar'];
const DEFAULT_LANG = 'en';
const LANG_STORAGE_KEY = 'learnSphereLang'; // Keep consistent if name changed elsewhere
const translations = {}; // Cache for loaded translations

async function loadTranslations(lang) {
    if (translations[lang]) return true;
    try {
        const response = await fetch(`locales/${lang}.json?v=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        translations[lang] = await response.json();
        console.log(`[i18n] Translations loaded and cached for: ${lang}`);
        return true;
    } catch (error) {
        console.error(`[i18n] Error loading translations for ${lang}:`, error);
        translations[lang] = null; return false;
    }
}

function getCurrentLanguage() {
    let lang = localStorage.getItem(LANG_STORAGE_KEY);
    if (lang && SUPPORTED_LANGS.includes(lang)) return lang;
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGS.includes(browserLang)) { localStorage.setItem(LANG_STORAGE_KEY, browserLang); return browserLang; }
    localStorage.setItem(LANG_STORAGE_KEY, DEFAULT_LANG); return DEFAULT_LANG;
}

async function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) { console.warn(`[i18n] Unsupported language: ${lang}.`); lang = DEFAULT_LANG; }
    document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem(LANG_STORAGE_KEY, lang); console.log(`[i18n] Language set to: ${lang}`);
    return await loadTranslations(lang);
}

function t(key, variables = {}, defaultValue = null) {
    const currentLang = getCurrentLanguage();
    const langTranslations = translations[currentLang];
    const defaultLangTranslations = translations[DEFAULT_LANG];
    const fallbackValue = defaultValue !== null ? defaultValue : `{${key}}`;

    if (!langTranslations || typeof langTranslations !== 'object') {
        if (defaultLangTranslations && typeof defaultLangTranslations === 'object' && defaultLangTranslations[key] !== undefined) { return replaceVariables(defaultLangTranslations[key], variables); }
        return fallbackValue;
    }
    let translation = langTranslations[key];
    if (translation === undefined && currentLang !== DEFAULT_LANG) {
        if (defaultLangTranslations && typeof defaultLangTranslations === 'object') { translation = defaultLangTranslations[key]; }
    }
    if (translation === undefined) { console.warn(`[t] Key '${key}' not found in '${currentLang}' or fallback '${DEFAULT_LANG}'.`); return fallbackValue; }
    return replaceVariables(translation, variables);
}

function replaceVariables(str, variables) {
     if (typeof str !== 'string') return String(str);
     Object.entries(variables).forEach(([varKey, value]) => {
         const replacementValue = (value !== null && value !== undefined) ? String(value) : '';
         const regex = new RegExp(`\\{${varKey}\\}`, 'g'); str = str.replace(regex, replacementValue);
     });
     return str;
}

async function initializeI18n() {
    const initialLang = getCurrentLanguage();
    document.documentElement.lang = initialLang; document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';
    console.log(`[i18n] Initializing with lang='${initialLang}'`);
    const currentLangLoaded = await loadTranslations(initialLang);
    if (initialLang !== DEFAULT_LANG) { await loadTranslations(DEFAULT_LANG); } // Ensure default is also loaded
    return currentLangLoaded;
}

export { t, setLanguage, getCurrentLanguage, initializeI18n, SUPPORTED_LANGS };