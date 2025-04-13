// js/i18n.js - Internationalization Helper
const SUPPORTED_LANGS = ['en', 'fr', 'ar'];
const DEFAULT_LANG = 'en';
const LANG_STORAGE_KEY = 'learnSphereLang';
const translations = {}; // Cache for loaded translations

/**
 * Loads translation data for a specific language.
 * @param {string} lang - The language code (e.g., 'en', 'fr').
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
async function loadTranslations(lang) {
    if (translations[lang]) {
        return true; // Already loaded
    }
    try {
        const response = await fetch(`locales/${lang}.json?v=${Date.now()}`); // Add cache buster
        if (!response.ok) {
            throw new Error(`Failed to load translations for ${lang}: ${response.statusText}`);
        }
        translations[lang] = await response.json();
        console.log(`[i18n] Translations loaded for: ${lang}`);
        return true;
    } catch (error) {
        console.error(`[i18n] Error loading translations for ${lang}:`, error);
        return false;
    }
}

/**
 * Gets the currently selected language.
 * Falls back to browser language or default language.
 * @returns {string} - The current language code.
 */
function getCurrentLanguage() {
    let lang = localStorage.getItem(LANG_STORAGE_KEY);
    if (lang && SUPPORTED_LANGS.includes(lang)) {
        return lang;
    }
    // Fallback to browser language if supported
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGS.includes(browserLang)) {
         localStorage.setItem(LANG_STORAGE_KEY, browserLang); // Save detected language
        return browserLang;
    }
    // Fallback to default
    localStorage.setItem(LANG_STORAGE_KEY, DEFAULT_LANG);
    return DEFAULT_LANG;
}

/**
 * Sets the application language and reloads translations.
 * @param {string} lang - The language code to set.
 * @returns {Promise<boolean>} - True if language was set and loaded successfully.
 */
async function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) {
        console.warn(`[i18n] Unsupported language: ${lang}. Falling back to ${DEFAULT_LANG}.`);
        lang = DEFAULT_LANG;
    }
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    console.log(`[i18n] Language set to: ${lang}`);
    // Update HTML lang attribute and direction
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    const loadSuccess = await loadTranslations(lang);
    if (!loadSuccess) {
        console.error(`[i18n] Failed to load translations after setting language to ${lang}.`);
        // Optionally fallback to English if loading fails
        // if (lang !== DEFAULT_LANG) {
        //     return await setLanguage(DEFAULT_LANG);
        // }
    }
     return loadSuccess;
}

/**
 * Translates a key into the current language.
 * Supports simple variable replacement using {varName}.
 * @param {string} key - The translation key (from JSON files).
 * @param {object} [variables={}] - An object containing variables for replacement.
 * @param {string} [defaultValue=null] - A default value to return if the key is not found. If null, returns the key itself.
 * @returns {string} - The translated string or a fallback.
 */
function t(key, variables = {}, defaultValue = null) {
    const currentLang = getCurrentLanguage();
    const langTranslations = translations[currentLang];

    if (!langTranslations) {
        console.warn(`[i18n] Translations not loaded for language: ${currentLang}. Cannot translate key: ${key}`);
        return defaultValue !== null ? defaultValue : `{${key}} - LANG_LOAD_ERR`;
    }

    let translation = langTranslations[key];

    if (translation === undefined) {
        console.warn(`[i18n] Missing translation key '${key}' for language '${currentLang}'. Trying fallback '${DEFAULT_LANG}'.`);
        const fallbackTranslation = translations[DEFAULT_LANG]?.[key];
        if (fallbackTranslation !== undefined) {
            translation = fallbackTranslation;
        } else {
             console.error(`[i18n] Key '${key}' not found in '${currentLang}' or fallback '${DEFAULT_LANG}'.`);
            return defaultValue !== null ? defaultValue : `{${key}}`; // Return default or key
        }
    }

    // Replace variables
    return replaceVariables(translation, variables);
}


/**
 * Helper function to replace placeholders like {varName} in a string.
 * @param {string} str - The string containing placeholders.
 * @param {object} variables - Key-value pairs for replacement.
 * @returns {string} - The string with variables replaced.
 */
function replaceVariables(str, variables) {
     if (typeof str !== 'string') return str;
     Object.entries(variables).forEach(([varKey, value]) => {
         const replacementValue = (typeof value === 'string' || typeof value === 'number') ? value : JSON.stringify(value);
         const regex = new RegExp(`\\{${varKey}\\}`, 'g');
         str = str.replace(regex, replacementValue);
     });
     return str;
}


// Initialize i18n on load
async function initializeI18n() {
    const initialLang = getCurrentLanguage();
    console.log(`[i18n] Initializing with lang='${initialLang}', dir='${initialLang === 'ar' ? 'rtl' : 'ltr'}'`);
    document.documentElement.lang = initialLang;
    document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';
    return await loadTranslations(initialLang);
}

export { t, setLanguage, getCurrentLanguage, initializeI18n, SUPPORTED_LANGS };