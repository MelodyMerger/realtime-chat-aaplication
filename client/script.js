// Constants & State
const username = localStorage.getItem('chat_username');
const room = localStorage.getItem('chat_room');
const isChatPage = window.location.pathname.includes('chat.html');
let typingTimeout;

// Redirect to login if not logged in on chat page
if (isChatPage && (!username || !room)) {
  window.location.href = 'login.html';
}

const socket = io();

// Global Theme Logic
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
};

const toggleTheme = () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
};

document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
initTheme();

// Chat Specific Logic
if (isChatPage) {
  const roomTitle = document.getElementById('roomTitle');
  const roomAvatar = document.getElementById('roomAvatar');
  const messagesContainer = document.getElementById('messages');
  const msgInput = document.getElementById('msgInput');
  const sendBtn = document.getElementById('sendBtn');
  const typingIndicator = document.getElementById('typingIndicator');
  const usersList = document.getElementById('usersList');
  const userCount = document.getElementById('userCount');
  const logoutBtn = document.getElementById('logoutBtn');
  const notificationSound = document.getElementById('notificationSound');

  // Initialization UI
  if (roomTitle) roomTitle.innerText = room;
  
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0] || '').join('').toUpperCase().substring(0, 2);
  };
  
  if (roomAvatar) roomAvatar.innerText = getInitials(room);

  // Socket: Join
  socket.emit('join', { username, room });

  // Message Sending
  const sendMessage = () => {
    const text = msgInput.value.trim();
    if (text === "") return;

    socket.emit('sendMessage', { type: 'text', content: text });
    msgInput.value = "";
    socket.emit('stopTyping');
  };

  sendBtn.addEventListener('click', sendMessage);
  msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Typing Indicator Logic
  msgInput.addEventListener('input', () => {
    socket.emit('typing');
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('stopTyping');
    }, 2000);
  });

  // Receive Message
  socket.on('message', (data) => {
    renderMessage(data);
    if (data.user !== username) {
      notificationSound.play().catch(() => {});
    }
  });

  const renderMessage = (data) => {
    const isMe = data.user === username;
    const div = document.createElement('div');
    div.className = `message ${isMe ? 'msg-sent' : 'msg-received'}`;

    let contentHtml = "";
    if (data.type === "image") {
      contentHtml = `<img src="${data.content}" class="msg-image" style="max-width: 100%; border-radius: 8px; margin-top: 8px;">`;
    } else if (data.type === "file") {
      contentHtml = `<a href="${data.content}" target="_blank" download class="msg-file" style="display: block; margin-top: 8px; color: var(--primary);">📎 ${data.fileName}</a>`;
    } else {
      contentHtml = `<div>${data.content}</div>`;
    }

    div.innerHTML = `
      <div class="msg-info">
        <span style="font-weight: 600;">${isMe ? 'You' : data.user}</span>
      </div>
      ${contentHtml}
      <div class="msg-time">${data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    `;

    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  // Typing Events
  socket.on('typing', (user) => {
    if (user !== username) {
      typingIndicator.innerText = `${user} is typing...`;
    }
  });

  socket.on('stopTyping', () => {
    typingIndicator.innerText = '';
  });

  // Users List
  socket.on('users', (list) => {
    usersList.innerHTML = '';
    userCount.innerText = `${list.length} active`;
    
    list.forEach(u => {
      const item = document.createElement('div');
      item.className = 'user-item';
      item.innerHTML = `
        <div class="avatar">${getInitials(u)}</div>
        <div style="font-weight: 500;">${u === username ? u + ' (You)' : u}</div>
        <div style="margin-left: auto; width: 8px; height: 8px; background: #00ff88; border-radius: 50%;"></div>
      `;
      usersList.appendChild(item);
    });
  });

  socket.on('userJoined', (data) => {
    const div = document.createElement('div');
    div.style.cssText = "text-align: center; color: var(--text-muted); font-size: 0.8rem; margin: 10px 0;";
    div.innerText = `${data.username} joined the chat`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });

  socket.on('userLeft', (data) => {
    const div = document.createElement('div');
    div.style.cssText = "text-align: center; color: var(--text-muted); font-size: 0.8rem; margin: 10px 0;";
    div.innerText = `${data.username} left the chat`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });

  // Logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('chat_username');
    window.location.href = 'login.html';
  });

  // Emoji Picker Refinement
  const emojiBtn = document.getElementById('emojiBtn');
  const emojiPicker = document.getElementById('emojiPicker');
  const emojis = ['😀', '😂', '❤️', '😍', '👍', '🎉', '🔥', '😎', '🤔', '😢', '🙌', '✨', '💯', '🙏', '😊'];

  emojis.forEach(emoji => {
    const span = document.createElement('span');
    span.innerText = emoji;
    span.style.cursor = 'pointer';
    span.style.padding = '5px';
    span.style.fontSize = '1.2rem';
    span.addEventListener('click', () => {
      msgInput.value += emoji;
      emojiPicker.style.display = 'none';
      msgInput.focus();
    });
    emojiPicker.appendChild(span);
  });

  emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.style.display = emojiPicker.style.display === 'grid' ? 'none' : 'grid';
  });

  document.addEventListener('click', () => {
    emojiPicker.style.display = 'none';
  });

  // File Upload Logic
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');

  attachBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        const isImage = file.type.startsWith('image/');
        socket.emit('sendMessage', {
          type: isImage ? 'image' : 'file',
          content: data.url,
          fileName: data.fileName
        });
      }
    } catch (err) {
      console.error('Upload failed', err);
    }
    fileInput.value = ""; 
  });
}