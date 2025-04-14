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
    // Clear previous translations for this language to force reload if needed? No, rely on cache buster.
    if (translations[lang]) {
        // console.log(`[i18n] Translations already cached for: ${lang}`);
        return true; // Already loaded
    }
    try {
        const response = await fetch(`locales/${lang}.json?v=${Date.now()}`); // Cache buster
        if (!response.ok) {
            throw new Error(`Failed to load translations for ${lang}: ${response.status} ${response.statusText}`);
        }
        translations[lang] = await response.json();
        console.log(`[i18n] Translations loaded and cached for: ${lang}`);
        return true;
    } catch (error) {
        console.error(`[i18n] Error loading translations for ${lang}:`, error);
        translations[lang] = null; // Mark as failed to load
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
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGS.includes(browserLang)) {
        localStorage.setItem(LANG_STORAGE_KEY, browserLang);
        return browserLang;
    }
    localStorage.setItem(LANG_STORAGE_KEY, DEFAULT_LANG);
    return DEFAULT_LANG;
}

/**
 * Sets the application language and reloads translations.
 * Updates HTML attributes.
 * @param {string} lang - The language code to set.
 * @returns {Promise<boolean>} - True if language was set and loaded successfully.
 */
async function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) {
        console.warn(`[i18n] Unsupported language: ${lang}. Falling back to ${DEFAULT_LANG}.`);
        lang = DEFAULT_LANG;
    }
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    console.log(`[i18n] Language set to: ${lang}`);
    return await loadTranslations(lang); // Load/reload translations
}

/**
 * Translates a key into the current language.
 * Supports simple variable replacement using {varName}.
 * Provides a default value fallback, defaulting to {key} if no translation found.
 * @param {string} key - The translation key (from JSON files).
 * @param {object} [variables={}] - An object containing variables for replacement.
 * @param {string} [defaultValue=null] - A default value to return if the key is not found. If null, defaults to returning `{key}`.
 * @returns {string} - The translated string or a fallback.
 */
function t(key, variables = {}, defaultValue = null) {
    const currentLang = getCurrentLanguage();
    const langTranslations = translations[currentLang];
    const defaultLangTranslations = translations[DEFAULT_LANG];
    const fallbackValue = defaultValue !== null ? defaultValue : `{${key}}`; // Use explicit default or {key}

    // 1. Check if translations for the current language are loaded and valid
    if (!langTranslations || typeof langTranslations !== 'object') {
        // console.warn(`[t] Translations not ready for '${currentLang}'. Key: '${key}'. Trying default.`);
        // Try default language immediately if current isn't ready
        if (defaultLangTranslations && typeof defaultLangTranslations === 'object' && defaultLangTranslations[key] !== undefined) {
            return replaceVariables(defaultLangTranslations[key], variables);
        }
        // console.error(`[t] Translations failed to load for '${currentLang}' and default '${DEFAULT_LANG}'. Key: '${key}'`);
        return fallbackValue; // Return default or {key} if primary fails
    }

    // 2. Try finding the key in the current language
    let translation = langTranslations[key];

    // 3. If not found in current, try the default language
    if (translation === undefined && currentLang !== DEFAULT_LANG) {
        // console.warn(`[t] Key '${key}' missing in '${currentLang}'. Trying fallback '${DEFAULT_LANG}'.`);
        if (defaultLangTranslations && typeof defaultLangTranslations === 'object') {
            translation = defaultLangTranslations[key];
        }
    }

    // 4. If still not found after checking current and default, return the fallback
    if (translation === undefined) {
        console.warn(`[t] Key '${key}' not found in '${currentLang}' or fallback '${DEFAULT_LANG}'. Returning fallback.`);
        return fallbackValue;
    }

    // 5. Replace variables and return the result
    return replaceVariables(translation, variables);
}

/**
 * Helper function to replace placeholders like {varName} in a string.
 * @param {string} str - The string containing placeholders.
 * @param {object} variables - Key-value pairs for replacement.
 * @returns {string} - The string with variables replaced.
 */
function replaceVariables(str, variables) {
     if (typeof str !== 'string') return String(str); // Coerce to string just in case
     Object.entries(variables).forEach(([varKey, value]) => {
         const replacementValue = (value !== null && value !== undefined) ? String(value) : '';
         const regex = new RegExp(`\\{${varKey}\\}`, 'g');
         str = str.replace(regex, replacementValue);
     });
     return str;
}

/** Initialize i18n on load */
async function initializeI18n() {
    const initialLang = getCurrentLanguage();
    document.documentElement.lang = initialLang;
    document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';
    console.log(`[i18n] Initializing with lang='${initialLang}'`);
    // Ensure both current and default languages are loaded initially for robust fallbacks
    const currentLangLoaded = await loadTranslations(initialLang);
    if (initialLang !== DEFAULT_LANG) {
        await loadTranslations(DEFAULT_LANG); // Load default lang too
    }
    return currentLangLoaded; // Return success status of the primary language
}

export { t, setLanguage, getCurrentLanguage, initializeI18n, SUPPORTED_LANGS };