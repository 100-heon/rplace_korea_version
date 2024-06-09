const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

console.log('MongoDB URI:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // 연결 타임아웃 설정
}).then(() => {
  console.log('MongoDB connected');
  initBoard(); // 보드 초기화 함수 호출
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

const app = express();
app.use(cors());

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'build')));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // 클라이언트 주소를 명시적으로 허용
    methods: ["GET", "POST"],
  },
});

// 보드 스키마 및 모델 정의
const boardSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  color: String,
});

const Board = mongoose.model('Board', boardSchema);

// 초기 보드 상태 설정 함수
const initBoard = async () => {
  const boardData = await Board.find({});
  if (boardData.length === 0) {
    const initialBoard = [];
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 70; x++) {
        initialBoard.push({ x, y, color: "#FFFFFF" });
      }
    }
    await Board.insertMany(initialBoard);
    console.log('Initial board data inserted');
  } else {
    console.log('Board data already exists');
  }
};

io.on('connection', async (socket) => {
  console.log('New client connected');
  
  // 초기 보드 상태를 클라이언트에 전송
  const boardData = await Board.find({});
  const formattedBoard = Array(50).fill().map(() => Array(70).fill("#FFFFFF"));
  boardData.forEach(item => {
    formattedBoard[item.y][item.x] = item.color;
  });
  console.log('Sending initial board:', formattedBoard);
  socket.emit('initial_board', formattedBoard);

  socket.on('change_color', async (data) => {
    const { x, y, color } = data;
    console.log('Received color change:', data);
    try {
      const result = await Board.updateOne({ x, y }, { x, y, color }, { upsert: true });
      console.log(`Color updated at (${x}, ${y}) to ${color}`);
      console.log('Update result:', result);
      
      // 업데이트 후 데이터 확인
      const updatedBoard = await Board.findOne({ x, y });
      console.log('Updated board entry:', updatedBoard);

      io.emit('change_color', { x, y, color });
    } catch (err) {
      console.error('Failed to update color:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// 모든 요청을 React 앱으로 라우팅
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// 포트 설정
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
