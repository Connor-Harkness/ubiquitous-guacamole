# 🧠 Trivia Quiz Game

A mobile-friendly trivia quiz game with Open Trivia Database API integration, served by an Express.js server.

## Features

- **🎮 Interactive Quiz Game**: Choose from 5-50 questions with configurable difficulty levels
- **⏰ Timed Questions**: Time limits based on difficulty (Easy: 15s, Medium: 10s, Hard: 5s)
- **🌐 Open Trivia DB Integration**: Real questions from a comprehensive trivia database
- **📱 Mobile-First Design**: Responsive design that works beautifully on all devices
- **🎯 Real-time Scoring**: Track your progress with visual feedback and detailed results

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

## Game Rules

- Select your preferred number of questions (5-50) and difficulty level
- Answer questions within the time limit:
  - **Easy questions**: 15 seconds
  - **Medium questions**: 10 seconds  
  - **Hard questions**: 5 seconds
- Get immediate visual feedback on your answers
- View your final score and performance statistics

## API Integration

The game integrates with the [Open Trivia Database](https://opentdb.com/) API to provide:
- Fresh questions for each session
- Session tokens to prevent duplicate questions
- Multiple categories and difficulty levels
- Proper URL encoding/decoding for special characters

## Technical Features

- **Express.js Server**: Standalone web application server
- **Session Management**: Prevents duplicate questions across sessions
- **Error Handling**: Graceful fallback to demo questions when API is unavailable
- **Mobile Responsive**: Optimized for all screen sizes
- **Timer System**: Visual countdown with warnings for time-sensitive gameplay

## License

MIT License - see LICENSE file for details
Fully AI Generated Quiz game!
