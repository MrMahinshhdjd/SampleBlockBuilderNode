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

// Global waiting room array for pairing players
let waitingPlayers = [];

io.on('connection', (socket) => {
  console.log('A user connected: ' + socket.id);

  // When a player is ready in multiplayer mode
  socket.on('playerReady', (data) => {
    // Add player with their chosen block
    waitingPlayers.push({ id: socket.id, block: data.block });
    // Update waiting count for each waiting player
    const count = waitingPlayers.length;
    waitingPlayers.forEach(player => {
      io.to(player.id).emit('waitingStatus', { count });
    });
    // When exactly two players are available, start the game
    if (waitingPlayers.length >= 2) {
      const players = waitingPlayers.splice(0, 2);
      players.forEach(p => {
        io.to(p.id).emit('startGame', { block: p.block });
      });
    }
  });

  // Listen for block placements and broadcast to other clients
  socket.on('blockPlaced', (data) => {
    // Broadcast the block placement to all clients except the sender
    socket.broadcast.emit('blockPlaced', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected: ' + socket.id);
    // Remove disconnected player from waiting room
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
