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

// In-memory storage for room-based users
let roomData = {}; // { roomName: [user1, user2] }

// Socket.IO
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (data) => {
    const { username, room } = data;
    socket.username = username;
    socket.room = room;
    
    socket.join(room);

    if (!roomData[room]) {
      roomData[room] = [];
    }
    
    if (!roomData[room].includes(username)) {
      roomData[room].push(username);
    }

    io.to(room).emit('userJoined', { username, users: roomData[room] });
    io.to(room).emit('users', roomData[room]);
  });

  socket.on('sendMessage', (data) => {
    let payload = data;
    if (typeof data === 'string') {
      payload = { type: 'text', content: data };
    }
    
    const messageData = {
      user: socket.username,
      type: payload.type || 'text',
      content: payload.content || '',
      fileName: payload.fileName || null,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    io.to(socket.room).emit('message', messageData);
  });

  socket.on('typing', () => {
    socket.to(socket.room).emit('typing', socket.username);
  });

  socket.on('stopTyping', () => {
    socket.to(socket.room).emit('stopTyping');
  });

  socket.on('disconnect', () => {
    const username = socket.username;
    const room = socket.room;
    
    if (room && roomData[room]) {
      roomData[room] = roomData[room].filter(u => u !== username);
      io.to(room).emit('userLeft', { username, users: roomData[room] });
      io.to(room).emit('users', roomData[room]);
    }
    console.log('User disconnected:', socket.id);
  });
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'login.html'));
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