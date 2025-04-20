require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const { generateUsername } = require("./username");
const sanitizeHtml = require("sanitize-html");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(express.static("public"));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

io.on("connection", async (socket) => {
  const username = generateUsername();
  console.log(`${username} connected`);

  try {
    const messages = await Message.find().sort({ timestamp: -1 }).limit(250);
    socket.emit("history", messages.reverse());
    console.log(`Sent ${messages.length} messages to ${username}`);

    // Now that history is sent, broadcast the join message to everyone
    io.emit("user connected", `${username} joined the chat`);
  } catch (err) {
    console.error("Error fetching message history:", err.message);
  }

  socket.on("chat message", async (msg) => {
    if (msg.trim()) {
      const cleanMsg = sanitizeHtml(msg, {
        allowedTags: [],
        allowedAttributes: {},
      });
      const message = { username, message: cleanMsg, timestamp: new Date() };
      try {
        await Message.create(message);
        io.emit("chat message", message);
        console.log(`Message saved from ${username}: ${cleanMsg}`);
      } catch (err) {
        console.error(`Error saving message from ${username}:`, err.message);
      }
    }
  });

  socket.on("typing", () => {
    socket.broadcast.emit("typing", username);
  });

  socket.on("stop typing", () => {
    socket.broadcast.emit("stop typing", username);
  });

  socket.on("disconnect", () => {
    io.emit("user disconnected", `${username} left the chat`);
    console.log(`${username} disconnected`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
