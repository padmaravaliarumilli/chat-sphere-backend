// const { libreTranslateConfig, libreTranslateClient } = require('../../config/libretranslate');

// const translateText = async ({ text, source = 'auto', target }) => {
//     if (!text || typeof text !== 'string') {
//         throw new Error('Translation text is required');
//     }

//     if (!target || typeof target !== 'string') {
//         throw new Error('Target language is required');
//     }

//     const payload = {
//         q: text,
//         source,
//         target,
//         format: 'text',
//     };

//     if (libreTranslateConfig.apiKey) {
//         payload.api_key = libreTranslateConfig.apiKey;
//     }

//     try {
//         const response = await libreTranslateClient.post('/translate', payload);

//         console.log('LibreTranslate Response:', response.data);

//         return {
//             translatedText: response.data.translatedText,
//             detectedLanguage: response.data.detectedLanguage || null,
//         };
//     } catch (error) {
//         if (error.response) {
//             console.error('LibreTranslate API Error:', error.response.status, error.response.data);

//             throw new Error(error.response.data?.error || 'LibreTranslate request failed');
//         }

//         if (error.code === 'ECONNABORTED') {
//             throw new Error('LibreTranslate request timed out');
//         }

//         if (error.code === 'ECONNREFUSED') {
//             throw new Error('LibreTranslate service is unavailable');
//         }

//         console.error('Translation Service Error:', error.message);

//         throw new Error('Translation service unavailable');
//     }
// };

// module.exports = {
//     translateText,
// };


const MYMEMORY_URL =
  process.env.MYMEMORY_URL || "https://api.mymemory.translated.net/get";

const TIMEOUT = Number(process.env.TRANSLATION_TIMEOUT || 10000);

async function translateText(text, sourceLanguage, targetLanguage) {
  if (!text || !sourceLanguage || !targetLanguage) {
    throw new Error("Text, source language, and target language are required");
  }

  if (sourceLanguage === targetLanguage) {
    return text;
  }

  const url = new URL(MYMEMORY_URL);

  url.searchParams.set("q", text);
  url.searchParams.set(
    "langpair",
    `${sourceLanguage}|${targetLanguage}`
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();

    const translatedText = data?.responseData?.translatedText;

    if (!translatedText) {
      throw new Error("No translated text returned");
    }

    return translatedText;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  translateText,
};