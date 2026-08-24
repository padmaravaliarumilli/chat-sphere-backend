const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

const uploadToCloudinary = (
    fileBuffer,
    folder,
    resourceType
) => {
    return new Promise((resolve, reject) => {

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: resourceType
            },
            (error, result) => {

                if (error) {
                    reject(error);
                    return;
                }

                resolve(result);
            }
        );

        streamifier
            .createReadStream(fileBuffer)
            .pipe(uploadStream);
    });
};

module.exports = uploadToCloudinary;