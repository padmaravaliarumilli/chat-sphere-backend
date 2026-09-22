// const express = require('express');

// const { uploadMedia, testCloudinary } = require('../controllers/mediaController');

// const upload = require('../middleware/uploadMiddleware');

// const router = express.Router();

// router.get('/test-cloudinary', testCloudinary);

// // router.post('/upload', upload.array("media", 10), uploadMedia);

// router.post(
//     '/upload',
//     protect,
//     (req, res, next) => {
//         upload.array('media', 10)(req, res, (error) => {
//             if (error) {
//                 if (error.code === 'LIMIT_FILE_SIZE') {
//                     return res.status(400).json({
//                         message: 'File size must not exceed 10 MB',
//                     });
//                 }

//                 if (error.message.includes('File type')) {
//                     return res.status(400).json({
//                         message: error.message,
//                     });
//                 }

//                 return res.status(400).json({
//                     message: 'File upload failed',
//                     error: error.message,
//                 });
//             }

//             next();
//         });
//     },
//     uploadMedia
// );
// module.exports = router;


const express = require('express');

const {
    uploadMedia,
    testCloudinary
} = require('../controllers/mediaController');

const upload = require('../middleware/uploadMiddleware');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

// Test Cloudinary connection
router.get('/test-cloudinary', testCloudinary);

// Upload media
router.post(
    '/upload',
    protect,
    (req, res, next) => {
        upload.array('media', 10)(req, res, (error) => {

            if (error) {

                if (error.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        message: 'File size must not exceed 10 MB'
                    });
                }

                if (error.code === 'LIMIT_UNEXPECTED_FILE') {
                    return res.status(400).json({
                        message: 'Maximum 10 files are allowed'
                    });
                }

                if (error.message?.includes('File type')) {
                    return res.status(400).json({
                        message: error.message
                    });
                }

                return res.status(400).json({
                    message: 'File upload failed',
                    error: error.message
                });
            }

            next();
        });
    },
    uploadMedia
);

module.exports = router;