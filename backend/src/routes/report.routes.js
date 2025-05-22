const express = require('express');
const router = express.Router();
const Report = require('../models/report.model');
const { auth, isAdmin } = require('../middleware/auth.middleware');

// Get all student reports (admin only)
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('student_id', 'name email')
      .sort({ performance_score: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get top performing students (admin only)
router.get('/top', auth, isAdmin, async (req, res) => {
  try {
    const topStudents = await Report.find()
      .populate('student_id', 'name email')
      .sort({ performance_score: -1 })
      .limit(5);
    res.json(topStudents);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student's own report
router.get('/my', auth, async (req, res) => {
  try {
    const report = await Report.findOne({ student_id: req.user._id });
    if (!report) {
      return res.json({
        student_id: req.user._id,
        completed_tasks: 0,
        pending_tasks: 0,
        performance_score: 0
      });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific student's report (admin only)
router.get('/:studentId', auth, isAdmin, async (req, res) => {
  try {
    const report = await Report.findOne({ student_id: req.params.studentId })
      .populate('student_id', 'name email');
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 