const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completed_tasks: {
    type: Number,
    default: 0
  },
  pending_tasks: {
    type: Number,
    default: 0
  },
  performance_score: {
    type: Number,
    default: 0
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate performance score before saving
reportSchema.pre('save', function(next) {
  const total = this.completed_tasks + this.pending_tasks;
  if (total > 0) {
    this.performance_score = (this.completed_tasks / total) * 100;
  }
  next();
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report; 