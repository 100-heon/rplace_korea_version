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

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "https://rplace-ssu-adsl-81c47514.koyeb.app/",
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
  if (boardData.length === 0) {
    const initialBoard = [];
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 230; x++) {
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
  const boardData = await Board.find({});
  const formattedBoard = Array(100).fill().map(() => Array(230).fill("#FFFFFF"));
  boardData.forEach(item => {
    formattedBoard[item.y][item.x] = item.color;
  });
  socket.emit('initial_board', formattedBoard);

  socket.on('change_color', async (data) => {
    const { x, y, color } = data;
    console.log('Received color change:', data);
    try {
      await Board.updateOne({ x, y }, { $set: { color } }, { upsert: true });
      const logEntry = new Log({ x, y, color });
      await logEntry.save();
      console.log(`Color updated at (${x}, ${y}) to ${color}`);

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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
