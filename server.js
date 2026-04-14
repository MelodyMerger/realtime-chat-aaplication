const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'client', 'uploads');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
  }
});
const upload = multer({ storage: storage });

// In-memory storage
let users = [];
let messages = [];

// Socket.IO
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (username) => {
    socket.username = username;
    if (!users.includes(username)) {
      users.push(username);
    }
    io.emit('userJoined', { username, users });
  });

  socket.on('sendMessage', (data) => {
    // Determine data structure, backward compatible with plain text
    let payload = data;
    if (typeof data === 'string') {
      payload = { type: 'text', content: data };
    }
    
    const messageData = {
      user: socket.username,
      type: payload.type || 'text',
      content: payload.content || '',
      fileName: payload.fileName || null,
      time: new Date().toLocaleTimeString()
    };
    messages.push(messageData);
    io.emit('message', messageData);
  });

  socket.on('disconnect', () => {
    const username = socket.username;
    users = users.filter(u => u !== username);
    io.emit('userLeft', { username, users });
    console.log('User disconnected:', socket.id);
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'chat.html'));
});

// Upload route
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, fileName: req.file.originalname });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});