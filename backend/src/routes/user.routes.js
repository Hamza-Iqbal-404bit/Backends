const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const User = require('../models/user.model');
const { auth, isAdmin, isTeacherOrAdmin } = require('../middleware/auth.middleware');

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  }
});

// Get all students (teachers and admins)
router.get('/students', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    let query = { role: 'student' };
    
    // If the user is a teacher, only show their students
    if (req.user.role === 'teacher') {
      query.teacher = req.user._id;
    }
    
    const students = await User.find(query)
      .select('-password')
      .sort({ created_at: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a single student (teachers and admins)
router.post('/students', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log('Creating new student:', { name, email });
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Email already exists:', email);
      return res.status(400).json({ message: 'Email already exists' });
    }

    const student = new User({
      name,
      email,
      password,
      role: 'student',
      teacher: req.user.role === 'teacher' ? req.user._id : undefined
    });

    console.log('Saving new student...');
    await student.save();
    console.log('Student saved successfully:', { 
      id: student._id, 
      email: student.email,
      teacher: student.teacher 
    });
    
    res.status(201).json({ 
      message: 'Student added successfully',
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        role: student.role,
        teacher: student.teacher
      }
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload students via Excel (teachers and admins)
router.post('/students/upload', auth, isTeacherOrAdmin, upload.single('file'), async (req, res) => {
  console.log('Received Excel upload request.');
  try {
    if (!req.file) {
      console.log('No file uploaded.');
      return res.status(400).json({ message: 'Please upload an Excel file' });
    }

    console.log('File received:', req.file.originalname);
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    console.log('Processing worksheet:', worksheetName);
    const data = xlsx.utils.sheet_to_json(worksheet);
    console.log('Extracted data from Excel:', data);

    if (data.length === 0) {
      console.log('No data found in the Excel file.');
      return res.status(400).json({ message: 'No data found in the Excel file' });
    }

    let addedCount = 0;
    let skippedCount = 0;
    const studentsToInsert = [];

    for (const row of data) {
      const studentData = {
        name: row.Name,
        email: row.Email,
        password: row.Password || Math.random().toString(36).slice(-8),
        role: 'student',
        teacher: req.user.role === 'teacher' ? req.user._id : undefined
      };

      // Basic validation: Check if name and email are present
      if (!studentData.name || !studentData.email) {
        console.log(`Skipping row due to missing name or email: ${JSON.stringify(row)}`);
        skippedCount++;
        continue; // Skip this row if name or email is missing
      }

      // Check if student with this email already exists
      const existingUser = await User.findOne({ email: studentData.email });

      if (existingUser) {
        console.log(`Skipping student with existing email: ${studentData.email}`);
        skippedCount++;
      } else {
        studentsToInsert.push(studentData);
      }
    }

    if (studentsToInsert.length > 0) {
      console.log('Inserting new students into database...', studentsToInsert.length);
      // Use insertMany for the students that don't exist to be more efficient
      await User.insertMany(studentsToInsert);
      addedCount = studentsToInsert.length;
      console.log('New students inserted successfully.');
    }

    const totalProcessed = data.length;
    const message = `Processed ${totalProcessed} rows. Added ${addedCount} new students, skipped ${skippedCount} existing or invalid rows.`;
    console.log(message);

    res.status(200).json({ message, addedCount, skippedCount, totalProcessed });

  } catch (error) {
    console.error('Error uploading students via Excel:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a student (teachers and admins)
router.delete('/students/:id', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    console.log('Attempting to delete student with ID:', studentId);

    const student = await User.findOne({ _id: studentId, role: 'student' });
    console.log('Found student for deletion:', student ? { id: student._id, email: student.email } : 'Not found');

    if (!student) {
      console.log('Student not found for deletion:', studentId);
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log('Deleting student using deleteOne...', studentId);
    await student.deleteOne();
    console.log('Student deleted successfully:', studentId);

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 