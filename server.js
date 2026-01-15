const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname)); // HTML dosyasını sunar

let players = {}; 
let ball = { x: 640, y: 360, dx: 8, dy: 8, r: 12 };
let scores = { left: 0, right: 0 };

io.on('connection', (socket) => {
    // Yeni oyuncuyu belirle (İlk gelen Mavi/Sol, ikinci gelen Kırmızı/Sağ)
    const side = Object.keys(players).length === 0 ? 'left' : 'right';
    players[socket.id] = { y: 300, side: side, id: socket.id };

    console.log(`Oyuncu bağlandı: ${side} (${socket.id})`);
    socket.emit('init', { id: socket.id, side: side });

    // Oyuncudan gelen hareket bilgisini al
    socket.on('move', (data) => {
        if (players[socket.id]) players[socket.id].y = data.y;
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        console.log('Oyuncu ayrıldı.');
    });
});

// Oyun Döngüsü (Saniyede 60 kez hesaplama yapar)
setInterval(() => {
    if (Object.keys(players).length < 2) return; // 2 oyuncu yoksa oyun başlamaz

    // Top Hareketleri
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Üst ve Alt Duvar Çarpması
    if (ball.y <= ball.r || ball.y >= 720 - ball.r) ball.dy *= -1;

    // Raket Çarpışmaları
    Object.values(players).forEach(p => {
        if (p.side === 'left' && ball.x - ball.r < 60 && ball.y > p.y && ball.y < p.y + 120) {
            ball.dx = Math.abs(ball.dx) * 1.05;
        }
        if (p.side === 'right' && ball.x + ball.r > 1220 && ball.y > p.y && ball.y < p.y + 120) {
            ball.dx = -Math.abs(ball.dx) * 1.05;
        }
    });

    // Gol Kontrol
    if (ball.x < 0) { scores.right++; resetBall(); }
    if (ball.x > 1280) { scores.left++; resetBall(); }

    // Herkese güncel veriyi gönder
    io.emit('update', { players, ball, scores });
}, 1000 / 60);

function resetBall() {
    ball = { x: 640, y: 360, dx: (Math.random() > 0.5 ? 8 : -8), dy: 8, r: 12 };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Oyun ${PORT} portunda yayında!`));
