const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'build')));

// 클라이언트 IP 주소를 가져오기 위한 미들웨어
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log(`Client IP: ${ip}`);
  next();
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "https://rplace-ssu-adsl.koyeb.app/",
    methods: ["GET", "POST"],
  },
});

const boardSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  color: String,
});
const Board = mongoose.model('Board', boardSchema);

const logSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  color: String,
  ip: String, // IP 주소 필드 추가
  timestamp: { type: Date, default: Date.now }
});
const Log = mongoose.model('Log', logSchema);

const uri = process.env.MONGODB_URI;
console.log('MongoDB URI:', uri);

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  tls: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
}).then(() => {
  console.log('MongoDB connected');
  initBoard();
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

const initBoard = async () => {
  const boardData = await Board.find({});
  const existingSizeX = Math.max(...boardData.map(item => item.x)) + 1;
  const existingSizeY = Math.max(...boardData.map(item => item.y)) + 1;

  if (existingSizeX < 270 || existingSizeY < 100) { 
    const additionalBoard = [];
    for (let y = 0; y < 100; y++) {
      for (let x = existingSizeX; x < 270; x++) {
        additionalBoard.push({ x, y, color: "#FFFFFF" });
      }
    }
    await Board.insertMany(additionalBoard);
    console.log('Additional board data inserted');
  } else {
    console.log('Board data already exists');
  }
};

io.on('connection', async (socket) => {
  const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  console.log(`New client connected from IP: ${ip}`);
  
  const boardData = await Board.find({});
  const formattedBoard = Array(100).fill().map(() => Array(270).fill("#FFFFFF"));
  boardData.forEach(item => {
    formattedBoard[item.y][item.x] = item.color;
  });
  socket.emit('initial_board', formattedBoard);

  socket.on('change_color', async (data) => {
    const { x, y, color } = data;
    console.log('Received color change:', data);
    try {
      await Board.updateOne({ x, y }, { $set: { color } }, { upsert: true });
      
      // 로그에 IP 주소 포함하여 저장
      const logEntry = new Log({ x, y, color, ip });
      await logEntry.save();
      console.log(`Color updated at (${x}, ${y}) to ${color}\nIP: ${ip}`);

      const updatedBoard = await Board.findOne({ x, y });
      console.log('Updated board entry:', updatedBoard);

      io.emit('change_color', { x, y, color });
    } catch (err) {
      console.error('Failed to update color:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected from IP: ${ip}`);
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
