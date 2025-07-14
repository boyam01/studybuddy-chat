const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());

// 連 MongoDB（本地 or cloud）
mongoose.connect('mongodb://127.0.0.1:27017/chat_demo', { useNewUrlParser: true, useUnifiedTopology: true });

const MessageSchema = new mongoose.Schema({
  senderId: String,
  roomId: String,
  content: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// API：歷史訊息
app.get('/api/chat/history', async (req, res) => {
  const { roomId } = req.query;
  const messages = await Message.find({ roomId }).sort({ timestamp: 1 }).limit(50);
  res.json(messages);
});

// API：存訊息
app.post('/api/chat/message', async (req, res) => {
  const { senderId, roomId, content } = req.body;
  const msg = new Message({ senderId, roomId, content });
  await msg.save();
  res.json(msg);
});

// ==== 學伴自動配對邏輯 ====
let waitingUser = null; // 等待中的用戶（只允許一個在排隊）

io.on('connection', (socket) => {
  console.log('有新連線:', socket.id);

  // 新增 findBuddy 配對功能
  socket.on('findBuddy', (userId) => {
    if (!waitingUser) {
      // 沒人在排隊，這個人成為等待者
      waitingUser = { socket, userId };
      socket.emit('waitingBuddy'); // 通知前端進入等候
      console.log(`${userId} 進入配對池，等待學伴...`);
    } else {
      // 已有人在等待，直接配對
      const roomId = 'room_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      socket.join(roomId);
      waitingUser.socket.join(roomId);

      // 通知雙方配對成功
      socket.emit('buddyFound', { roomId, buddy: waitingUser.userId });
      waitingUser.socket.emit('buddyFound', { roomId, buddy: userId });

      console.log(`配對成功：${waitingUser.userId} <-> ${userId}，房號 ${roomId}`);

      waitingUser = null; // 清空配對池
    }
  });

  // 加入房間
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} 加入房間: ${roomId}`);
  });

  // 處理發送訊息
  socket.on('sendMessage', async (data) => {
    const { senderId, roomId, content } = data;
    const msg = new Message({ senderId, roomId, content });
    await msg.save();
    io.to(roomId).emit('newMessage', msg);
  });

  socket.on('disconnect', () => {
    console.log('連線斷開:', socket.id);
    // 進階寫法可判斷斷線時是否清空 waitingUser（這版沒考慮連線突然消失）
  });
});

server.listen(4000, () => {
  console.log('後端伺服器跑在 http://localhost:4000');
});
