const express = require('express');

const { testGroq, testGroqModels, summarize, explain, smartReply } = require('../controllers/aiController');
const { rephrase } = require('../controllers/rephraseController');

const protect = require('../middleware/authMiddleware');

const { aiRateLimiter } = require('../middleware/aiRateLimiter');

const router = express.Router();

router.get('/test-groq', testGroq);

router.get('/test-groq-models', testGroqModels);

router.post('/summarize', protect, aiRateLimiter, summarize);

router.post('/explain', protect, aiRateLimiter, explain);

router.post('/smart-reply', protect, aiRateLimiter, smartReply);

router.post('/rephrase', protect, aiRateLimiter, rephrase);


module.exports = router;
