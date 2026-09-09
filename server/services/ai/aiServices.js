const { generateCompletion } = require('./groqService');


// ===============================
// Common AI Response Function
// ===============================
const generateAIResponse = async ({
    systemPrompt,
    userPrompt,
    temperature = 0.3,
    maxTokens = 500
}) => {

    return await generateCompletion({
        messages: [
            {
                role: 'system',
                content: systemPrompt
            },
            {
                role: 'user',
                content: userPrompt
            }
        ],
        temperature,
        maxTokens
    });
};


// ===============================
// Smart Reply
// ===============================
const generateSmartReplies = async (message) => {
    if (!message || typeof message !== 'string') {
        throw new Error('Message is required');
    }

    const fallbackReplies = [
        'Sure, I understand.',
        'Okay, sounds good.',
        'Thanks for letting me know.'
    ];

    const result = await generateAIResponse({
        systemPrompt:
            'You generate short, natural and contextually appropriate chat replies.',

        userPrompt: `
Generate exactly 3 short reply suggestions for this message:

"${message}"

Rules:
- Return exactly 3 replies.
- Keep each reply short.
- Make them conversational and natural.
- Do not number the replies.
- Return only the replies, one per line.
`,

        temperature: 0.7,
        maxTokens: 150
    });

    // AI response validation
    if (!result || typeof result.content !== 'string') {
        console.warn('Smart Reply AI returned an invalid response');

        return {
            replies: fallbackReplies,
            model: result?.model || null,
            usage: result?.usage || null,
            fallback: true
        };
    }

    let replies = result.content
        .split('\n')
        .map(reply =>
            reply
                .replace(/^[-*•\d.)]+\s*/, '')
                .trim()
        )
        .filter(Boolean);

    // Remove duplicate replies
    replies = [...new Set(replies)];

    // Keep maximum of 3 AI replies
    replies = replies.slice(0, 3);

    // Fill missing replies from fallback
    if (replies.length < 3) {
        for (const fallbackReply of fallbackReplies) {
            if (replies.length >= 3) {
                break;
            }

            if (!replies.includes(fallbackReply)) {
                replies.push(fallbackReply);
            }
        }
    }

    // Final safety check
    if (replies.length !== 3) {
        console.warn(
            `Smart Reply returned ${replies.length} replies. Using complete fallback.`
        );

        return {
            replies: fallbackReplies,
            model: result.model || null,
            usage: result.usage || null,
            fallback: true
        };
    }

    return {
        replies,
        model: result.model,
        usage: result.usage,
        fallback: false
    };
};


// ===============================
// Text Summarization
// ===============================
const summarizeText = async (text) => {

    if (!text || typeof text !== 'string') {
        throw new Error('Text is required');
    }

    const result = await generateAIResponse({

        systemPrompt:
            'You are a helpful text summarization assistant. Summarize the provided text clearly and concisely while preserving the important information.',

        userPrompt:
            `Summarize the following text:\n\n${text}`,

        temperature: 0.3,
        maxTokens: 500
    });

    return result;
};

//==============================
//Explain Endpoint
//==============================

// ===============================
// Explain Text
// ===============================
const explainText = async (text) => {
    if (!text || typeof text !== 'string') {
        throw new Error('Text is required');
    }

    const trimmedText = text.trim();

    if (!trimmedText) {
        throw new Error('Text cannot be empty');
    }

    // Fallback message if AI fails
    const fallbackText =
        'Unable to explain this text right now. Please try again later.';

    try {
        const result = await generateAIResponse({
            systemPrompt:
                'You are a helpful explanation assistant. Explain the provided text clearly and simply so that it is easy for the user to understand. Preserve the important meaning and avoid unnecessary complexity. Return only the explanation.',

            userPrompt:
                `Explain the following text in simple and easy-to-understand language:\n\n${trimmedText}`,

            temperature: 0.3,
            maxTokens: 500
        });

        // AI response validation
        if (!result || typeof result.content !== 'string') {
            console.warn('Explain AI returned an invalid response');

            return {
                content: fallbackText,
                model: result?.model || null,
                usage: result?.usage || null,
                fallback: true
            };
        }

        const explanation = result.content.trim();

        // Empty AI response fallback
        if (!explanation) {
            console.warn('Explain AI returned an empty response');

            return {
                content: fallbackText,
                model: result.model || null,
                usage: result.usage || null,
                fallback: true
            };
        }

        return {
            content: explanation,
            model: result.model,
            usage: result.usage,
            fallback: false
        };

    } catch (error) {
        console.error('Explain AI Error:', error.message);

        return {
            content: fallbackText,
            model: null,
            usage: null,
            fallback: true
        };
    }
};


// ===============================
// Rephrase Text
// ===============================
const rephraseText = async (text) => {
    if (!text || typeof text !== 'string') {
        throw new Error('Text is required');
    }

    const trimmedText = text.trim();

    if (!trimmedText) {
        throw new Error('Text cannot be empty');
    }

    // Fallback: return original text if AI fails
    const fallbackText = trimmedText;

    try {
        const result = await generateAIResponse({
            systemPrompt:
                'You are a professional writing assistant. Rephrase the given text while preserving its original meaning. Make the wording clear, natural, and grammatically correct. Return only the rephrased text.',

            userPrompt:
                `Rephrase the following text while preserving its original meaning:\n\n${trimmedText}`,

            temperature: 0.5,
            maxTokens: 300
        });

        // AI response validation
        if (!result || typeof result.content !== 'string') {
            console.warn('Rephrase AI returned an invalid response');

            return {
                content: fallbackText,
                model: result?.model || null,
                usage: result?.usage || null,
                fallback: true
            };
        }

        const rephrasedText = result.content.trim();

        // Empty AI response fallback
        if (!rephrasedText) {
            console.warn('Rephrase AI returned an empty response');

            return {
                content: fallbackText,
                model: result.model || null,
                usage: result.usage || null,
                fallback: true
            };
        }

        return {
            content: rephrasedText,
            model: result.model,
            usage: result.usage,
            fallback: false
        };

    } catch (error) {
        console.error('Rephrase AI Error:', error.message);

        return {
            content: fallbackText,
            model: null,
            usage: null,
            fallback: true
        };
    }
};

// ===============================
// Exports
// ===============================
module.exports = {
    generateAIResponse,
    generateSmartReplies,
    summarizeText,
    explainText,
    rephraseText
    
};