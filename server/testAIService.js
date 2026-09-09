require('dotenv').config();

const {
    generateAIResponse
} = require('./services/ai/aiServices');

const testAIService = async () => {

    try {

        console.log('========== AI SERVICE TEST ==========');

        const result = await generateAIResponse({

            systemPrompt:
                'You are a helpful assistant. Answer briefly.',

            userPrompt:
                'Explain what Chat Sphere is in one sentence.',

            temperature: 0.3,

            maxTokens: 100
        });

        console.log('AI Response:', result);

        console.log('=====================================');

    } catch (error) {

        console.error(
            'AI Service Test Failed:',
            error.message
        );
    }
};

testAIService();