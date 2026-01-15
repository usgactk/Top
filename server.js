const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let players = {}; // Bağlı tüm oyuncular
let gameState = {
    balls: [],
    p1: { y: 300, name: "Bekleniyor...", id: null },
    p2: { y: 300, name: "Bekleniyor...", id: null },
    scores: { p1: 0, p2: 0 }
};

// Topu başlatan fonksiyon
function resetBall() {
    gameState.balls = [{ x: 640, y: 360, dx: 10 * (Math.random() > 0.5 ? 1 : -1), dy: 7 }];
}

io.on('connection', (socket) => {
    console.log('Yeni bağlantı:', socket.id);

    socket.on('joinGame', (data) => {
        // Eğer 1. oyuncu boşsa oraya yerleştir
        if (!gameState.p1.id) {
            gameState.p1.id = socket.id;
            gameState.p1.name = data.name;
            players[socket.id] = { side: 'p1' };
            socket.emit('init', { side: 'p1' });
        } 
        // Değilse ve 2. oyuncu boşsa oraya yerleştir
        else if (!gameState.p2.id) {
            gameState.p2.id = socket.id;
            gameState.p2.name = data.name;
            players[socket.id] = { side: 'p2' };
            socket.emit('init', { side: 'p2' });
            
            // İki oyuncu da tamam, maçı başlat
            io.emit('gameStart');
            resetBall();
        }

        console.log(`Oyuncu katıldı: ${data.name} (${socket.id})`);
    });

    socket.on('move', (data) => {
        const player = players[socket.id];
        if (player) {
            gameState[player.side].y += data.dy;
            // Sınırlar
            if (gameState[player.side].y < 0) gameState[player.side].y = 0;
            if (gameState[player.side].y > 600) gameState[player.side].y = 600;
        }
    });

    socket.on('disconnect', () => {
        console.log('Oyuncu çıktı:', socket.id);
        if (gameState.p1.id === socket.id) {
            gameState.p1.id = null;
            gameState.p1.name = "Bekleniyor...";
        } else if (gameState.p2.id === socket.id) {
            gameState.p2.id = null;
            gameState.p2.name = "Bekleniyor...";
        }
        delete players[socket.id];
        // Birisi çıkarsa skorları ve topu sıfırla (isteğe bağlı)
        gameState.scores = { p1: 0, p2: 0 };
        gameState.balls = [];
    });
});

// Oyun Döngüsü (60 FPS)
setInterval(() => {
    if (gameState.p1.id && gameState.p2.id) {
        gameState.balls.forEach(b => {
            b.x += b.dx; b.y += b.dy;
            if (b.y < 12 || b.y > 708) b.dy *= -1;

            // Çarpışma ve Skor Mantığı (Sunucu tarafında hesaplanır)
            if (b.x < 60 && b.y > gameState.p1.y && b.y < gameState.p1.y + 120) b.dx = Math.abs(b.dx) * 1.05;
            if (b.x > 1220 && b.y > gameState.p2.y && b.y < gameState.p2.y + 120) b.dx = -Math.abs(b.dx) * 1.05;

            if (b.x < 0) { gameState.scores.p2++; resetBall(); }
            if (b.x > 1280) { gameState.scores.p1++; resetBall(); }
        });

        io.emit('update', {
            balls: gameState.balls,
            p1: { y: gameState.p1.y },
            p2: { y: gameState.p2.y },
            scores: gameState.scores,
            names: { p1: gameState.p1.name, p2: gameState.p2.name }
        });
    }
}, 1000 / 60);

server.listen(process.env.PORT || 3000);
