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
        console.log(`[i18n] Translations already loaded for: ${lang}`);
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
         console.log(`[i18n] Detected browser language: ${browserLang}`);
         localStorage.setItem(LANG_STORAGE_KEY, browserLang); // Save detected language
        return browserLang;
    }
    // Fallback to default
    console.log(`[i18n] Falling back to default language: ${DEFAULT_LANG}`);
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

    // --- Update HTML attributes ---
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    console.log(`[i18n] Set HTML lang='${lang}', dir='${document.documentElement.dir}'`);

    localStorage.setItem(LANG_STORAGE_KEY, lang);
    console.log(`[i18n] Language set to: ${lang} in localStorage.`);

    // Load translations for the new language
    const loadSuccess = await loadTranslations(lang);
    if (!loadSuccess) {
        console.error(`[i18n] Failed to load translations after setting language to ${lang}.`);
        // Optionally fallback to English if loading fails, but this might be confusing.
        // We'll return false to signal the failure.
    }
     return loadSuccess;
}

/**
 * Translates a key into the current language.
 * Supports simple variable replacement using {varName}.
 * @param {string} key - The translation key (from JSON files).
 * @param {object} [variables={}] - An object containing variables for replacement.
 * @param {string} [defaultText=null] - Optional default text if key not found.
 * @returns {string} - The translated string or the key/default text if not found.
 */
function t(key, variables = {}, defaultText = null) {
    const currentLang = getCurrentLanguage(); // Get current language setting
    const langTranslations = translations[currentLang];

    let translation;

    // Check if translations for the current language are loaded
    if (langTranslations && langTranslations[key] !== undefined) {
        translation = langTranslations[key];
    } else {
        // Try fallback to default language (English)
        if (currentLang !== DEFAULT_LANG && translations[DEFAULT_LANG] && translations[DEFAULT_LANG][key] !== undefined) {
            translation = translations[DEFAULT_LANG][key];
            // console.warn(`[i18n] Missing key '${key}' for '${currentLang}'. Using fallback '${DEFAULT_LANG}'.`);
        } else {
            // Key not found in current or default language
            console.warn(`[i18n] Missing translation key '${key}' for language '${currentLang}' (and fallback '${DEFAULT_LANG}').`);
            // Use provided default text or return the key itself
            translation = defaultText !== null ? defaultText : `{${key}}`;
        }
    }

    // Replace variables if any
    return replaceVariables(translation, variables);
}


/**
 * Helper function to replace placeholders like {varName} in a string.
 * @param {string} str - The string containing placeholders.
 * @param {object} variables - Key-value pairs for replacement.
 * @returns {string} - The string with variables replaced.
 */
function replaceVariables(str, variables) {
     if (typeof str !== 'string') return str; // Should not happen if JSON is correct
     Object.entries(variables).forEach(([varKey, value]) => {
         // Ensure value is a string or number before replacing
         const replacementValue = (typeof value === 'string' || typeof value === 'number') ? value : JSON.stringify(value);
         // Use a regex for global replacement
         const regex = new RegExp(`\\{${varKey}\\}`, 'g');
         str = str.replace(regex, replacementValue);
     });
     // Check for remaining placeholders (indicates missing variables passed to t())
     if (/\{\w+\}/.test(str)) {
        // console.warn(`[i18n] Potential missing variables in translation: "${str}"`);
     }
     return str;
}

// Initialize i18n on load
async function initializeI18n() {
    const initialLang = getCurrentLanguage();
    // Set initial HTML attributes
    document.documentElement.lang = initialLang;
    document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';
    console.log(`[i18n] Initializing with lang='${initialLang}', dir='${document.documentElement.dir}'`);
    // Load translations for the initial language
    return await loadTranslations(initialLang);
}

export { t, setLanguage, getCurrentLanguage, initializeI18n, SUPPORTED_LANGS };