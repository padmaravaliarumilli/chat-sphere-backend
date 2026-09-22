const multer = require("multer");
const path = require("path");
const fs = require("fs");

// =====================================================
// TEMP UPLOAD DIRECTORY
// =====================================================

const uploadDir = path.join(__dirname, "..", "temp");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// =====================================================
// DISK STORAGE
// =====================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);

        const uniqueName =
            `${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;

        cb(null, uniqueName);
    },
});

// =====================================================
// ALLOWED FILE TYPES
// =====================================================

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
    "text/plain",
];

// =====================================================
// FILE FILTER
// =====================================================

const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(`File type ${file.mimetype} is not allowed`),
            false
        );
    }
};

// =====================================================
// MULTER
// =====================================================

const upload = multer({
    storage: storage,

    fileFilter: fileFilter,

    limits: {
        fileSize: 100 * 1024 * 1024, // 100 MiB
    },
});

module.exports = upload;