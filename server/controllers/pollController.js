const mongoose = require('mongoose');
const Poll = require('../models/poll');
const Conversation = require('../models/Conversation');

const createPoll = async (req, res) => {
    try {
        const { conversationId, question, options, expiresAt } = req.body;

        // 1. Validate conversation ID
        if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid conversationId is required',
            });
        }

        // 2. Validate question
        if (!question || typeof question !== 'string' || !question.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Poll question is required',
            });
        }

        const trimmedQuestion = question.trim();

        if (trimmedQuestion.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Poll question cannot exceed 500 characters',
            });
        }

        // 3. Validate options
        if (!Array.isArray(options)) {
            return res.status(400).json({
                success: false,
                message: 'Options must be an array',
            });
        }

        if (options.length < 2 || options.length > 10) {
            return res.status(400).json({
                success: false,
                message: 'Poll must have between 2 and 10 options',
            });
        }

        // 4. Clean and validate options
        const cleanedOptions = options.map((option) => {
            if (typeof option !== 'string') {
                return '';
            }

            return option.trim();
        });

        if (cleanedOptions.some((option) => !option)) {
            return res.status(400).json({
                success: false,
                message: 'Poll options cannot be empty',
            });
        }

        if (cleanedOptions.some((option) => option.length > 200)) {
            return res.status(400).json({
                success: false,
                message: 'Each poll option cannot exceed 200 characters',
            });
        }

        // 5. Prevent duplicate options
        const normalizedOptions = cleanedOptions.map((option) =>
            option.toLowerCase()
        );

        const uniqueOptions = new Set(normalizedOptions);

        if (uniqueOptions.size !== normalizedOptions.length) {
            return res.status(400).json({
                success: false,
                message: 'Poll options must be unique',
            });
        }

        // 6. Find conversation
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
        }

        // 7. Check whether user belongs to conversation
        const isParticipant = conversation.participants.some(
            (participantId) =>
                participantId.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this conversation',
            });
        }

        // 8. Validate expiration date
        let pollExpiresAt = null;

        if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
            pollExpiresAt = new Date(expiresAt);

            if (Number.isNaN(pollExpiresAt.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expiresAt date',
                });
            }

            if (pollExpiresAt <= new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'expiresAt must be a future date',
                });
            }
        }

        // 9. Create poll
        const poll = await Poll.create({
            conversation: conversationId,
            createdBy: req.user._id,
            question: trimmedQuestion,
            options: cleanedOptions.map((option) => ({
                text: option,
                votes: 0,
            })),
            expiresAt: pollExpiresAt,
        });

        // 10. Return created poll
        return res.status(201).json({
            success: true,
            message: 'Poll created successfully',
            data: {
                poll,
            },
        });
    } catch (error) {
        console.error('Create poll error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to create poll',
        });
    }
};


const votePoll = async (req, res) => {
    try {
        const { pollId } = req.params;
        const { optionId } = req.body;

        // 1. Validate poll ID
        if (!pollId || !mongoose.Types.ObjectId.isValid(pollId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid pollId is required',
            });
        }

        // 2. Validate option ID
        if (!optionId || !mongoose.Types.ObjectId.isValid(optionId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid optionId is required',
            });
        }

        // 3. Find poll
        const poll = await Poll.findById(pollId);

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'Poll not found',
            });
        }

        // 4. Check conversation
        const conversation = await Conversation.findById(
            poll.conversation
        );

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
        }

        // 5. Check whether user belongs to conversation
        const isParticipant = conversation.participants.some(
            (participantId) =>
                participantId.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this conversation',
            });
        }

        // 6. Check if poll is already closed
        if (poll.isClosed) {
            return res.status(400).json({
                success: false,
                message: 'This poll is already closed',
            });
        }

        // 7. Check if poll has expired
        if (poll.expiresAt && poll.expiresAt <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'This poll has expired',
            });
        }

        // 8. Check whether option belongs to this poll
        const selectedOption = poll.options.id(optionId);

        if (!selectedOption) {
            return res.status(400).json({
                success: false,
                message: 'Invalid option for this poll',
            });
        }

        // 9. Check whether user has already voted
        const existingVote = poll.voters.find(
            (voter) =>
                voter.user.toString() === req.user._id.toString()
        );

        if (existingVote) {
            return res.status(400).json({
                success: false,
                message: 'You have already voted in this poll',
            });
        }

        // 10. Increment selected option vote count
        selectedOption.votes += 1;

        // 11. Record user's vote
        poll.voters.push({
            user: req.user._id,
            option: selectedOption._id,
        });

        // 12. Save poll
        await poll.save();

        return res.status(200).json({
            success: true,
            message: 'Vote submitted successfully',
            data: {
                poll,
            },
        });
    } catch (error) {
        console.error('Vote poll error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to submit vote',
        });
    }
};

const getPoll = async (req, res) => {
    try {
        const { pollId } = req.params;

        // 1. Validate poll ID
        if (!pollId || !mongoose.Types.ObjectId.isValid(pollId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid pollId is required',
            });
        }

        // 2. Find poll
        const poll = await Poll.findById(pollId);

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'Poll not found',
            });
        }

        // 3. Find conversation
        const conversation = await Conversation.findById(
            poll.conversation
        );

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
        }

        // 4. Check whether user belongs to conversation
        const isParticipant = conversation.participants.some(
            (participantId) =>
                participantId.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'You are not a participant in this conversation',
            });
        }

        // 5. Check expiration
        const isExpired =
            poll.expiresAt && poll.expiresAt <= new Date();

        // 6. Calculate total votes
        const totalVotes = poll.options.reduce(
            (total, option) => total + option.votes,
            0
        );

        // 7. Check current user's vote
        const userVote = poll.voters.find(
            (voter) =>
                voter.user.toString() === req.user._id.toString()
        );

        return res.status(200).json({
            success: true,
            message: 'Poll retrieved successfully',
            data: {
                poll,
                results: {
                    totalVotes,
                    isExpired: Boolean(isExpired),
                    userVoted: Boolean(userVote),
                    selectedOption: userVote
                        ? userVote.option
                        : null,
                },
            },
        });
    } catch (error) {
        console.error('Get poll error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve poll',
        });
    }
};

const closePoll = async (req, res) => {
    try {
        const { pollId } = req.params;

        // 1. Validate poll ID
        if (!pollId || !mongoose.Types.ObjectId.isValid(pollId)) {
            return res.status(400).json({
                success: false,
                message: 'Valid pollId is required',
            });
        }

        // 2. Find poll
        const poll = await Poll.findById(pollId);

        if (!poll) {
            return res.status(404).json({
                success: false,
                message: 'Poll not found',
            });
        }

        // 3. Check whether current user created the poll
        if (poll.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only the poll creator can close this poll',
            });
        }

        // 4. Check if already closed
        if (poll.isClosed) {
            return res.status(400).json({
                success: false,
                message: 'Poll is already closed',
            });
        }

        // 5. Close poll
        poll.isClosed = true;

        await poll.save();

        return res.status(200).json({
            success: true,
            message: 'Poll closed successfully',
            data: {
                poll,
            },
        });
    } catch (error) {
        console.error('Close poll error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to close poll',
        });
    }
};

module.exports = {
    createPoll,
    votePoll,
    getPoll,
    closePoll,
};