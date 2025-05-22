const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const auth = require('../middleware/auth');

// Get messages between teacher and student
router.get('/', auth, async (req, res) => {
  try {
    const { studentId, teacherId } = req.query;
    
    if (!studentId || !teacherId) {
      return res.status(400).json({ message: 'Student ID and Teacher ID are required' });
    }

    const messages = await Message.find({
      $or: [
        { senderId: teacherId, receiverId: studentId },
        { senderId: studentId, receiverId: teacherId }
      ]
    }).sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send a new message
router.post('/', auth, async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;

    if (!senderId || !receiverId || !content) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const message = new Message({
      senderId,
      receiverId,
      content,
      createdAt: new Date(),
      isRead: false
    });

    const savedMessage = await message.save();
    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark messages as read
router.put('/read', auth, async (req, res) => {
  try {
    const { studentId, teacherId } = req.body;

    if (!studentId || !teacherId) {
      return res.status(400).json({ message: 'Student ID and Teacher ID are required' });
    }

    await Message.updateMany(
      {
        senderId: studentId,
        receiverId: teacherId,
        isRead: false
      },
      {
        $set: { isRead: true }
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get unread message count
router.get('/unread', auth, async (req, res) => {
  try {
    const { teacherId } = req.query;

    if (!teacherId) {
      return res.status(400).json({ message: 'Teacher ID is required' });
    }

    const count = await Message.countDocuments({
      receiverId: teacherId,
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 