const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let players = {}; 
let balls = [];
let scores = { left: 0, right: 0 };
let gameConfig = { ballCount: 1, ballSpeed: 10, botSkill: 0, isBotMode: false };

const GW = 1280, GH = 720, paddleH = 120;

function createBall(speed) {
    return { x: GW/2, y: GH/2, dx: (Math.random() > 0.5 ? 1 : -1) * speed, dy: (Math.random() > 0.5 ? 0.7 : -0.7) * speed, r: 12 };
}

io.on('connection', (socket) => {
    // İlk gelen sol (mavi), ikinci gelen sağ (kırmızı) olur
    const side = Object.keys(players).length === 0 ? 'left' : 'right';
    players[socket.id] = { y: GH/2 - 60, side: side, id: socket.id };

    socket.emit('init', { id: socket.id, side: side });

    socket.on('startConfig', (config) => {
        gameConfig = config;
        scores = { left: 0, right: 0 };
        resetStage();
    });

    socket.on('move', (data) => {
        if (players[socket.id]) players[socket.id].y = data.y;
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
    });
});

function resetStage() {
    balls = [];
    setTimeout(() => {
        for(let i=0; i < gameConfig.ballCount; i++) {
            balls.push(createBall(gameConfig.ballSpeed));
        }
    }, 3000); // 3 saniye geri sayım payı
}

// Oyun Döngüsü
setInterval(() => {
    if (balls.length === 0) {
        io.emit('update', { players, balls, scores });
        return;
    }

    // Bot Hareketi (Eğer mod aktifse ve sağ tarafta oyuncu yoksa)
    if (gameConfig.isBotMode) {
        let targetBall = balls.reduce((prev, curr) => (curr.x > prev.x) ? curr : prev);
        let botY = players["bot"] ? players["bot"].y : GH/2 - 60;
        let diff = (targetBall.y - paddleH/2) - botY;
        botY += diff * gameConfig.botSkill;
        players["bot"] = { y: botY, side: 'right', id: 'bot' };
    }

    balls.forEach(ball => {
        ball.x += ball.dx; ball.y += ball.dy;
        if (ball.y <= ball.r || ball.y >= GH - ball.r) ball.dy *= -1;

        // Çarpışma ve Skor Mantığı... (Önceki kodun aynısı burada sunucu tarafında çalışır)
        if (ball.x < 0) { scores.right++; resetStage(); io.emit('goal', 'right'); }
        else if (ball.x > GW) { scores.left++; resetStage(); io.emit('goal', 'left'); }
    });

    io.emit('update', { players, balls, scores });
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));
