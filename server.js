const express = require('express');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Store active lobbies
const lobbies = new Map();
const playerLobbies = new Map(); // Track which lobby each player is in

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Trivia Quiz Game server is running',
        timestamp: new Date().toISOString()
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create a new lobby
    socket.on('createLobby', (settings) => {
        const lobbyId = generateLobbyId();
        const lobby = {
            id: lobbyId,
            hostId: socket.id,
            players: [{ id: socket.id, name: 'Host' }],
            settings: settings,
            gameState: 'waiting', // waiting, playing, finished
            currentQuestion: null,
            currentQuestionIndex: 0,
            questions: []
        };
        
        lobbies.set(lobbyId, lobby);
        playerLobbies.set(socket.id, lobbyId);
        socket.join(lobbyId);
        
        socket.emit('lobbyCreated', { lobbyId, isHost: true });
        console.log(`Lobby ${lobbyId} created by ${socket.id}`);
    });

    // Join an existing lobby
    socket.on('joinLobby', (data) => {
        const { lobbyId, playerName } = data;
        const lobby = lobbies.get(lobbyId);
        
        if (!lobby) {
            socket.emit('error', 'Lobby not found');
            return;
        }
        
        if (lobby.gameState !== 'waiting') {
            socket.emit('error', 'Game already in progress');
            return;
        }
        
        // Add player to lobby
        lobby.players.push({ id: socket.id, name: playerName || `Player ${lobby.players.length + 1}` });
        playerLobbies.set(socket.id, lobbyId);
        socket.join(lobbyId);
        
        // Notify all players in lobby
        io.to(lobbyId).emit('playerJoined', {
            players: lobby.players,
            newPlayer: { id: socket.id, name: playerName || `Player ${lobby.players.length}` }
        });
        
        socket.emit('lobbyJoined', { lobbyId, isHost: false, players: lobby.players, settings: lobby.settings });
        console.log(`Player ${socket.id} joined lobby ${lobbyId}`);
    });

    // Start the game (host only)
    socket.on('startGame', (questions) => {
        const lobbyId = playerLobbies.get(socket.id);
        const lobby = lobbies.get(lobbyId);
        
        if (!lobby || lobby.hostId !== socket.id) {
            socket.emit('error', 'Not authorized to start game');
            return;
        }
        
        lobby.gameState = 'playing';
        lobby.questions = questions;
        lobby.currentQuestionIndex = 0;
        
        // Send first question to all players
        if (questions.length > 0) {
            lobby.currentQuestion = questions[0];
            io.to(lobbyId).emit('gameStarted', {
                question: lobby.currentQuestion,
                questionIndex: 0,
                totalQuestions: questions.length
            });
        }
        
        console.log(`Game started in lobby ${lobbyId}`);
    });

    // Handle player answers
    socket.on('submitAnswer', (data) => {
        const lobbyId = playerLobbies.get(socket.id);
        const lobby = lobbies.get(lobbyId);
        
        if (!lobby || lobby.gameState !== 'playing') {
            return;
        }
        
        // Broadcast answer to all players in lobby
        io.to(lobbyId).emit('playerAnswered', {
            playerId: socket.id,
            answerIndex: data.answerIndex,
            isCorrect: data.isCorrect
        });
    });

    // Move to next question (host only)
    socket.on('nextQuestion', () => {
        const lobbyId = playerLobbies.get(socket.id);
        const lobby = lobbies.get(lobbyId);
        
        if (!lobby || lobby.hostId !== socket.id) {
            return;
        }
        
        lobby.currentQuestionIndex++;
        
        if (lobby.currentQuestionIndex < lobby.questions.length) {
            lobby.currentQuestion = lobby.questions[lobby.currentQuestionIndex];
            io.to(lobbyId).emit('nextQuestion', {
                question: lobby.currentQuestion,
                questionIndex: lobby.currentQuestionIndex,
                totalQuestions: lobby.questions.length
            });
        } else {
            lobby.gameState = 'finished';
            io.to(lobbyId).emit('gameFinished');
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        const lobbyId = playerLobbies.get(socket.id);
        if (lobbyId) {
            const lobby = lobbies.get(lobbyId);
            if (lobby) {
                // Remove player from lobby
                lobby.players = lobby.players.filter(p => p.id !== socket.id);
                
                // If host disconnected, either transfer host or close lobby
                if (lobby.hostId === socket.id) {
                    if (lobby.players.length > 0) {
                        lobby.hostId = lobby.players[0].id;
                        io.to(lobbyId).emit('hostChanged', { newHostId: lobby.hostId });
                    } else {
                        lobbies.delete(lobbyId);
                        console.log(`Lobby ${lobbyId} closed - no players remaining`);
                    }
                }
                
                // Notify remaining players
                if (lobby.players.length > 0) {
                    io.to(lobbyId).emit('playerLeft', {
                        playerId: socket.id,
                        players: lobby.players
                    });
                }
            }
            playerLobbies.delete(socket.id);
        }
    });
});

// Generate a random lobby ID
function generateLobbyId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Start server
server.listen(PORT, () => {
    console.log(`🧠 Trivia Quiz Game server is running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} in your browser`);
});

module.exports = app;