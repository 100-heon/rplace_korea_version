const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config(); // .env 파일을 로드합니다.

const app = express();
app.use(cors());

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'build')));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "https://rplace-ssu-adsl-84537383.koyeb.app", // 클라이언트 주소를 Koyeb의 주소로 업데이트
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

// MongoDB 연결 설정 (환경 변수를 사용)
const uri = process.env.MONGODB_URI;
console.log('MongoDB URI:', uri); // 이 줄을 추가하여 URI가 제대로 로드되는지 확인합니다.

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // 연결 타임아웃 설정
  tls: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
}).then(() => {
  console.log('MongoDB connected');
  initBoard(); // MongoDB 연결 후 보드 초기화 함수 호출
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

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
  const formattedBoard = Array(50).fill().map(() => Array(115).fill("#FFFFFF"));
  boardData.forEach(item => {
    formattedBoard[item.y][item.x] = item.color;
  });
  //console.log('Sending initial board:', formattedBoard);
  socket.emit('initial_board', formattedBoard);

  socket.on('change_color', async (data) => {
    const { x, y, color } = data;
    console.log('Received color change:', data);
    try {
      await Board.updateOne({ x, y }, { x, y, color }, { upsert: true });
      console.log(`Color updated at (${x}, ${y}) to ${color}`);
      
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