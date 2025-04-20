const socket = io();
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const chatArea = document.getElementById("chatArea");

// Generate a color based on username
function getUserColor(username) {
  const colors = [
    "#1e3a8a", // Dark blue
    "#2f855a", // Dark green
    "#9b2c2c", // Dark red
    "#6b21a8", // Dark purple
    "#c05621", // Dark orange
    "#1f6b6b", // Dark teal
    "#854d0e", // Dark brown
    "#3c366b", // Deep indigo
    "#22543d", // Forest green
    "#742a2a", // Burgundy
    "#4a148c", // Royal purple
    "#7b341e", // Burnt sienna
    "#234e52", // Slate teal
    "#5c390d", // Chestnut brown
    "#264653", // Dark cyan
    "#6a1b9a", // Deep violet
    "#8b0000", // Dark crimson
    "#0f172a", // Charcoal navy
    "#374151", // Slate gray
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Debounce function to limit typing events
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Append message to chat area
function appendMessage(
  content,
  isSystem = false,
  username = null,
  timestamp = null
) {
  const messageDiv = document.createElement("div");
  messageDiv.className = isSystem ? "system-message" : "message";
  if (!isSystem) {
    const timeString = timestamp
      ? new Date(timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
    const [user, msg] = content.split(": ", 2);
    messageDiv.style.backgroundColor = getUserColor(user);
    messageDiv.innerHTML = `
          <div class="message-content">
            <span class="username">${user}:</span>
            <span class="user-message">${msg}</span>
          </div>
          <div class="timestamp">${timeString}</div>
        `;
  } else {
    messageDiv.textContent = content;
    if (content.includes("is typing...")) {
      messageDiv.classList.add("typing-indicator");
      messageDiv.dataset.username = username;
    }
  }
  chatArea.appendChild(messageDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Remove typing indicator for a specific user
function removeTypingIndicator(username) {
  const indicators = document.querySelectorAll(
    `.typing-indicator[data-username="${username}"]`
  );
  indicators.forEach((indicator) => indicator.remove());
}

// Handle form submission
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (msg) {
    socket.emit("chat message", msg);
    messageInput.value = "";
    socket.emit("stop typing");
  }
});

// Handle typing with debounce
const emitTyping = debounce(() => {
  socket.emit("typing");
}, 500);

messageInput.addEventListener("input", () => {
  emitTyping();
});

// Socket.IO events
socket.on("history", (messages) => {
  messages.forEach((msg) => {
    appendMessage(
      `${msg.username}: ${msg.message}`,
      false,
      null,
      msg.timestamp
    );
  });
});

socket.on("chat message", (data) => {
  appendMessage(
    `${data.username}: ${data.message}`,
    false,
    null,
    data.timestamp
  );
});

socket.on("user connected", (msg) => {
  appendMessage(msg, true);
});

socket.on("user disconnected", (msg) => {
  appendMessage(msg, true);
});

socket.on("typing", (username) => {
  removeTypingIndicator(username);
  appendMessage(`${username} is typing...`, true, username);
  setTimeout(() => {
    removeTypingIndicator(username);
  }, 2000);
});

socket.on("stop typing", (username) => {
  removeTypingIndicator(username);
});
