const MYMEMORY_URL =
    process.env.MYMEMORY_URL ||
    'https://api.mymemory.translated.net/get';

const TIMEOUT = Number(
    process.env.TRANSLATION_TIMEOUT || 10000
);

// Supported MyMemory language codes
const SUPPORTED_LANGUAGES = new Set([
    'en',
    'te',
    'hi',
    'ta',
    'kn',
    'ml',
    'bn',
    'mr',
    'gu',
    'pa',
    'fr',
    'de',
    'es',
    'it',
    'pt',
    'ru',
    'ja',
    'ko',
    'zh',
    'ar',
    'nl',
    'tr',
    'pl',
    'uk',
    'vi',
    'id',
    'th'
]);

const translateText = async (
    text,
    source = 'auto',
    target
) => {

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!text || typeof text !== 'string' || !text.trim()) {
        throw new Error('Translation text is required');
    }

    if (!target || typeof target !== 'string') {
        throw new Error('Target language is required');
    }

    const cleanText = text.trim();
    const cleanSource = source?.toLowerCase() || 'auto';
    const cleanTarget = target.toLowerCase();

    // =====================================================
    // TARGET LANGUAGE VALIDATION
    // =====================================================

    if (!SUPPORTED_LANGUAGES.has(cleanTarget)) {
        throw new Error(
            `Invalid target language: ${cleanTarget}`
        );
    }

    // =====================================================
    // SOURCE LANGUAGE VALIDATION
    // =====================================================

    if (
        cleanSource !== 'auto' &&
        !SUPPORTED_LANGUAGES.has(cleanSource)
    ) {
        throw new Error(
            `Invalid source language: ${cleanSource}`
        );
    }

    // =====================================================
    // SAME LANGUAGE
    // =====================================================

    if (
        cleanSource !== 'auto' &&
        cleanSource === cleanTarget
    ) {
        return {
            translatedText: cleanText
        };
    }

    // =====================================================
    // MYMEMORY
    // =====================================================

    const url = new URL(MYMEMORY_URL);

    url.searchParams.set('q', cleanText);

    /*
     * MyMemory expects:
     *
     * en|fr
     * en|te
     * hi|en
     *
     * "auto" is not treated as a valid MyMemory
     * source language.
     */

    if (cleanSource === 'auto') {
        /*
         * MyMemory does not provide reliable automatic
         * source-language detection through the simple
         * /get endpoint.
         *
         * For now, use English as the default source
         * when the frontend sends "auto".
         *
         * The frontend can later send the actual
         * source language when known.
         */
        url.searchParams.set(
            'langpair',
            `en|${cleanTarget}`
        );
    } else {
        url.searchParams.set(
            'langpair',
            `${cleanSource}|${cleanTarget}`
        );
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, TIMEOUT);

    try {

        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                Accept: 'application/json'
            }
        });

        // =================================================
        // HTTP ERROR
        // =================================================

        if (!response.ok) {

            if (response.status === 429) {
                throw new Error(
                    'Translation service rate limit exceeded'
                );
            }

            if (response.status >= 500) {
                throw new Error(
                    'Translation service is unavailable'
                );
            }

            throw new Error(
                `Translation service request failed with status ${response.status}`
            );
        }

        // =================================================
        // PARSE RESPONSE
        // =================================================

        let data;

        try {
            data = await response.json();
        } catch (error) {
            throw new Error(
                'Invalid response from translation service'
            );
        }

        // =================================================
        // MYMEMORY API ERROR
        // =================================================

        if (
            data?.responseStatus &&
            Number(data.responseStatus) !== 200
        ) {
            throw new Error(
                data?.responseDetails ||
                'Translation service returned an error'
            );
        }

        // =================================================
        // GET TRANSLATED TEXT
        // =================================================

        const translatedText =
            data?.responseData?.translatedText;

        if (
            !translatedText ||
            typeof translatedText !== 'string' ||
            !translatedText.trim()
        ) {
            throw new Error(
                'Translation service returned an empty response'
            );
        }

        return {
            translatedText: translatedText.trim()
        };

    } catch (error) {

        // =================================================
        // TIMEOUT
        // =================================================

        if (error.name === 'AbortError') {
            throw new Error(
                'Translation service timed out'
            );
        }

        // =================================================
        // NETWORK / FETCH ERROR
        // =================================================

        if (
            error instanceof TypeError ||
            error.code === 'ECONNREFUSED'
        ) {
            throw new Error(
                'Translation service is unavailable'
            );
        }

        // Preserve our meaningful errors
        throw error;

    } finally {

        clearTimeout(timeout);
    }
};

module.exports = {
    translateText
};