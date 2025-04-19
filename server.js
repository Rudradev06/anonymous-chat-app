const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity; restrict in production
  },
});

// Serve static files
app.use(express.static('public'));

// Generate random username
function generateUsername() {
  const adjectives = ['Cool', 'Mystic', 'Silent', 'Swift', 'Bold'];
  const nouns = ['Panda', 'Fox', 'Wolf', 'Eagle', 'Tiger'];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdj}${randomNoun}${Math.floor(Math.random() * 100)}`;
}

// Socket.IO connection
io.on('connection', (socket) => {
  const username = generateUsername();
  console.log(`${username} connected`);

  // Broadcast user connection
  io.emit('user connected', `${username} joined the chat`);

  // Handle incoming messages
  socket.on('chat message', (msg) => {
    if (msg.trim()) {
      io.emit('chat message', { username, message: msg });
    }
  });

  // Handle typing event
  socket.on('typing', () => {
    socket.broadcast.emit('typing', username);
  });

  // Handle stop typing
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', username);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`${username} disconnected`);
    io.emit('user disconnected', `${username} left the chat`);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});