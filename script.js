class TriviaGame {
    constructor() {
        this.sessionToken = null;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.totalQuestions = 10;
        this.selectedAnswerIndex = null;
        this.gameSettings = {
            amount: 10,
            difficulty: '',
            category: ''
        };
        
        this.initializeGame();
        this.bindEvents();
    }

    initializeGame() {
        this.showScreen('start-screen');
        this.requestSessionToken();
    }

    bindEvents() {
        // Start screen events
        document.getElementById('start-btn').addEventListener('click', () => this.startQuiz());
        
        // Quiz screen events
        document.getElementById('next-btn').addEventListener('click', () => this.nextQuestion());
        
        // Results screen events
        document.getElementById('play-again-btn').addEventListener('click', () => this.playAgain());
        document.getElementById('new-session-btn').addEventListener('click', () => this.newSession());
        
        // Error screen events
        document.getElementById('retry-btn').addEventListener('click', () => this.initializeGame());
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
        
        // Get settings from form
        this.gameSettings.amount = document.getElementById('question-count').value;
        this.gameSettings.difficulty = document.getElementById('difficulty').value;
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

    async fetchQuestions() {
        try {
            let apiUrl = `https://opentdb.com/api.php?amount=${this.gameSettings.amount}&encode=url3986`;
            
            // Add optional parameters
            if (this.gameSettings.difficulty) {
                apiUrl += `&difficulty=${this.gameSettings.difficulty}`;
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
        this.showQuestion();
        this.showScreen('quiz-screen');
    }

    showQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        
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
    }

    selectAnswer(selectedIndex) {
        if (this.selectedAnswerIndex !== null) return; // Already answered
        
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

    nextQuestion() {
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
    new TriviaGame();
});

// Service worker registration for potential future PWA features
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service worker registration can be added here for offline functionality
        console.log('Service worker support detected - ready for PWA features');
    });
}