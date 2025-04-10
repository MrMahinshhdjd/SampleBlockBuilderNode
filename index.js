// index.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for registered players
// Key: socket.id, Value: { username, gcube }
let players = {};

// Global waiting room array for pairing players (multiplayer)
let waitingPlayers = [];

io.on('connection', (socket) => {
  console.log('A user connected: ' + socket.id);

  // Register the user with a username and initial GCube value
  socket.on('registerUser', (data) => {
    players[socket.id] = { username: data.username, gcube: data.gcube || 0 };
    console.log(`Registered user: ${data.username} (${socket.id})`);
  });

  // Update player's score (GCube)
  socket.on('updateScore', (data) => {
    if(players[socket.id]){
      players[socket.id].gcube = data.gcube;
      // Optionally update username if needed:
      players[socket.id].username = data.username || players[socket.id].username;
    }
  });

  // When a player is ready in multiplayer mode
  socket.on('playerReady', (data) => {
    // In case username was not updated via updateScore
    if(players[socket.id]){
      players[socket.id].username = data.username || players[socket.id].username;
    }
    waitingPlayers.push({ id: socket.id, block: data.block });
    const count = waitingPlayers.length;
    waitingPlayers.forEach(player => {
      io.to(player.id).emit('waitingStatus', { count });
    });
    if (waitingPlayers.length >= 2) {
      const playersPair = waitingPlayers.splice(0, 2);
      playersPair.forEach(p => {
        io.to(p.id).emit('startGame', { block: p.block });
      });
    }
  });

  // Leaderboard request: sort players by GCube descending and send list
  socket.on('getLeaderboard', () => {
    // Convert players object into an array
    const leaderboard = Object.values(players)
      .sort((a, b) => b.gcube - a.gcube);
    socket.emit('leaderboardData', leaderboard);
  });

  // Listen for block placements and broadcast to other clients
  socket.on('blockPlaced', (data) => {
    socket.broadcast.emit('blockPlaced', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected: ' + socket.id);
    delete players[socket.id];
    waitingPlayers = waitingPlayers.filter(p => p.id !== socket.id);
    waitingPlayers.forEach(player => {
      io.to(player.id).emit('waitingStatus', { count: waitingPlayers.length });
    });
  });
});

// Use the PORT defined in environment or fallback to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
