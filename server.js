const express = require('express');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 4567;

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
    socket.on('createLobby', (data) => {
        const { settings, hostName } = data;
        const lobbyId = generateLobbyId();
        const lobby = {
            id: lobbyId,
            hostId: socket.id,
            players: [{ id: socket.id, name: hostName || 'Host', score: 0 }],
            settings: settings,
            gameState: 'waiting', // waiting, playing, finished
            currentQuestion: null,
            currentQuestionIndex: 0,
            questions: [],
            timer: null,
            timeLeft: 0,
            playerAnswers: new Map() // Track which players have answered current question
        };
        
        lobbies.set(lobbyId, lobby);
        playerLobbies.set(socket.id, lobbyId);
        socket.join(lobbyId);
        
        socket.emit('lobbyCreated', { lobbyId, isHost: true, players: lobby.players, settings: lobby.settings });
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
        lobby.players.push({ id: socket.id, name: playerName || `Player ${lobby.players.length + 1}`, score: 0 });
        playerLobbies.set(socket.id, lobbyId);
        socket.join(lobbyId);
        
        // Notify all players in lobby
        io.to(lobbyId).emit('playerJoined', {
            players: lobby.players,
            newPlayer: { id: socket.id, name: playerName || `Player ${lobby.players.length}`, score: 0 }
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
        lobby.playerAnswers.clear();
        
        // Reset all player scores
        lobby.players.forEach(player => {
            player.score = 0;
        });
        
        // Send first question to all players
        if (questions.length > 0) {
            lobby.currentQuestion = questions[0];
            startQuestionTimer(lobby, lobbyId);
            io.to(lobbyId).emit('gameStarted', {
                question: lobby.currentQuestion,
                questionIndex: 0,
                totalQuestions: questions.length,
                players: lobby.players
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
        
        // Check if player already answered this question
        if (lobby.playerAnswers.has(socket.id)) {
            return;
        }
        
        // Record the answer
        lobby.playerAnswers.set(socket.id, {
            answerIndex: data.answerIndex,
            isCorrect: data.isCorrect,
            timestamp: Date.now()
        });
        
        // Update player score
        if (data.isCorrect) {
            const player = lobby.players.find(p => p.id === socket.id);
            if (player) {
                player.score++;
            }
        }
        
        // Broadcast answer to all players in lobby
        io.to(lobbyId).emit('playerAnswered', {
            playerId: socket.id,
            answerIndex: data.answerIndex,
            isCorrect: data.isCorrect,
            players: lobby.players // Send updated scores
        });
        
        // Check if all players have answered
        if (lobby.playerAnswers.size === lobby.players.length) {
            // All players answered, stop timer and start auto-advance
            stopQuestionTimer(lobby);
            io.to(lobbyId).emit('allPlayersAnswered');
            startAutoAdvanceTimer(lobby, lobbyId);
        }
    });

    // Move to next question (host only)
    socket.on('nextQuestion', () => {
        const lobbyId = playerLobbies.get(socket.id);
        const lobby = lobbies.get(lobbyId);
        
        if (!lobby || lobby.hostId !== socket.id) {
            return;
        }
        
        stopQuestionTimer(lobby);
        stopAutoAdvanceTimer(lobby); // Stop auto-advance if host advances manually
        lobby.currentQuestionIndex++;
        lobby.playerAnswers.clear(); // Reset for next question
        
        if (lobby.currentQuestionIndex < lobby.questions.length) {
            lobby.currentQuestion = lobby.questions[lobby.currentQuestionIndex];
            startQuestionTimer(lobby, lobbyId);
            io.to(lobbyId).emit('nextQuestion', {
                question: lobby.currentQuestion,
                questionIndex: lobby.currentQuestionIndex,
                totalQuestions: lobby.questions.length,
                players: lobby.players
            });
        } else {
            lobby.gameState = 'finished';
            const teamScore = lobby.players.reduce((total, player) => total + player.score, 0);
            io.to(lobbyId).emit('gameFinished', {
                players: lobby.players,
                teamScore: teamScore,
                totalQuestions: lobby.questions.length
            });
        }
    });

    // Kick a player from lobby (host only)
    socket.on('kickPlayer', (data) => {
        const { playerId } = data;
        const lobbyId = playerLobbies.get(socket.id);
        
        if (!lobbyId) {
            socket.emit('error', 'You are not in a lobby');
            return;
        }
        
        const lobby = lobbies.get(lobbyId);
        if (!lobby) {
            socket.emit('error', 'Lobby not found');
            return;
        }
        
        // Check if the requester is the host
        if (lobby.hostId !== socket.id) {
            socket.emit('error', 'Only the host can kick players');
            return;
        }
        
        // Check if trying to kick themselves
        if (playerId === socket.id) {
            socket.emit('error', 'Cannot kick yourself');
            return;
        }
        
        // Find and remove the player
        const playerIndex = lobby.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            socket.emit('error', 'Player not found');
            return;
        }
        
        // Remove player from lobby
        lobby.players.splice(playerIndex, 1);
        playerLobbies.delete(playerId);
        
        // Disconnect the kicked player from the lobby room
        const kickedSocket = io.sockets.sockets.get(playerId);
        if (kickedSocket) {
            kickedSocket.leave(lobbyId);
            kickedSocket.emit('kicked', { message: 'You have been kicked from the lobby' });
        }
        
        // Notify all remaining players
        io.to(lobbyId).emit('playerLeft', {
            playerId: playerId,
            players: lobby.players
        });
        
        console.log(`Player ${playerId} was kicked from lobby ${lobbyId} by host ${socket.id}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        const lobbyId = playerLobbies.get(socket.id);
        if (lobbyId) {
            const lobby = lobbies.get(lobbyId);
            if (lobby) {
                // Stop any running timers
                stopQuestionTimer(lobby);
                stopAutoAdvanceTimer(lobby);
                
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

// Timer management functions
function startQuestionTimer(lobby, lobbyId) {
    // Stop any existing timer
    stopQuestionTimer(lobby);
    
    // Set time based on difficulty
    const difficulty = lobby.currentQuestion.difficulty;
    const timerSettings = {
        easy: 15,
        medium: 10,
        hard: 5,
        default: 15
    };
    
    lobby.timeLeft = timerSettings[difficulty] || timerSettings.default;
    
    // Broadcast initial timer state
    io.to(lobbyId).emit('timerUpdate', { timeLeft: lobby.timeLeft });
    
    // Start countdown
    lobby.timer = setInterval(() => {
        lobby.timeLeft--;
        io.to(lobbyId).emit('timerUpdate', { timeLeft: lobby.timeLeft });
        
        if (lobby.timeLeft <= 0) {
            handleQuestionTimeout(lobby, lobbyId);
        }
    }, 1000);
}

function stopQuestionTimer(lobby) {
    if (lobby.timer) {
        clearInterval(lobby.timer);
        lobby.timer = null;
    }
}

function startAutoAdvanceTimer(lobby, lobbyId) {
    // Stop any existing auto-advance timer
    stopAutoAdvanceTimer(lobby);
    
    // Set 5-second countdown for auto-advance
    lobby.autoAdvanceTimeLeft = 5;
    
    // Broadcast initial countdown state
    io.to(lobbyId).emit('autoAdvanceUpdate', { timeLeft: lobby.autoAdvanceTimeLeft });
    
    // Start countdown
    lobby.autoAdvanceTimer = setInterval(() => {
        lobby.autoAdvanceTimeLeft--;
        io.to(lobbyId).emit('autoAdvanceUpdate', { timeLeft: lobby.autoAdvanceTimeLeft });
        
        if (lobby.autoAdvanceTimeLeft <= 0) {
            // Auto-advance to next question
            handleAutoAdvance(lobby, lobbyId);
        }
    }, 1000);
}

function stopAutoAdvanceTimer(lobby) {
    if (lobby.autoAdvanceTimer) {
        clearInterval(lobby.autoAdvanceTimer);
        lobby.autoAdvanceTimer = null;
    }
}

function handleAutoAdvance(lobby, lobbyId) {
    stopAutoAdvanceTimer(lobby);
    
    // Advance to next question (same logic as manual nextQuestion)
    lobby.currentQuestionIndex++;
    lobby.playerAnswers.clear(); // Reset for next question
    
    if (lobby.currentQuestionIndex < lobby.questions.length) {
        lobby.currentQuestion = lobby.questions[lobby.currentQuestionIndex];
        startQuestionTimer(lobby, lobbyId);
        io.to(lobbyId).emit('nextQuestion', {
            question: lobby.currentQuestion,
            questionIndex: lobby.currentQuestionIndex,
            totalQuestions: lobby.questions.length,
            players: lobby.players
        });
    } else {
        lobby.gameState = 'finished';
        const teamScore = lobby.players.reduce((total, player) => total + player.score, 0);
        io.to(lobbyId).emit('gameFinished', {
            players: lobby.players,
            teamScore: teamScore,
            totalQuestions: lobby.questions.length
        });
    }
}

function handleQuestionTimeout(lobby, lobbyId) {
    stopQuestionTimer(lobby);
    
    // Mark unanswered players as having timed out
    lobby.players.forEach(player => {
        if (!lobby.playerAnswers.has(player.id)) {
            lobby.playerAnswers.set(player.id, {
                answerIndex: -1,
                isCorrect: false,
                timestamp: Date.now(),
                timedOut: true
            });
        }
    });
    
    // Broadcast timeout to all players
    io.to(lobbyId).emit('questionTimeout', {
        players: lobby.players
    });
    
    // Start auto-advance timer after timeout
    startAutoAdvanceTimer(lobby, lobbyId);
}

// Start server
server.listen(PORT, () => {
    console.log(`🧠 Trivia Quiz Game server is running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} in your browser`);
});

module.exports = app;