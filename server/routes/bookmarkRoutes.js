const express = require('express');
const router = express.Router();

const { createBookmark, getBookmarks, checkBookmark, deleteBookmark } = require('../controllers/bookmarkController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, createBookmark);
router.get('/', authMiddleware, getBookmarks);
router.get("/check/:messageId", authMiddleware, checkBookmark);
router.delete("/:messageId", authMiddleware, deleteBookmark);

module.exports = router;
