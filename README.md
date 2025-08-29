# 🧠 Trivia Quiz Game

A mobile-friendly trivia quiz game with both single-player and multiplayer modes, featuring Open Trivia Database API integration and real-time multiplayer functionality.

## Features

### Single Player
- **🎮 Interactive Quiz Game**: Choose from 5-50 questions with configurable difficulty levels
- **⏰ Timed Questions**: Time limits based on difficulty (Easy: 15s, Medium: 10s, Hard: 5s)
- **🌐 Open Trivia DB Integration**: Real questions from a comprehensive trivia database
- **📱 Mobile-First Design**: Responsive design that works beautifully on all devices
- **🎯 Real-time Scoring**: Track your progress with visual feedback and detailed results

### Multiplayer 🆕
- **👥 Real-time Multiplayer**: Play with friends in real-time using WebSockets
- **🏠 Lobby System**: Create or join lobbies with 6-character lobby codes
- **👑 Host Controls**: Host can configure game settings and start games for all players
- **♾️ Unlimited Players**: No limit on lobby size - play with as many friends as you want
- **🏆 Live Leaderboard**: See how you rank against other players in real-time
- **📊 Multiplayer Results**: Final scores and rankings for all players

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Connor-Harkness/ubiquitous-guacamole.git
cd ubiquitous-guacamole
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

### Development Mode

For development with auto-restart:
```bash
npm run dev
```

## How to Play

### Single Player Mode
1. Select "Single Player" from the main menu
2. Choose your preferred number of questions (5-50) and difficulty level
3. Answer questions within the time limit:
   - **Easy questions**: 15 seconds
   - **Medium questions**: 10 seconds  
   - **Hard questions**: 5 seconds
4. Get immediate visual feedback on your answers
5. View your final score and performance statistics

### Multiplayer Mode 🆕
1. **Creating a Lobby (Host)**:
   - Select "Multiplayer" from the main menu
   - Click "Create Lobby"
   - Configure game settings (questions count and difficulty)
   - Share the lobby code with friends
   - Start the game when everyone has joined

2. **Joining a Lobby (Player)**:
   - Select "Multiplayer" from the main menu
   - Click "Join Lobby"
   - Enter the 6-character lobby code
   - Enter your name
   - Wait for the host to start the game

3. **Playing Together**:
   - All players see the same questions simultaneously
   - Answer within the time limit
   - See live updates of other players' answers
   - Host controls progression to next questions
   - View final leaderboard with all player scores

## API Integration

The game integrates with the [Open Trivia Database](https://opentdb.com/) API to provide:
- Fresh questions for each session
- Session tokens to prevent duplicate questions
- Multiple categories and difficulty levels
- Proper URL encoding/decoding for special characters

## Technical Features

- **Express.js Server**: Standalone web application server
- **Socket.IO Integration**: Real-time WebSocket communication for multiplayer
- **Session Management**: Prevents duplicate questions across sessions
- **Lobby System**: Server-side lobby management with unlimited player capacity
- **Error Handling**: Graceful fallback to demo questions when API is unavailable
- **Mobile Responsive**: Optimized for all screen sizes
- **Timer System**: Visual countdown with warnings for time-sensitive gameplay
- **Real-time Synchronization**: Synchronized questions and answers across all players

## License

MIT License - see LICENSE file for details
Fully AI Generated Quiz game!
