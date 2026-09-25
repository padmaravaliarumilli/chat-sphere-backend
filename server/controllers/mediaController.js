const fs = require('fs');
const cloudinary = require('../config/cloudinary');
const uploadToCloudinary = require('../utils/cloudinaryUpload');

const uploadMedia = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: 'Please select at least one file to upload',
            });
        }

        const uploadedFiles = [];

        for (const file of req.files) {
            console.log('Uploaded file:', {
                name: file.originalname,
                size: file.size,
                sizeKB: (file.size / 1024).toFixed(2),
                path: file.path,
            });
            let resourceType = 'raw';

            if (file.mimetype.startsWith('image/')) {
                resourceType = 'image';
            } else if (file.mimetype.startsWith('video/')) {
                resourceType = 'video';
            } else if (file.mimetype.startsWith('audio/')) {
                resourceType = 'video';
            } else {
                resourceType = 'raw';
            }

            try {
                const result = await uploadToCloudinary(
                    file.path,
                    'chat-sphere/media',
                    resourceType
                );

                uploadedFiles.push({
                    originalName: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    url: result.secure_url,
                    profilePic: result.secure_url,
                    publicId: result.public_id,
                    resourceType: result.resource_type,
                    format: result.format,
                });
            } finally {
                // Delete temporary file after Cloudinary upload
                if (file.path && fs.existsSync(file.path)) {
                    try {
                        fs.unlinkSync(file.path);
                    } catch (deleteError) {
                        console.error('Failed to delete temporary file:', deleteError.message);
                    }
                }
            }
        }

        res.status(200).json({
            message: 'Media files uploaded successfully',
            count: uploadedFiles.length,
            data: uploadedFiles,
        });
    } catch (error) {
        console.error('Media upload error:', error);

        res.status(500).json({
            message: 'Media upload failed',
            error: error.message,
        });
    }
};

const testCloudinary = async (req, res) => {
    try {
        const result = await cloudinary.api.ping();

        res.status(200).json({
            message: 'Cloudinary connected successfully',
            data: result,
        });
    } catch (error) {
        console.error('Cloudinary connection error:', error);

        res.status(500).json({
            message: 'Cloudinary connection failed',
            error: error.message,
        });
    }
};

module.exports = {
    uploadMedia,
    testCloudinary,
};
