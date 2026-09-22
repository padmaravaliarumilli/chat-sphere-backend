const express = require('express');

const protect = require('../middleware/authMiddleware');
const { createPoll, votePoll, getPoll, closePoll } = require('../controllers/pollController');

const router = express.Router();

// Create a poll
router.post('/', protect, createPoll);

// Vote on a poll
router.post('/:pollId/vote', protect, votePoll);

// Get poll and results
router.get('/:pollId', protect, getPoll);

// Close a poll
router.patch('/:pollId/close', protect, closePoll);


module.exports = router;