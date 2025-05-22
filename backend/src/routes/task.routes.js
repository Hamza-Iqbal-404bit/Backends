const express = require('express');
const router = express.Router();
const Task = require('../models/task.model');
const Report = require('../models/report.model');
const { auth, isAdmin, isTeacherOrAdmin } = require('../middleware/auth.middleware');

// Create a new task (teachers and admins)
router.post('/', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const { title, description, assigned_to, due_date } = req.body;
    
    const task = new Task({
      title,
      description,
      assigned_to,
      due_date,
      created_by: req.user._id
    });

    await task.save();

    // Update student's report
    await Report.findOneAndUpdate(
      { student_id: assigned_to },
      { $inc: { pending_tasks: 1 } },
      { upsert: true }
    );

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all tasks (teachers and admins, filtered by teacher)
router.get('/', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    let query = {};

    // If the user is a teacher, only show tasks created by them
    if (req.user.role === 'teacher') {
      query.created_by = req.user._id;
    }

    const tasks = await Task.find(query)
      .populate('assigned_to', 'name email')
      .populate('created_by', 'name')
      .sort({ created_at: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student's tasks
router.get('/my', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ assigned_to: req.user._id })
      .populate('created_by', 'name')
      .sort({ created_at: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      assigned_to: req.user._id
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const oldStatus = task.status;
    task.status = req.body.status;
    await task.save();

    // Update student's report
    if (oldStatus !== task.status) {
      const update = task.status === 'completed'
        ? { $inc: { completed_tasks: 1, pending_tasks: -1 } }
        : { $inc: { completed_tasks: -1, pending_tasks: 1 } };

      await Report.findOneAndUpdate(
        { student_id: req.user._id },
        update,
        { upsert: true }
      );
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a task (admin only)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Update student's report
    if (task.status === 'pending') {
      await Report.findOneAndUpdate(
        { student_id: task.assigned_to },
        { $inc: { pending_tasks: -1 } }
      );
    } else {
      await Report.findOneAndUpdate(
        { student_id: task.assigned_to },
        { $inc: { completed_tasks: -1 } }
      );
    }

    await task.remove();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 