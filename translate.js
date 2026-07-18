// translate.js - Google Translate API
const { translate } = require('@vitalets/google-translate-api');

// Cache for translations to avoid repeated API calls
const translationCache = new Map();

async function translateText(text, targetLang) {
  try {
    // If target language is English, return original
    if (targetLang === 'en' || !targetLang) return text;
    
    // Check cache
    const cacheKey = `${text}_${targetLang}`;
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }
    
    // Translate
    const result = await translate(text, { to: targetLang });
    const translated = result.text;
    
    // Cache the result
    translationCache.set(cacheKey, translated);
    
    return translated;
  } catch (error) {
    console.error('Translation error:', error.message);
    return text; // Return original text if translation fails
  }
}

// Clear cache every hour to avoid memory issues
setInterval(() => {
  translationCache.clear();
}, 3600000);

module.exports = { translateText };