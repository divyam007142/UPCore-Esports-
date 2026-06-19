const axios = require('axios');

const GOOGLE_URL = 'https://translate.googleapis.com/translate_a/single';

/**
 * Translate a single text string to English using the unofficial Google API.
 * Returns { translated, detectedLang } — or throws on network/parse error.
 */
async function gtranslate(text) {
  const { data } = await axios.get(GOOGLE_URL, {
    params: { client: 'gtx', sl: 'auto', tl: 'en', dt: 't', q: text },
    timeout: 10_000,
  });

  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Unexpected response shape from translation API');
  }

  const translated    = data[0].map(s => s?.[0] ?? '').join('');
  const detectedLang  = data[2] ?? data[8]?.[0]?.[0] ?? null;

  return { translated, detectedLang };
}

/**
 * Translate an array of texts to English.
 * Uses a single batched request joined by a unique separator to minimise
 * API calls and avoid rate-limiting.
 *
 * Returns an array of result objects, one per input text, in the same order:
 *   { original, translated, wasTranslated }
 *
 * - wasTranslated === true  → text was non-English; both values differ
 * - wasTranslated === false → already English or translation failed silently
 */
async function translateToEnglish(texts) {
  if (!texts || texts.length === 0) return { results: [], anyTranslated: false };

  // Use a UUID-style separator that Google won't translate
  const SEP  = '||SPLIT||';
  const joined = texts.join(`\n${SEP}\n`);

  let segments;
  let detectedLang = 'en';

  try {
    const { translated, detectedLang: lang } = await gtranslate(joined);
    detectedLang = lang ?? 'en';
    segments     = translated.split(SEP).map(s => s.trim());
  } catch (err) {
    // Translation failed — return originals untouched
    console.error('[ticket-translate] API error:', err.message);
    return {
      results:      texts.map(t => ({ original: t, translated: t, wasTranslated: false })),
      anyTranslated: false,
    };
  }

  const isEnglish = detectedLang === 'en';

  const results = texts.map((raw, i) => {
    const translatedText = segments[i] ?? raw;
    const textChanged    = translatedText.trim() !== raw.trim();
    const wasTranslated  = !isEnglish && textChanged;
    return { original: raw, translated: wasTranslated ? translatedText : raw, wasTranslated };
  });

  return { results, anyTranslated: results.some(r => r.wasTranslated) };
}

/**
 * Build a Discord embed field value that shows:
 *   - Just the text if it wasn't translated
 *   - Original + Translated block if it was translated
 */
function fieldValue(result, maxLen = 900) {
  if (!result.wasTranslated) return result.original.slice(0, maxLen);
  return (
    `**Original:**\n${result.original.slice(0, 400)}\n\n` +
    `🌐 **Translated to English:**\n${result.translated.slice(0, 400)}`
  ).slice(0, maxLen);
}

module.exports = { translateToEnglish, fieldValue };
