const cloudinary = require("../config/cloudinary");
const uploadToCloudinary = require("../utils/cloudinaryUpload");


const uploadMedia = async (req, res) => {

    try {

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: "Please select at least one file to upload"
            });
        }

        const uploadedFiles = [];

        for (const file of req.files) {

            let resourceType = "raw";

            if (file.mimetype.startsWith("image/")) {

                resourceType = "image";

            } else if (file.mimetype.startsWith("video/")) {

                resourceType = "video";

            } else if (file.mimetype.startsWith("audio/")) {

                resourceType = "video";

            } else {

                resourceType = "raw";
            }

            const result = await uploadToCloudinary(
                file.buffer,
                "chat-sphere/media",
                resourceType
            );

            uploadedFiles.push({
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                url: result.secure_url,
                publicId: result.public_id,
                resourceType: result.resource_type,
                format: result.format
            });
        }

        res.status(200).json({
            message: "Media files uploaded successfully",
            count: uploadedFiles.length,
            data: uploadedFiles
        });

    } catch (error) {

        console.error("Media upload error:", error);

        res.status(500).json({
            message: "Media upload failed",
            error: error.message
        });
    }
};


const testCloudinary = async (req, res) => {

    try {

        const result = await cloudinary.api.ping();

        res.status(200).json({
            message: "Cloudinary connected successfully",
            data: result
        });

    } catch (error) {

        console.error("Cloudinary connection error:", error);

        res.status(500).json({
            message: "Cloudinary connection failed",
            error: error.message
        });
    }
};


module.exports = {
    uploadMedia,
    testCloudinary
};