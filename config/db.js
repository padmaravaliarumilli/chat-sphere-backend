const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log('MongoDB Connected Successfully');

        // =====================================================
        // ENABLE CHANGE STREAM PRE-IMAGES
        // =====================================================
        // Required by the self-destruct message watcher.
        //
        // MongoDB needs the document's previous version when
        // a TTL index deletes the message.
        // =====================================================

        const db = mongoose.connection.db;

        const collections = await db
            .listCollections({ name: 'messages' })
            .toArray();

        if (collections.length === 0) {
            await db.createCollection('messages', {
                changeStreamPreAndPostImages: {
                    enabled: true,
                },
            });

            console.log(
                'Messages collection created with change stream pre-images enabled'
            );
        } else {
            await db.command({
                collMod: 'messages',
                changeStreamPreAndPostImages: {
                    enabled: true,
                },
            });

            console.log(
                'MongoDB change stream pre-images enabled for messages collection'
            );
        }
    } catch (error) {
        console.log('Database Connection Error:');
        console.log(error.message);
    }
};

module.exports = connectDB;