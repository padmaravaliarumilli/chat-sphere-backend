const axios = require('axios');

const libreTranslateConfig = {
    baseURL: process.env.LIBRETRANSLATE_URL,
    apiKey: process.env.LIBRETRANSLATE_API_KEY || '',
    timeout: Number(process.env.LIBRETRANSLATE_TIMEOUT || 10000)
};

const libreTranslateClient = axios.create({
    baseURL: libreTranslateConfig.baseURL,
    timeout: libreTranslateConfig.timeout,
    headers: {
        'Content-Type': 'application/json'
    }
});

module.exports = {
    libreTranslateConfig,
    libreTranslateClient
};