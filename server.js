const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let players = {};
let gameState = {
    balls: [{x: 640, y: 360, dx: 10, dy: 7}],
    p1: {y: 300, name: "Bekleniyor..."},
    p2: {y: 300, name: "Bekleniyor..."},
    scores: {p1: 0, p2: 0}
};

io.on('connection', (socket) => {
    socket.on('joinGame', (data) => {
        const side = Object.keys(players).length === 0 ? 'p1' : 'p2';
        players[socket.id] = { side: side, name: data.name };
        gameState[side].name = data.name;

        socket.emit('init', { id: socket.id, side: side });
        if(Object.keys(players).length === 2) io.emit('gameStart');
    });

    socket.on('move', (data) => {
        if(players[socket.id]) {
            gameState[players[socket.id].side].y = data.y;
        }
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

// Oyun Döngüsü
setInterval(() => {
    if(Object.keys(players).length < 2) return;
    
    // Top fiziği ve çarpışma hesaplamaları buraya gelir...
    gameState.balls.forEach(b => {
        b.x += b.dx; b.y += b.dy;
        if(b.y <= 0 || b.y >= 720) b.dy *= -1;
        // Raket çarpışmaları...
    });

    io.emit('update', { 
        balls: gameState.balls, 
        p1: {y: gameState.p1.y}, 
        p2: {y: gameState.p2.y},
        scores: gameState.scores,
        names: {p1: gameState.p1.name, p2: gameState.p2.name}
    });
}, 1000/60);

server.listen(process.env.PORT || 3000);
