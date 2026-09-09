const express = require('express');

const {
    translate
} = require('../controllers/translationController');

const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
    '/',
    protect,
    translate
);

module.exports = router;