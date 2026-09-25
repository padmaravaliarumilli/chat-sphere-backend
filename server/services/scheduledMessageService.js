const cron = require('node-cron');

const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { getIO, getReceiverSocket } = require('../socket/socket');

// =====================================================
// PROCESS SCHEDULED MESSAGES
// =====================================================

const processScheduledMessages = async () => {
    try {
        const now = new Date();

        // =================================================
        // FIND READY SCHEDULED MESSAGES
        // =================================================

        const messages = await Message.find({
            isScheduled: true,
            scheduledStatus: 'pending',
            scheduledAt: {
                $ne: null,
                $lte: now,
            },
        });

        if (messages.length === 0) {
            return;
        }

        console.log(`Found ${messages.length} scheduled message(s) to process`);

        // =================================================
        // PROCESS EACH MESSAGE INDEPENDENTLY
        // =================================================

        for (const message of messages) {
            try {
                // =================================================
                // BASIC DATE SAFETY CHECK
                // =================================================

                if (!message.scheduledAt || isNaN(new Date(message.scheduledAt).getTime())) {
                    console.error(
                        `Scheduled message ${message._id} has an invalid scheduledAt value`
                    );

                    continue;
                }

                // =================================================
                // ATOMIC CLAIM
                // =================================================
                //
                // Only ONE scheduler process can change this
                // particular message from pending -> sent.
                //
                // This prevents duplicate sending when:
                // - multiple scheduler instances run
                // - a previous cron cycle overlaps
                // - the service is restarted
                //
                const claimedMessage = await Message.findOneAndUpdate(
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

                // Another scheduler already claimed it
                if (!claimedMessage) {
                    console.log(`Scheduled message ${message._id} was already processed`);

                    continue;
                }

                // =================================================
                // VALIDATE SENDER
                // =================================================

                const sender = await User.findById(claimedMessage.sender);

                if (!sender) {
                    console.error(
                        `Sender ${claimedMessage.sender} no longer exists for scheduled message ${claimedMessage._id}`
                    );

                    continue;
                }

                // =================================================
                // VALIDATE RECEIVER
                // =================================================

                if (!claimedMessage.receiver) {
                    console.error(`Scheduled message ${claimedMessage._id} has no receiver`);

                    continue;
                }

                const receiver = await User.findById(claimedMessage.receiver);

                if (!receiver) {
                    console.error(
                        `Receiver ${claimedMessage.receiver} no longer exists for scheduled message ${claimedMessage._id}`
                    );

                    continue;
                }

                // =================================================
                // VALIDATE CONVERSATION
                // =================================================

                const conversation = await Conversation.findById(claimedMessage.conversation);

                if (!conversation) {
                    console.error(
                        `Conversation ${claimedMessage.conversation} no longer exists for scheduled message ${claimedMessage._id}`
                    );

                    continue;
                }

                // =================================================
                // VALIDATE RECEIVER IS STILL IN CONVERSATION
                // =================================================

                const receiverIsParticipant = conversation.participants.some(
                    (participant) => participant.toString() === claimedMessage.receiver.toString()
                );

                if (!receiverIsParticipant) {
                    console.error(
                        `Receiver ${claimedMessage.receiver} is no longer a participant in conversation ${conversation._id}`
                    );

                    continue;
                }

                // =================================================
                // UPDATE CONVERSATION
                // =================================================

                conversation.lastMessage = claimedMessage.text || '';

                conversation.lastMessageSender = claimedMessage.sender;

                conversation.lastMessageTime = new Date();

                await conversation.save();

                // =================================================
                // GET RECEIVER SOCKET
                // =================================================

                const receiverSocket = getReceiverSocket(claimedMessage.receiver.toString());

                // =================================================
                // RECEIVER ONLINE
                // =================================================

                if (receiverSocket) {
                    const io = getIO();

                    // Send the scheduled message
                    io.to(receiverSocket).emit('newMessage', claimedMessage);

                    // Update delivery state
                    await Message.findByIdAndUpdate(claimedMessage._id, {
                        $set: {
                            isDelivered: true,
                            isRead: false,
                        },
                    });

                    console.log(
                        `Scheduled message ${claimedMessage._id} delivered to receiver ${claimedMessage.receiver}`
                    );
                }

                // =================================================
                // RECEIVER OFFLINE
                // =================================================
                else {
                    console.log(
                        `Receiver ${claimedMessage.receiver} is offline. Scheduled message ${claimedMessage._id} marked as sent.`
                    );
                }
            } catch (messageError) {
                // =================================================
                // ONE MESSAGE FAILURE MUST NOT STOP OTHER MESSAGES
                // =================================================

                console.error(`Error processing scheduled message ${message._id}:`, messageError);
            }
        }
    } catch (error) {
        // =====================================================
        // SCHEDULER-LEVEL ERROR
        // =====================================================

        console.error('Scheduled message processor error:', error);
    }
};

// =====================================================
// START SCHEDULED MESSAGE SERVICE
// =====================================================

const startScheduledMessageService = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        console.log(`Checking scheduled messages at ${new Date().toISOString()}`);

        try {
            await processScheduledMessages();
        } catch (error) {
            // Extra protection so a cron execution
            // can never crash the scheduler.
            console.error('Scheduled message cron execution error:', error);
        }
    });

    console.log('Scheduled message service started');

    // =================================================
    // IMPORTANT FOR PROCESS RESTART
    // =================================================
    //
    // Run once immediately when the server starts.
    //
    // This means if the server was offline when a message
    // was supposed to be sent, we don't have to wait for
    // the next cron minute.
    //
    processScheduledMessages().catch((error) => {
        console.error('Initial scheduled message processing error:', error);
    });
};

module.exports = {
    startScheduledMessageService,
    processScheduledMessages,
};
