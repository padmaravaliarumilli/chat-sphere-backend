// const cloudinary = require('../config/cloudinary');

// // =====================================================
// // Upload File To Cloudinary Using Chunked Upload
// // =====================================================

// const uploadToCloudinary = (filePath, folder, resourceType = 'auto') => {
//     return new Promise((resolve, reject) => {
//         const uploadStream = cloudinary.uploader.upload_chunked(
//             filePath,
//             {
//                 folder: folder,
//                 resource_type: resourceType,
//                 chunk_size: 6000000, // 6 MB
//             },
//             (error, result) => {
//                 if (error) {
//                     console.error('Cloudinary upload error:', error);
//                     return reject(error);
//                 }

//                 resolve(result);
//             }
//         );

//         uploadStream.on('error', (error) => {
//             console.error('Cloudinary upload stream error:', error);
//             reject(error);
//         });
//     });
// };

// module.exports = uploadToCloudinary;


const cloudinary = require('../config/cloudinary');

// =====================================================
// Upload File To Cloudinary
// Supports both:
// 1. Buffer - used by mediaController
// 2. File path - used by messageController
// =====================================================

const uploadToCloudinary = (fileData, folder, resourceType = 'auto') => {
    return new Promise((resolve, reject) => {

        // =====================================================
        // BUFFER UPLOAD
        // Used by mediaController
        // =====================================================

        if (Buffer.isBuffer(fileData)) {

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    resource_type: resourceType,
                },
                (error, result) => {

                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        return reject(error);
                    }

                    resolve(result);
                }
            );

            uploadStream.on('error', (error) => {
                console.error('Cloudinary upload stream error:', error);
                reject(error);
            });

            uploadStream.end(fileData);

            return;
        }

        // =====================================================
        // FILE PATH UPLOAD
        // Used by messageController
        // =====================================================

        const uploadStream = cloudinary.uploader.upload_chunked(
            fileData,
            {
                folder: folder,
                resource_type: resourceType,
                chunk_size: 6000000, // 6 MB
            },
            (error, result) => {

                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return reject(error);
                }

                resolve(result);
            }
        );

        uploadStream.on('error', (error) => {
            console.error('Cloudinary upload stream error:', error);
            reject(error);
        });
    });
};

module.exports = uploadToCloudinary;