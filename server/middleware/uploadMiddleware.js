// const multer = require("multer");

// const storage = multer.memoryStorage();

// const upload = multer({
//     storage: storage,
//     limits: {
//         fileSize: 10 * 1024 * 1024
//     }
// });

// module.exports = upload;


const multer = require("multer");

const storage = multer.memoryStorage();

const allowedMimeTypes = [
    // Images
    "image/jpeg",
    "image/png",
    "image/webp",

    // Videos
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/webm",

    // Audio
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/webm",
    "audio/x-m4a",

    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
];

const fileFilter = (req, file, cb) => {

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
};

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 10 * 1024 * 1024
    },

    fileFilter: fileFilter
});

module.exports = upload;

