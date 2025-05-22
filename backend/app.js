const authRoutes = require('./routes/auth_routes');
const userRoutes = require('./routes/user_routes');
const taskRoutes = require('./routes/task_routes');
const reportRoutes = require('./routes/report_routes');
const messageRoutes = require('./routes/message_routes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/messages', messageRoutes); 