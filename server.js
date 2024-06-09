const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors()); // 모든 출처에서의 요청을 허용

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'build')));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // 클라이언트 주소를 명시적으로 허용
    methods: ["GET", "POST"]
  }
});

const board = Array(50).fill().map(() => Array(70).fill("#FFFFFF")); // 50 rows, 70 columns

io.on('connection', (socket) => {
    console.log('New client connected');
    socket.emit('initial_board', board);

    socket.on('change_color', (data) => {
        const { x, y, color } = data;
        board[y][x] = color;
        io.emit('change_color', { x, y, color });
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
