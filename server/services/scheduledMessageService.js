const cron = require('node-cron');

const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { getIO, getReceiverSocket } = require('../socket/socket');

const processScheduledMessages = async () => {
    try {
        const now = new Date();

        // Find scheduled messages that are ready to be sent
        const messages = await Message.find({
            isScheduled: true,
            scheduledStatus: 'pending',
            scheduledAt: { $lte: now },
        });

        // No messages to process
        if (messages.length === 0) {
            return;
        }

        console.log(
            `Found ${messages.length} scheduled message(s) to process`
        );

        for (const message of messages) {
            try {
                // Mark as sent first to prevent duplicate processing
                const updatedMessage = await Message.findOneAndUpdate(
                    {
                        _id: message._id,
                        isScheduled: true,
                        scheduledStatus: 'pending',
                    },
                    {
                        $set: {
                            scheduledStatus: 'sent',
                            isDelivered: false,
                        },
                    },
                    {
                        new: true,
                    }
                );

                // Another scheduler cycle/process already handled it
                if (!updatedMessage) {
                    continue;
                }

                // Update conversation's last message
                const conversation = await Conversation.findById(
                    message.conversation
                );

                if (conversation) {
                    conversation.lastMessage = message.text || '';
                    conversation.lastMessageSender = message.sender;
                    conversation.lastMessageTime = new Date();

                    await conversation.save();
                }

                // Get receiver's active Socket.IO connection
                const receiverSocket = getReceiverSocket(
                    message.receiver.toString()
                );

                if (receiverSocket) {
                    // Send scheduled message to receiver
                    getIO()
                        .to(receiverSocket)
                        .emit('newMessage', updatedMessage);

                    // Receiver is online and message was delivered
                    await Message.findByIdAndUpdate(
                        message._id,
                        {
                            $set: {
                                isDelivered: true,
                                isRead: false,
                            },
                        },
                        {
                            new: true,
                        }
                    );

                    console.log(
                        `Scheduled message ${message._id} delivered to receiver ${message.receiver}`
                    );
                } else {
                    // Receiver is offline
                    console.log(
                        `Receiver ${message.receiver} is offline. Message marked as sent.`
                    );
                }
            } catch (messageError) {
                console.error(
                    `Error processing scheduled message ${message._id}:`,
                    messageError
                );
            }
        }
    } catch (error) {
        console.error(
            'Scheduled message processor error:',
            error
        );
    }
};

// Run every minute
const startScheduledMessageService = () => {
    cron.schedule('* * * * *', async () => {
        console.log(
            `Checking scheduled messages at ${new Date().toISOString()}`
        );

        await processScheduledMessages();
    });

    console.log('Scheduled message service started');
};

module.exports = {
    startScheduledMessageService,
    processScheduledMessages,
};