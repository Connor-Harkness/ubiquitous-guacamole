// Trivia categories from Open Trivia Database
const TRIVIA_CATEGORIES = [
    {"id": 9, "name": "General Knowledge"},
    {"id": 10, "name": "Entertainment: Books"},
    {"id": 11, "name": "Entertainment: Film"},
    {"id": 12, "name": "Entertainment: Music"},
    {"id": 13, "name": "Entertainment: Musicals & Theatres"},
    {"id": 14, "name": "Entertainment: Television"},
    {"id": 15, "name": "Entertainment: Video Games"},
    {"id": 16, "name": "Entertainment: Board Games"},
    {"id": 17, "name": "Science & Nature"},
    {"id": 18, "name": "Science: Computers"},
    {"id": 19, "name": "Science: Mathematics"},
    {"id": 20, "name": "Mythology"},
    {"id": 21, "name": "Sports"},
    {"id": 22, "name": "Geography"},
    {"id": 23, "name": "History"},
    {"id": 24, "name": "Politics"},
    {"id": 25, "name": "Art"},
    {"id": 26, "name": "Celebrities"},
    {"id": 27, "name": "Animals"},
    {"id": 28, "name": "Vehicles"},
    {"id": 29, "name": "Entertainment: Comics"},
    {"id": 30, "name": "Science: Gadgets"},
    {"id": 31, "name": "Entertainment: Japanese Anime & Manga"},
    {"id": 32, "name": "Entertainment: Cartoon & Animations"}
];

class TriviaGame {
    constructor() {
        this.sessionToken = null;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.totalQuestions = 10;
        this.selectedAnswerIndex = null;
        this.timer = null;
        this.timeLeft = 0;
        this.gameSettings = {
            amount: 10,
            difficulty: '',
            categories: [] // Changed from 'category' to 'categories' array
        };
        
        // Multiplayer properties
        this.socket = null;
        this.isMultiplayer = false;
        this.isHost = false;
        this.lobbyId = null;
        this.players = [];
        this.playerScores = new Map();
        this.currentQuestion = null; // Store current question data for multiplayer
        
        // Timer settings based on difficulty
        this.timerSettings = {
            easy: 15,
            medium: 10,
            hard: 5,
            default: 15 // for mixed difficulty questions
        };
        
        this.initializeGame();
        this.bindEvents();
        this.initializeSocket();
    }

    initializeGame() {
        this.showScreen('start-screen');
        this.populateCategories();
        this.requestSessionToken();
    }

