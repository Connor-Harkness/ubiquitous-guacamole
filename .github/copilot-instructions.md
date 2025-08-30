# 🧠 Trivia Quiz Game - GitHub Copilot Instructions

A mobile-friendly Node.js trivia quiz game with Express server, Socket.IO multiplayer functionality, and Open Trivia Database API integration.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Bootstrap and Setup (Required for All Development)
- Install dependencies: `npm install` -- completes in ~1 second. NEVER CANCEL.
- **No build process required** -- this is a static file-serving Node.js application
- Start the production server: `npm start` -- starts instantly on port 3000
- Start development server: `npm run dev` -- starts with nodemon for auto-restart
- Access the application: Open `http://localhost:3000` in browser
- Health check: `curl http://localhost:3000/health` returns JSON status

### Development Commands
- **Production mode**: `npm start` (standard Express server)
- **Development mode**: `npm run dev` (uses nodemon for auto-restart on file changes)
- **Dependencies only**: `npm install` (no additional build steps needed)

## Validation Requirements

### CRITICAL: Complete User Scenario Testing
After making ANY changes to the codebase, you MUST validate these complete scenarios:

#### Single Player Validation Flow:
1. Start server: `npm start`
2. Open `http://localhost:3000` in browser
3. Click "Single Player" button
4. Configure quiz settings (questions: 5-50, difficulty: easy/medium/hard/any)
5. Select categories or use "Select All Categories"
6. Click "Start Quiz" button
7. **Verify quiz loads and displays questions** (may show demo questions if API blocked)
8. Answer at least 2 questions to test timer and progression
9. Complete quiz and verify results screen shows score and statistics

#### Multiplayer Validation Flow:
1. With server running, open two browser tabs to `http://localhost:3000`
2. **Tab 1 (Host)**: Click "Multiplayer" → "Create Lobby" → configure settings → "Create Lobby"
3. **Tab 2 (Player)**: Click "Multiplayer" → "Join Lobby" → enter lobby code → enter player name
4. **Host**: Verify player appears in lobby, click "Start Game"
5. **Both tabs**: Verify same questions appear simultaneously
6. Answer questions in both tabs and verify real-time synchronization
7. Complete game and verify leaderboard shows both players

### Required Manual Testing After Changes:
- **ALWAYS test complete user workflows, not just server startup**
- **ALWAYS verify UI interactions work correctly in browser**  
- **ALWAYS test both game modes when making changes to core functionality**
- Take screenshots of UI changes for documentation

## API Integration Notes

### External Dependencies:
- **Open Trivia Database API**: `https://opentdb.com/` 
- **Graceful fallback**: Application automatically uses demo questions when API is unavailable
- **Expected behavior**: API requests may fail in restricted environments - this is normal
- **Session tokens**: Game requests session tokens to prevent duplicate questions

### Demo Questions Fallback:
- Application includes built-in demo questions for offline/restricted use
- Fallback activates automatically when external API fails
- Demo questions include: General Knowledge, Mathematics, Science, Geography, Literature

## Technical Architecture

### Project Structure:
```
/
├── server.js          # Express server with Socket.IO multiplayer
├── index.html         # Main web application interface  
├── script.js          # Frontend game logic and API integration
├── style.css          # Responsive CSS styling
├── package.json       # Dependencies and npm scripts
└── README.md          # Project documentation
```

### Key Files for Common Changes:
- **Server/API changes**: Edit `server.js` (Express routes, Socket.IO events)
- **Game logic changes**: Edit `script.js` (quiz flow, scoring, timers)
- **UI/styling changes**: Edit `style.css` (responsive design, animations)
- **Layout changes**: Edit `index.html` (page structure, screens)

### Dependencies:
- **express**: Web server framework  
- **socket.io**: Real-time WebSocket communication for multiplayer
- **nodemon**: Development dependency for auto-restart

## Common Development Tasks

### Adding New Features:
- **Game logic**: Modify `TriviaGame` class in `script.js`
- **Multiplayer features**: Edit Socket.IO event handlers in `server.js`
- **UI components**: Update HTML structure in `index.html` and styles in `style.css`
- **Always test both single-player and multiplayer modes after changes**

### Debugging:
- **Server issues**: Check console output from `npm start` or `npm run dev`
- **Client issues**: Open browser developer tools and check console
- **API issues**: Monitor network tab for failed requests (fallback to demo questions is expected)
- **Multiplayer issues**: Test with multiple browser tabs/windows

### Performance Considerations:
- **No build optimization needed**: Static files served directly
- **Instant startup**: No compilation or build steps
- **Real-time multiplayer**: Uses WebSocket connections via Socket.IO
- **Mobile responsive**: CSS includes responsive breakpoints

## Troubleshooting Guide

### Common Issues:
- **API blocked**: Expected in restricted environments - demo questions will be used
- **Port 3000 in use**: Change `PORT` environment variable or stop conflicting process
- **Module not found**: Run `npm install` to install dependencies
- **Game not loading**: Check browser console for JavaScript errors

### Development Environment:
- **Node.js version**: Supports version 14 or higher
- **Browser requirements**: Modern browsers with JavaScript and WebSocket support
- **Network**: External API access preferred but not required (fallback available)

## Validation Summary

### Quick Validation Steps:
1. `npm install` (1 second)
2. `npm start` (instant startup)  
3. Browser test: `http://localhost:3000`
4. Single-player game flow test
5. Multiplayer lobby test (if applicable to changes)
6. `curl http://localhost:3000/health` for API validation

### Before Committing Changes:
- Run complete user scenario tests for affected game modes
- Verify no JavaScript errors in browser console
- Test responsive design on different screen sizes
- Validate multiplayer synchronization if server changes made
- Screenshot UI changes for documentation

**Remember: This application has no build process and starts instantly. Focus validation time on complete user workflows rather than build/compile steps.**