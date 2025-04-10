// index.js
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Global waiting room
let waitingPlayers = [];

// Socket.IO logic
io.on('connection', (socket) => {
  console.log('A user connected: ' + socket.id);

  // Handle player readiness for multiplayer
  socket.on('playerReady', (data) => {
    // Add player info (socket id and chosen block) to waiting room
    waitingPlayers.push({ id: socket.id, block: data.block });
    // Update waiting status for all waiting players
    const waitingCount = waitingPlayers.length;
    waitingPlayers.forEach(player => {
      io.to(player.id).emit('waitingStatus', { count: waitingCount });
    });
    // When two players are ready, pair them and start the game
    if (waitingPlayers.length >= 2) {
      const players = waitingPlayers.splice(0, 2);
      // Send startGame event to both players
      players.forEach(p => {
        io.to(p.id).emit('startGame', { block: p.block });
      });
    }
  });

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg); // broadcast to all clients
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected: ' + socket.id);
    // Remove disconnected player from waiting room and update waiting status
    waitingPlayers = waitingPlayers.filter(p => p.id !== socket.id);
    waitingPlayers.forEach(player => {
      io.to(player.id).emit('waitingStatus', { count: waitingPlayers.length });
    });
  });
});

// Use PORT from Render or fallback
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