    populateCategories() {
        // Populate single-player categories
        const categoryList = document.getElementById('category-list');
        
        // Clear existing categories
        categoryList.innerHTML = '';
        
        // Populate categories
        TRIVIA_CATEGORIES.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            
            categoryItem.innerHTML = `
                <input type="checkbox" id="category-${category.id}" value="${category.id}">
                <label for="category-${category.id}">${category.name}</label>
            `;
            
            categoryList.appendChild(categoryItem);
        });

        // Populate multiplayer categories
        const mpCategoryList = document.getElementById('mp-category-list');
        
        // Clear existing categories
        mpCategoryList.innerHTML = '';
        
        // Populate categories
        TRIVIA_CATEGORIES.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            
            categoryItem.innerHTML = `
                <input type="checkbox" id="mp-category-${category.id}" value="${category.id}">
                <label for="mp-category-${category.id}">${category.name}</label>
            `;
            
            mpCategoryList.appendChild(categoryItem);
        });
    }

    initializeSocket() {
        this.socket = io();
        
        // Socket event handlers
        this.socket.on('lobbyCreated', (data) => {
            console.log('lobbyCreated event received:', data);
            this.lobbyId = data.lobbyId;
            this.isHost = data.isHost;
            this.isMultiplayer = true;
            this.players = data.players;
            document.getElementById('lobby-title').textContent = `Lobby: ${this.lobbyId}`;
            this.updateLobbySettings(data.settings);
            this.updatePlayersList();
            this.showScreen('lobby-screen');
            if (this.isHost) {
                document.getElementById('start-multiplayer-game-btn').style.display = 'block';
            }
        });

        this.socket.on('lobbyJoined', (data) => {
            this.lobbyId = data.lobbyId;
            this.isHost = data.isHost;
            this.isMultiplayer = true;
            this.players = data.players;
            document.getElementById('lobby-title').textContent = `Lobby: ${this.lobbyId}`;
            this.updateLobbySettings(data.settings);
            this.updatePlayersList();
            this.showScreen('lobby-screen');
        });

        this.socket.on('playerJoined', (data) => {
            this.players = data.players;
            this.updatePlayersList();
        });

        this.socket.on('playerLeft', (data) => {
            this.players = data.players;
            this.updatePlayersList();
        });

        this.socket.on('kicked', (data) => {
            alert(data.message || 'You have been kicked from the lobby');
            this.leaveLobby();
        });

        this.socket.on('hostChanged', (data) => {
            if (data.newHostId === this.socket.id) {
                this.isHost = true;
                document.getElementById('start-multiplayer-game-btn').style.display = 'block';
            }
        });

        this.socket.on('gameStarted', (data) => {
            this.currentQuestionIndex = data.questionIndex;
            this.totalQuestions = data.totalQuestions;
            this.isMultiplayer = true;
            this.players = data.players;
            this.currentQuestion = data.question; // Store current question data
            this.initializePlayerScores();
            this.showMultiplayerQuestion(data.question);
            this.showScreen('multiplayer-quiz-screen');
            if (this.isHost) {
                document.getElementById('mp-host-actions').style.display = 'block';
            }
        });

        this.socket.on('nextQuestion', (data) => {
            this.currentQuestionIndex = data.questionIndex;
            this.players = data.players; // Update player scores
            this.currentQuestion = data.question; // Store current question data
            this.showMultiplayerQuestion(data.question);
        });

        this.socket.on('playerAnswered', (data) => {
            this.players = data.players; // Update scores from server
            this.updatePlayerAnswerStatus(data.playerId, data.answerIndex, data.isCorrect);
        });

        this.socket.on('gameFinished', (data) => {
            this.players = data.players;
            this.teamScore = data.teamScore;
            this.showMultiplayerResults();
        });

        this.socket.on('timerUpdate', (data) => {
            this.updateMultiplayerTimer(data.timeLeft);
        });

        this.socket.on('questionTimeout', (data) => {
            this.players = data.players;
            this.handleMultiplayerTimeout();
        });

        this.socket.on('allPlayersAnswered', () => {
            this.clearTimer();
            if (this.isHost) {
                document.getElementById('mp-next-btn').disabled = false;
            }
        });

        this.socket.on('autoAdvanceUpdate', (data) => {
            this.updateAutoAdvanceDisplay(data.timeLeft);
        });

        this.socket.on('error', (message) => {
            alert(message);
        });
    }

    bindEvents() {
        // Start screen events
        document.getElementById('single-player-btn').addEventListener('click', () => {
            this.isMultiplayer = false;
            this.showScreen('single-player-screen');
        });
        
        document.getElementById('multiplayer-btn').addEventListener('click', () => {
            this.showScreen('multiplayer-mode-screen');
        });

        // Single player screen events
        document.getElementById('back-to-start-btn').addEventListener('click', () => this.showScreen('start-screen'));
        document.getElementById('start-single-btn').addEventListener('click', () => this.startSinglePlayerQuiz());
        
        // Multiplayer mode screen events
        document.getElementById('back-to-start-mp-btn').addEventListener('click', () => this.showScreen('start-screen'));
        document.getElementById('create-lobby-btn').addEventListener('click', () => this.showScreen('create-lobby-screen'));
        document.getElementById('join-lobby-btn').addEventListener('click', () => this.showScreen('join-lobby-screen'));

        // Create lobby screen events
        document.getElementById('back-to-mp-btn').addEventListener('click', () => this.showScreen('multiplayer-mode-screen'));
        document.getElementById('create-lobby-confirm-btn').addEventListener('click', () => this.createLobby());

        // Join lobby screen events
        document.getElementById('back-to-mp-join-btn').addEventListener('click', () => this.showScreen('multiplayer-mode-screen'));
        document.getElementById('join-lobby-confirm-btn').addEventListener('click', () => this.joinLobby());

        // Lobby screen events
        document.getElementById('leave-lobby-btn').addEventListener('click', () => this.leaveLobby());
        document.getElementById('start-multiplayer-game-btn').addEventListener('click', () => this.startMultiplayerGame());
        
        // Category selection events
        document.getElementById('select-all-categories').addEventListener('change', (e) => {
            this.handleSelectAllCategories(e.target.checked);
        });
        
        document.getElementById('mp-select-all-categories').addEventListener('change', (e) => {
            this.handleMultiplayerSelectAllCategories(e.target.checked);
        });
        
        // Quiz screen events
        document.getElementById('next-btn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('mp-next-btn').addEventListener('click', () => this.nextMultiplayerQuestion());
        
        // Results screen events
        document.getElementById('play-again-btn').addEventListener('click', () => this.playAgain());
        document.getElementById('new-session-btn').addEventListener('click', () => this.newSession());
        document.getElementById('back-to-lobby-btn').addEventListener('click', () => this.backToLobby());
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        
        // Error screen events
        document.getElementById('retry-btn').addEventListener('click', () => this.initializeGame());

        // Input formatting
        document.getElementById('lobby-code-input').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    handleSelectAllCategories(selectAll) {
        const categoryCheckboxes = document.querySelectorAll('#category-list input[type="checkbox"]');
        categoryCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
        });
    }

    handleMultiplayerSelectAllCategories(selectAll) {
        const categoryCheckboxes = document.querySelectorAll('#mp-category-list input[type="checkbox"]');
        categoryCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
        });
    }

    async requestSessionToken() {
        try {
            const response = await fetch('https://opentdb.com/api_token.php?command=request');
            const data = await response.json();
            
            if (data.response_code === 0) {
                this.sessionToken = data.token;
                console.log('Session token acquired:', this.sessionToken);
            } else {
                console.warn('Failed to get session token, proceeding without token');
            }
        } catch (error) {
            console.error('Error requesting session token:', error);
            // Continue without session token
        }
    }

    async resetSessionToken() {
        if (!this.sessionToken) return;
        
        try {
            const response = await fetch(`https://opentdb.com/api_token.php?command=reset&token=${this.sessionToken}`);
            const data = await response.json();
            
            if (data.response_code === 0) {
                console.log('Session token reset successfully');
            }
        } catch (error) {
            console.error('Error resetting session token:', error);
        }
    }

    async startQuiz() {
        this.showScreen('loading-screen');
        
        // Get settings from form - check if single player or multiplayer mode
        const questionCountElement = document.getElementById('sp-question-count');
        const difficultyElement = document.getElementById('sp-difficulty');
            
        this.gameSettings.amount = questionCountElement.value;
        this.gameSettings.difficulty = difficultyElement.value;
        
        // Get selected categories for single player mode
        if (!this.isMultiplayer) {
            const selectedCategoryCheckboxes = document.querySelectorAll('#category-list input[type="checkbox"]:checked');
            this.gameSettings.categories = Array.from(selectedCategoryCheckboxes).map(checkbox => parseInt(checkbox.value));
        }

        this.totalQuestions = parseInt(this.gameSettings.amount);
        
        // Update UI elements
        document.getElementById('total-questions').textContent = this.totalQuestions;
        document.getElementById('score-total').textContent = this.totalQuestions;
        
        try {
            await this.fetchQuestions();
            this.startQuizGame();
        } catch (error) {
            this.showError('Failed to load questions. Please check your internet connection and try again.');
        }
    }

    startSinglePlayerQuiz() {
        this.isMultiplayer = false;
        this.startQuiz();
    }

    createLobby() {
        const hostName = document.getElementById('host-name-input').value.trim() || 'Host';
        
        // Get selected categories from multiplayer category list
        const selectedCategoryCheckboxes = document.querySelectorAll('#mp-category-list input[type="checkbox"]:checked');
        const selectedCategories = Array.from(selectedCategoryCheckboxes).map(checkbox => parseInt(checkbox.value));
        
        const settings = {
            amount: parseInt(document.getElementById('mp-question-count').value),
            difficulty: document.getElementById('mp-difficulty').value,
            categories: selectedCategories
        };
        
        this.gameSettings = settings;
        this.socket.emit('createLobby', { settings, hostName });
    }

    joinLobby() {
        const lobbyId = document.getElementById('lobby-code-input').value.trim();
        const playerName = document.getElementById('player-name-input').value.trim() || 'Anonymous';
        
        if (!lobbyId) {
            alert('Please enter a lobby code');
            return;
        }
        
        this.socket.emit('joinLobby', { lobbyId, playerName });
    }

    leaveLobby() {
        this.socket.disconnect();
        this.socket.connect();
        this.isMultiplayer = false;
        this.isHost = false;
        this.lobbyId = null;
        this.players = [];
        this.showScreen('start-screen');
    }

    kickPlayer(playerId) {
        if (!this.isHost) return;
        
        // Find the player to kick
        const playerToKick = this.players.find(p => p.id === playerId);
        if (!playerToKick) return;
        
        // Confirm the kick action
        if (confirm(`Are you sure you want to kick ${playerToKick.name}?`)) {
            this.socket.emit('kickPlayer', { playerId });
        }
    }

    async startMultiplayerGame() {
        if (!this.isHost) return;
        
        // Fetch questions for multiplayer game
        this.totalQuestions = this.gameSettings.amount;
        await this.fetchQuestions();
        
        // Start the game for all players
        this.socket.emit('startGame', this.questions);
    }

    updateLobbySettings(settings = null) {
        const gameSettings = settings || this.gameSettings;
        document.getElementById('lobby-question-count').textContent = gameSettings.amount;
        document.getElementById('lobby-difficulty').textContent = gameSettings.difficulty || 'Any';
        
        // Display selected categories
        const categoriesElement = document.getElementById('lobby-categories');
        if (gameSettings.categories && gameSettings.categories.length > 0) {
            // Get category names from the selected IDs
            const selectedCategoryNames = gameSettings.categories.map(categoryId => {
                const category = TRIVIA_CATEGORIES.find(cat => cat.id === categoryId);
                return category ? category.name : `Category ${categoryId}`;
            });
            
            // Display categories, showing max 3 then "and X more"
            if (selectedCategoryNames.length <= 3) {
                categoriesElement.textContent = selectedCategoryNames.join(', ');
            } else {
                const firstThree = selectedCategoryNames.slice(0, 3).join(', ');
                const remaining = selectedCategoryNames.length - 3;
                categoriesElement.textContent = `${firstThree} and ${remaining} more`;
            }
        } else {
            categoriesElement.textContent = 'All';
        }
    }

    updatePlayersList() {
        const playerList = document.getElementById('player-list');
        const playerCount = document.getElementById('player-count');
        
        // Defensive check
        if (!this.players) {
            this.players = [];
        }
        
        playerList.innerHTML = '';
        playerCount.textContent = this.players.length;
        
        this.players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            
            // Show host badge for the first player (host)
            const hostBadge = index === 0 ? '<span class="host-badge">Host</span>' : '';
            
            // Show kick button for non-host players, but only if current user is host
            const kickButton = (index !== 0 && this.isHost) ? 
                `<button class="kick-btn" onclick="window.triviaGame.kickPlayer('${player.id}')" title="Kick Player">×</button>` : '';
            
            playerDiv.innerHTML = `
                <span class="player-name">${player.name}</span>
                ${hostBadge}
                ${kickButton}
            `;
            playerList.appendChild(playerDiv);
        });
    }

    initializePlayerScores() {
        this.playerScores.clear();
        this.players.forEach(player => {
            this.playerScores.set(player.id, player.score || 0);
        });
    }

    showMultiplayerQuestion(question) {
        this.clearTimer();
        this.clearAutoAdvanceDisplay();
        
        // Update question info
        document.getElementById('mp-question-number').textContent = this.currentQuestionIndex + 1;
        document.getElementById('mp-total-questions').textContent = this.totalQuestions;
        document.getElementById('mp-category').textContent = question.category;
        document.getElementById('mp-difficulty-tag').textContent = question.difficulty.toUpperCase();
        
        // Update progress
        const progress = ((this.currentQuestionIndex + 1) / this.totalQuestions) * 100;
        document.getElementById('mp-progress').style.width = `${progress}%`;
        
        // Show question and answers
        document.getElementById('mp-question-text').textContent = question.question;
        
        const answersContainer = document.getElementById('mp-answers');
        answersContainer.innerHTML = '';
        
        question.answers.forEach((answer, index) => {
            const button = document.createElement('button');
            button.className = 'answer-btn';
            button.textContent = answer;
            button.addEventListener('click', () => this.selectMultiplayerAnswer(index));
            answersContainer.appendChild(button);
        });
        
        // Reset state
        this.selectedAnswerIndex = null;
        if (this.isHost) {
            document.getElementById('mp-next-btn').disabled = true;
        }
        
        // Clear player answers display
        document.getElementById('player-answers').innerHTML = '';
        
        // Timer will be managed by server
        document.getElementById('mp-timer').textContent = '--';
    }

    selectMultiplayerAnswer(answerIndex) {
        if (this.selectedAnswerIndex !== null) return; // Already answered
        
        this.selectedAnswerIndex = answerIndex;
        
        // Use currentQuestion instead of questions array for non-host clients
        const question = this.currentQuestion;
        if (!question) {
            console.error('No current question data available');
            return;
        }
        
        const isCorrect = answerIndex === question.correctIndex;
        
        // Show answer feedback immediately for this player
        const answerButtons = document.querySelectorAll('#mp-answers .answer-btn');
        answerButtons.forEach((button, index) => {
            button.style.pointerEvents = 'none';
            
            if (index === question.correctIndex) {
                button.classList.add('correct');
            } else if (index === answerIndex) {
                button.classList.add('incorrect');
            } else {
                button.style.opacity = '0.5';
            }
        });
        
        // Send answer to server (server will handle score updates)
        this.socket.emit('submitAnswer', { answerIndex, isCorrect });
    }

    updatePlayerAnswerStatus(playerId, answerIndex, isCorrect) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        // Update local player scores from server data
        this.playerScores.set(playerId, player.score || 0);
        
        // Update UI to show player answered
        const playerAnswers = document.getElementById('player-answers');
        const existingStatus = document.getElementById(`status-${playerId}`);
        
        if (!existingStatus) {
            const statusDiv = document.createElement('div');
            statusDiv.id = `status-${playerId}`;
            statusDiv.className = `player-status ${isCorrect ? 'correct' : 'incorrect'}`;
            statusDiv.textContent = `${player.name}: ${isCorrect ? '✓' : '✗'}`;
            playerAnswers.appendChild(statusDiv);
        }
    }

    updateMultiplayerTimer(timeLeft) {
        const timerElement = document.getElementById('mp-timer');
        if (!timerElement) return;
        
        timerElement.textContent = timeLeft;
        
        // Add visual warnings
        timerElement.classList.remove('warning', 'danger');
        
        if (timeLeft <= 3) {
            timerElement.classList.add('danger');
        } else if (timeLeft <= 5) {
            timerElement.classList.add('warning');
        }
    }

    updateAutoAdvanceDisplay(timeLeft) {
        // Find or create auto-advance display element
        let autoAdvanceElement = document.getElementById('mp-auto-advance');
        if (!autoAdvanceElement) {
            // Create the auto-advance display element if it doesn't exist
            autoAdvanceElement = document.createElement('div');
            autoAdvanceElement.id = 'mp-auto-advance';
            autoAdvanceElement.className = 'auto-advance-display';
            
            // Insert it after the multiplayer status section
            const statusSection = document.querySelector('.multiplayer-status');
            if (statusSection) {
                statusSection.parentNode.insertBefore(autoAdvanceElement, statusSection.nextSibling);
            }
        }
        
        autoAdvanceElement.textContent = `Next question in ${timeLeft} seconds...`;
        autoAdvanceElement.style.display = 'block';
        
        // Add visual styling based on time left
        autoAdvanceElement.classList.remove('warning', 'danger');
        if (timeLeft <= 2) {
            autoAdvanceElement.classList.add('danger');
        } else if (timeLeft <= 3) {
            autoAdvanceElement.classList.add('warning');
        }
    }

    clearAutoAdvanceDisplay() {
        const autoAdvanceElement = document.getElementById('mp-auto-advance');
        if (autoAdvanceElement) {
            autoAdvanceElement.style.display = 'none';
        }
    }

    handleMultiplayerTimeout() {
        if (this.selectedAnswerIndex !== null) return; // Already answered
        
        const question = this.currentQuestion;
        if (!question) return;
        
        const answerButtons = document.querySelectorAll('#mp-answers .answer-btn');
        
        answerButtons.forEach((button, index) => {
            button.style.pointerEvents = 'none';
            
            if (index === question.correctIndex) {
                button.classList.add('correct');
            } else {
                button.style.opacity = '0.5';
            }
        });
        
        // Mark as timeout
        this.selectedAnswerIndex = -1;
        
        // Update timer display
        const timerElement = document.getElementById('mp-timer');
        timerElement.textContent = 'Time\'s up!';
        timerElement.classList.add('danger');
        
        // Enable next button for host if all players have answered/timed out
        if (this.isHost) {
            document.getElementById('mp-next-btn').disabled = false;
        }
    }

    nextMultiplayerQuestion() {
        if (!this.isHost) return;
        this.socket.emit('nextQuestion');
    }

    showMultiplayerResults() {
        const finalScores = document.getElementById('final-scores');
        finalScores.innerHTML = '';
        
        // Sort players by score (using server data)
        const sortedPlayers = [...this.players].sort((a, b) => {
            const scoreA = a.score || 0;
            const scoreB = b.score || 0;
            return scoreB - scoreA;
        });
        
        // Display team score at the top
        const teamScore = this.teamScore || 0;
        const teamPercentage = Math.round((teamScore / (this.totalQuestions * this.players.length)) * 100);
        const teamDiv = document.createElement('div');
        teamDiv.className = 'team-score';
        teamDiv.innerHTML = `
            <h3>🏆 Team Score</h3>
            <div class="score-display">
                <span class="team-total">${teamScore}</span>
                <span class="team-possible">/ ${this.totalQuestions * this.players.length}</span>
                <span class="team-percentage">(${teamPercentage}%)</span>
            </div>
        `;
        finalScores.appendChild(teamDiv);
        
        // Add separator
        const separator = document.createElement('hr');
        separator.style.margin = '20px 0';
        finalScores.appendChild(separator);
        
        // Display individual scores
        const individualHeader = document.createElement('h3');
        individualHeader.textContent = '👥 Individual Scores';
        finalScores.appendChild(individualHeader);
        
        sortedPlayers.forEach((player, index) => {
            const score = player.score || 0;
            const percentage = Math.round((score / this.totalQuestions) * 100);
            
            const scoreDiv = document.createElement('div');
            scoreDiv.className = `player-score ${index === 0 ? 'winner' : ''}`;
            scoreDiv.innerHTML = `
                <span class="rank">#${index + 1}</span>
                <span class="player-name">${player.name}</span>
                <span class="score">${score}/${this.totalQuestions} (${percentage}%)</span>
            `;
            finalScores.appendChild(scoreDiv);
        });
        
        this.showScreen('multiplayer-results-screen');
    }

    backToLobby() {
        this.showScreen('lobby-screen');
    }

    newGame() {
        this.showScreen('start-screen');
    }

    async fetchQuestions() {
        try {
            let apiUrl = `https://opentdb.com/api.php?amount=${this.gameSettings.amount}&encode=url3986`;
            
            // Add optional parameters
            if (this.gameSettings.difficulty) {
                apiUrl += `&difficulty=${this.gameSettings.difficulty}`;
            }
            
            // Add category if categories are selected
            if (this.gameSettings.categories && this.gameSettings.categories.length > 0) {
                // If multiple categories selected, pick one randomly for this request
                // This ensures variety while working within API limitations
                const randomCategoryId = this.gameSettings.categories[
                    Math.floor(Math.random() * this.gameSettings.categories.length)
                ];
                apiUrl += `&category=${randomCategoryId}`;
            }
            
            // Add session token if available
            if (this.sessionToken) {
                apiUrl += `&token=${this.sessionToken}`;
            }
            
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            // Handle API response codes
            switch (data.response_code) {
                case 0: // Success
                    this.questions = data.results.map(q => this.processQuestion(q));
                    break;
                case 1: // No Results
                    throw new Error('Not enough questions available for your criteria. Please try different settings.');
                case 2: // Invalid Parameter
                    throw new Error('Invalid settings. Please try again.');
                case 3: // Token Not Found
                    console.warn('Session token expired, requesting new token');
                    await this.requestSessionToken();
                    return this.fetchQuestions(); // Retry with new token
                case 4: // Token Empty
                    console.warn('All questions exhausted, resetting session token');
                    await this.resetSessionToken();
                    return this.fetchQuestions(); // Retry with reset token
                case 5: // Rate Limited
                    throw new Error('Too many requests. Please wait a moment and try again.');
                default:
                    throw new Error('An unexpected error occurred while loading questions.');
            }
        } catch (error) {
            console.warn('API request failed, using demo questions:', error.message);
            // Fallback to demo questions if API is unavailable
            this.questions = this.generateDemoQuestions();
        }
    }

    generateDemoQuestions() {
        const demoQuestions = [
            {
                question: "What is the capital of France?",
                answers: ["London", "Berlin", "Paris", "Madrid"],
                correctIndex: 2,
                category: "Geography",
                difficulty: "easy",
                type: "multiple"
            },
            {
                question: "Which planet is known as the Red Planet?",
                answers: ["Venus", "Mars", "Jupiter", "Saturn"],
                correctIndex: 1,
                category: "Science",
                difficulty: "easy",
                type: "multiple"
            },
            {
                question: "Who painted the Mona Lisa?",
                answers: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
                correctIndex: 2,
                category: "Art",
                difficulty: "medium",
                type: "multiple"
            },
            {
                question: "What is the largest mammal in the world?",
                answers: ["African Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
                correctIndex: 1,
                category: "Animals",
                difficulty: "easy",
                type: "multiple"
            },
            {
                question: "In which year did World War II end?",
                answers: ["1944", "1945", "1946", "1947"],
                correctIndex: 1,
                category: "History",
                difficulty: "medium",
                type: "multiple"
            },
            {
                question: "What is the chemical symbol for gold?",
                answers: ["Go", "Gd", "Au", "Ag"],
                correctIndex: 2,
                category: "Science",
                difficulty: "medium",
                type: "multiple"
            },
            {
                question: "Which Shakespeare play features the character Hamlet?",
                answers: ["Romeo and Juliet", "Macbeth", "Othello", "Hamlet"],
                correctIndex: 3,
                category: "Literature",
                difficulty: "easy",
                type: "multiple"
            },
            {
                question: "What is the smallest country in the world?",
                answers: ["Monaco", "Vatican City", "Nauru", "San Marino"],
                correctIndex: 1,
                category: "Geography",
                difficulty: "medium",
                type: "multiple"
            },
            {
                question: "How many sides does a hexagon have?",
                answers: ["5", "6", "7", "8"],
                correctIndex: 1,
                category: "Mathematics",
                difficulty: "easy",
                type: "multiple"
            },
            {
                question: "Which element has the atomic number 1?",
                answers: ["Helium", "Hydrogen", "Lithium", "Carbon"],
                correctIndex: 1,
                category: "Science",
                difficulty: "medium",
                type: "multiple"
            },
            {
                question: "What is the derivative of x² with respect to x?",
                answers: ["x", "2x", "x²", "2"],
                correctIndex: 1,
                category: "Mathematics", 
                difficulty: "hard",
                type: "multiple"
            }
        ];

        // Return the requested number of questions
        const requestedAmount = parseInt(this.gameSettings.amount);
        return demoQuestions.slice(0, requestedAmount);
    }

    processQuestion(questionData) {
        // Decode URL-encoded strings
        const question = decodeURIComponent(questionData.question);
        const correctAnswer = decodeURIComponent(questionData.correct_answer);
        const incorrectAnswers = questionData.incorrect_answers.map(answer => decodeURIComponent(answer));
        
        // Shuffle answers
        const allAnswers = [...incorrectAnswers, correctAnswer];
        const shuffledAnswers = this.shuffleArray(allAnswers);
        const correctIndex = shuffledAnswers.indexOf(correctAnswer);
        
        return {
            question,
            answers: shuffledAnswers,
            correctIndex,
            category: decodeURIComponent(questionData.category),
            difficulty: questionData.difficulty,
            type: questionData.type
        };
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    startQuizGame() {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.showScreen('quiz-screen');
        this.showQuestion();
    }

    showQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        
        // Clear any existing timer
        this.clearTimer();
        
        // Update progress
        const progress = ((this.currentQuestionIndex + 1) / this.totalQuestions) * 100;
        document.getElementById('progress').style.width = `${progress}%`;
        
        // Update question info
        document.getElementById('question-number').textContent = this.currentQuestionIndex + 1;
        document.getElementById('category').textContent = question.category;
        
        const difficultyTag = document.getElementById('difficulty-tag');
        difficultyTag.textContent = question.difficulty;
        difficultyTag.className = `difficulty-tag ${question.difficulty}`;
        
        // Update question text
        document.getElementById('question-text').textContent = question.question;
        
        // Create answer buttons
        const answersContainer = document.getElementById('answers');
        answersContainer.innerHTML = '';
        
        question.answers.forEach((answer, index) => {
            const button = document.createElement('button');
            button.className = 'answer-btn';
            button.textContent = answer;
            button.addEventListener('click', () => this.selectAnswer(index));
            answersContainer.appendChild(button);
        });
        
        // Reset state
        this.selectedAnswerIndex = null;
        document.getElementById('next-btn').disabled = true;
        
        // Start timer
        this.startTimer(question.difficulty);
    }

    selectAnswer(selectedIndex) {
        if (this.selectedAnswerIndex !== null) return; // Already answered
        
        // Clear timer when answer is selected
        this.clearTimer();
        
        this.selectedAnswerIndex = selectedIndex;
        const question = this.questions[this.currentQuestionIndex];
        const answerButtons = document.querySelectorAll('.answer-btn');
        
        // Disable all buttons and show correct/incorrect
        answerButtons.forEach((button, index) => {
            button.style.pointerEvents = 'none';
            
            if (index === question.correctIndex) {
                button.classList.add('correct');
            } else if (index === selectedIndex) {
                button.classList.add('incorrect');
            } else {
                button.style.opacity = '0.5';
            }
        });
        
        // Update score
        if (selectedIndex === question.correctIndex) {
            this.score++;
        }
        
        // Enable next button
        document.getElementById('next-btn').disabled = false;
    }

    startTimer(difficulty, timerElementId = 'timer') {
        // Determine time limit based on difficulty
        this.timeLeft = this.timerSettings[difficulty] || this.timerSettings.default;
        
        // Update timer display
        this.updateTimerDisplay(timerElementId);
        
        // Start countdown
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay(timerElementId);
            
            if (this.timeLeft <= 0) {
                this.handleTimeout(timerElementId);
            }
        }, 1000);
    }
    
    updateTimerDisplay(timerElementId = 'timer') {
        const timerElement = document.getElementById(timerElementId);
        if (!timerElement) {
            console.error('Timer element not found!', timerElementId);
            return;
        }
        
        timerElement.textContent = this.timeLeft;
        
        // Add visual warnings
        timerElement.classList.remove('warning', 'danger');
        
        if (this.timeLeft <= 3) {
            timerElement.classList.add('danger');
        } else if (this.timeLeft <= 5) {
            timerElement.classList.add('warning');
        }
    }
    
    handleTimeout(timerElementId = 'timer') {
        if (this.selectedAnswerIndex !== null) return; // Already answered
        
        this.clearTimer();
        
        // Treat timeout as incorrect answer
        const question = this.questions[this.currentQuestionIndex];
        
        if (this.isMultiplayer) {
            // Handle multiplayer timeout
            const answerButtons = document.querySelectorAll('#mp-answers .answer-btn');
            
            answerButtons.forEach((button, index) => {
                button.style.pointerEvents = 'none';
                
                if (index === question.correctIndex) {
                    button.classList.add('correct');
                } else {
                    button.style.opacity = '0.5';
                }
            });
            
            // Send timeout to server
            this.socket.emit('submitAnswer', { answerIndex: -1, isCorrect: false });
            
            // Enable next button for host
            if (this.isHost) {
                document.getElementById('mp-next-btn').disabled = false;
            }
        } else {
            // Handle single player timeout
            const answerButtons = document.querySelectorAll('#answers .answer-btn');
            
            answerButtons.forEach((button, index) => {
                button.style.pointerEvents = 'none';
                
                if (index === question.correctIndex) {
                    button.classList.add('correct');
                } else {
                    button.style.opacity = '0.5';
                }
            });
            
            // Enable next button
            document.getElementById('next-btn').disabled = false;
        }
        
        // Mark as timeout (no score increase)
        this.selectedAnswerIndex = -1; // Special value for timeout
        
        // Update timer display to show timeout
        const timerElement = document.getElementById(timerElementId);
        timerElement.textContent = 'Time\'s up!';
        timerElement.classList.add('danger');
    }
    
    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        // Reset timer display styling for both timers
        const timerElement = document.getElementById('timer');
        const mpTimerElement = document.getElementById('mp-timer');
        
        if (timerElement) {
            timerElement.classList.remove('warning', 'danger');
        }
        if (mpTimerElement) {
            mpTimerElement.classList.remove('warning', 'danger');
        }
    }

    nextQuestion() {
        this.clearTimer();
        this.currentQuestionIndex++;
        
        if (this.currentQuestionIndex < this.totalQuestions) {
            this.showQuestion();
        } else {
            this.showResults();
        }
    }

    showResults() {
        const percentage = Math.round((this.score / this.totalQuestions) * 100);
        
        // Update score display
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('score-percentage').textContent = `${percentage}%`;
        
        // Update score message
        const messageElement = document.getElementById('score-message');
        let message = '';
        
        if (percentage >= 90) {
            message = '🎉 Outstanding! You\'re a trivia master!';
        } else if (percentage >= 80) {
            message = '🌟 Excellent work! Great knowledge!';
        } else if (percentage >= 70) {
            message = '👍 Good job! Well done!';
        } else if (percentage >= 60) {
            message = '👌 Not bad! Keep learning!';
        } else {
            message = '📚 Keep studying and try again!';
        }
        
        messageElement.textContent = message;
        
        this.showScreen('results-screen');
    }

    playAgain() {
        this.startQuiz();
    }

    newSession() {
        this.requestSessionToken();
        this.showScreen('start-screen');
    }

    showScreen(screenId) {
        // Clear timer when changing screens
        this.clearTimer();
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        document.getElementById(screenId).classList.add('active');
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        this.showScreen('error-screen');
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.triviaGame = new TriviaGame(); // Make globally available for debugging
});

// Service worker registration for potential future PWA features
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service worker registration can be added here for offline functionality
        console.log('Service worker support detected - ready for PWA features');
    });
}