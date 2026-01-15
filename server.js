const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let players = {};
let gameState = {
    balls: [],
    p1: { y: 300, name: "Bekleniyor..." },
    p2: { y: 300, name: "Bekleniyor..." },
    scores: { p1: 0, p2: 0 }
};

io.on('connection', (socket) => {
    socket.on('joinOnline', (data) => {
        const side = Object.keys(players).length === 0 ? 'p1' : 'p2';
        players[socket.id] = { side: side, name: data.name };
        gameState[side].name = data.name;

        socket.emit('init', { side: side });

        if (Object.keys(players).length === 2) {
            gameState.balls = [{ x: 640, y: 360, dx: 12, dy: 8, r: 12 }];
            io.emit('gameStart', { names: { p1: gameState.p1.name, p2: gameState.p2.name } });
        }
    });

    socket.on('move', (data) => {
        if (players[socket.id]) gameState[players[socket.id].side].y = data.y;
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

// Sunucu tarafı fizik döngüsü
setInterval(() => {
    if (Object.keys(players).length < 2) return;
    gameState.balls.forEach(b => {
        b.x += b.dx; b.y += b.dy;
        if (b.y <= 12 || b.y >= 708) b.dy *= -1;
        if (b.x < 60 && b.y > gameState.p1.y && b.y < gameState.p1.y + 120) b.dx = Math.abs(b.dx) * 1.05;
        if (b.x > 1220 && b.y > gameState.p2.y && b.y < gameState.p2.y + 120) b.dx = -Math.abs(b.dx) * 1.05;
        if (b.x < 0) { gameState.scores.p2++; b.x = 640; b.dx = 12; }
        if (b.x > 1280) { gameState.scores.p1++; b.x = 640; b.dx = -12; }
    });
    io.emit('update', gameState);
}, 1000 / 60);

server.listen(process.env.PORT || 3000);
