require('dotenv').config();

const { translateText } = require('./services/ai/translationService');

async function testTranslation() {
    const originalText = 'Hello, how are you?';

    try {
        const result = await translateText(originalText, 'en', 'fr');

        console.log('========== TRANSLATION TEST ==========');

        console.log('Original:', originalText);

        console.log('Translated:', result.translatedText);

        console.log('======================================');
    } catch (error) {
        console.error('Translation Test Failed:', error.message);
    }
}

testTranslation();
