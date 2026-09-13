// Game constants
// Combat math stays in the vendored 800×400 space. ASPECT_RATIO tracks the
// live landscape viewport so the stage can stretch to fill — no 2:1 letterbox.
const BASE_WIDTH = 800;
const BASE_HEIGHT = 400;
let ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT;
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
let CANVAS_WIDTH = BASE_WIDTH;
let CANVAS_HEIGHT = BASE_HEIGHT;
let GROUND_Y = CANVAS_HEIGHT - 50;
const FIREBALL_SPEED = 8;

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Scale factors for responsive gameplay
let scaleX = 1;
let scaleY = 1;

function viewportSize() {
    const container = document.getElementById('game-container');
    const vv = window.visualViewport;
    const fallbackW = vv && vv.width ? vv.width : window.innerWidth;
    const fallbackH = vv && vv.height ? vv.height : window.innerHeight;
    const cssW = container && container.clientWidth > 1 ? container.clientWidth : fallbackW;
    const cssH = container && container.clientHeight > 1 ? container.clientHeight : fallbackH;
    return {
        width: Math.max(2, Math.floor(cssW)),
        height: Math.max(2, Math.floor(cssH)),
    };
}

// Fill the shell (100vw×100vh). Do not letterbox to 2:1 or cap at 90% height.
function resizeCanvas() {
    const { width: newWidth, height: newHeight } = viewportSize();

    ASPECT_RATIO = newWidth / newHeight;

    canvas.width = BASE_WIDTH;
    canvas.height = BASE_HEIGHT;

    scaleX = newWidth / BASE_WIDTH;
    scaleY = newHeight / BASE_HEIGHT;

    CANVAS_WIDTH = BASE_WIDTH;
    CANVAS_HEIGHT = BASE_HEIGHT;
    GROUND_Y = CANVAS_HEIGHT - 50;

    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 80));
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resizeCanvas);
}
resizeCanvas();

// Convert screen coordinates to game coordinates
function screenToGameX(x) {
    const rect = canvas.getBoundingClientRect();
    return (x - rect.left) * (BASE_WIDTH / rect.width);
}

function screenToGameY(y) {
    const rect = canvas.getBoundingClientRect();
    return (y - rect.top) * (BASE_HEIGHT / rect.height);
}

// Menu elements
const menuOverlay = document.getElementById('menu-overlay');
const menuBackdrop = document.getElementById('menu-backdrop');
const modeButtons = document.querySelector('.mode-buttons');
const singlePlayerBtn = document.getElementById('singleplayer');
const multiPlayerBtn = document.getElementById('multiplayer');
const singlePlayerInputs = document.getElementById('single-player-inputs');
const multiplayerInputs = document.getElementById('multiplayer-inputs');
const player1NameSingle = document.getElementById('player1-name-single');
const player1NameMulti = document.getElementById('player1-name-multi');
const player2NameMulti = document.getElementById('player2-name-multi');
const startSingleBtn = document.getElementById('start-single');
const startMultiBtn = document.getElementById('start-multi');
const backSingleBtn = document.getElementById('back-single');
const backMultiBtn = document.getElementById('back-multi');
const pauseMenu = document.getElementById('pause-menu');
const pauseBackdrop = document.getElementById('pause-backdrop');
const resumeBtn = document.getElementById('resume');
const exitBtn = document.getElementById('exit');
const gameOverMenu = document.getElementById('game-over-menu');
const gameOverBackdrop = document.getElementById('game-over-backdrop');
const winnerMessage = document.getElementById('winner-message');
const playAgainBtn = document.getElementById('play-again');

// Audio system
class AudioManager {
    constructor() {
        this.initialized = false;
        this.sounds = {
            startScreen: new Audio('audio/startscreen.mp3'),
            backgroundMusic1: new Audio('audio/world1-background.mp3'),
            backgroundMusic2: new Audio('audio/world2-background.mp3'),
            backgroundMusic3: new Audio('audio/world3-background.mp3'),
            punch: new Audio('audio/punch.mp3'),
            kick: new Audio('audio/punch.mp3'),
            fireball: new Audio('audio/fireball.mp3'),
            hit: new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA'),
            ko: new Audio('audio/ko.mp3'),
            round: new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA'),
            fight: new Audio('audio/fight.mp3')
        };

        // Set up music loops
        this.sounds.startScreen.loop = true;
        this.sounds.backgroundMusic1.loop = true;
        this.sounds.backgroundMusic2.loop = true;
        this.sounds.backgroundMusic3.loop = true;

        // Set volumes
        this.sounds.startScreen.volume = 0.4;
        this.sounds.backgroundMusic1.volume = 0.4;
        this.sounds.backgroundMusic2.volume = 0.4;
        this.sounds.backgroundMusic3.volume = 0.4;
        this.sounds.punch.volume = 0.6;
        this.sounds.kick.volume = 0.6;
        this.sounds.fireball.volume = 0.6;
        this.sounds.hit.volume = 0.5;
        this.sounds.ko.volume = 0.7;
        this.sounds.round.volume = 0.7;
        this.sounds.fight.volume = 0.7;

        this.currentBackgroundMusic = null;
    }

    initialize() {
        if (!this.initialized) {
            this.initialized = true;
            this.playSound('startScreen');
        }
    }

    playSound(soundName) {
        const sound = this.sounds[soundName];
        if (sound && this.initialized) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log("Audio play failed:", e));
        }
    }

    stopSound(soundName) {
        const sound = this.sounds[soundName];
        if (sound && this.initialized) {
            sound.pause();
            sound.currentTime = 0;
        }
    }

    startBackgroundMusic(worldNumber) {
        if (!this.initialized) return;

        // Stop current background music if playing
        if (this.currentBackgroundMusic) {
            this.stopSound(this.currentBackgroundMusic);
        }

        // Start new background music
        const musicTrack = `backgroundMusic${worldNumber}`;
        this.currentBackgroundMusic = musicTrack;
        this.playSound(musicTrack);
    }

    stopBackgroundMusic() {
        if (this.currentBackgroundMusic) {
            this.stopSound(this.currentBackgroundMusic);
            this.currentBackgroundMusic = null;
        }
    }
}

class Fireball {
    constructor(x, y, direction, isPlayer1) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = FIREBALL_SPEED * direction;
        this.isPlayer1 = isPlayer1;
    }

    update() {
        this.x += this.speed;
        return this.x < 0 || this.x > CANVAS_WIDTH;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        // Create gradient for fire effect
        const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, 12);
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(0.3, this.isPlayer1 ? '#4444ff' : '#ff4444');
        gradient.addColorStop(1, this.isPlayer1 ? '#0000ff' : '#ff0000');

        // Draw the fireball
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        // Add some flame particles
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 5;
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
            ctx.arc(
                Math.cos(angle) * distance,
                Math.sin(angle) * distance,
                3,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        ctx.restore();
    }

    checkCollision(player) {
        return (
            this.x < player.x + player.width &&
            this.x + this.width > player.x &&
            this.y < player.y &&
            this.y + this.height > player.y - player.height
        );
    }
}

class AI {
    constructor(player, opponent, gameInstance) {
        this.player = player;
        this.opponent = opponent;
        this.game = gameInstance;
        this.decisionDelay = 0;
        this.currentAction = null;
        this.actionDuration = 0;
        this.aggressionLevel = 0.7;
        this.isRangedMode = false;
        this.rangeModeTimer = 0;
        this.speedFactor = 0.85;
    }

    update() {
        if (this.decisionDelay > 0) {
            this.decisionDelay--;
            return;
        }

        const distance = Math.abs(this.player.x - this.opponent.x);
        
        // Randomly decide to switch between ranged and melee mode
        if (this.rangeModeTimer <= 0) {
            this.isRangedMode = Math.random() < 0.3;
            this.rangeModeTimer = 120;
        }
        this.rangeModeTimer--;

        // Movement logic based on current mode
        if (this.isRangedMode) {
            if (distance < 150) {
                if (this.player.x < this.opponent.x) {
                    this.player.velocityX = -MOVE_SPEED * this.speedFactor;
                    this.player.facingRight = false;
                } else {
                    this.player.velocityX = MOVE_SPEED * this.speedFactor;
                    this.player.facingRight = true;
                }
            } else if (distance > 200) {
                if (this.player.x > this.opponent.x) {
                    this.player.velocityX = -MOVE_SPEED * this.speedFactor;
                    this.player.facingRight = false;
                } else {
                    this.player.velocityX = MOVE_SPEED * this.speedFactor;
                    this.player.facingRight = true;
                }
            } else {
                this.player.velocityX = 0;
            }
        } else {
            if (this.player.x > this.opponent.x) {
                this.player.velocityX = -MOVE_SPEED * this.speedFactor;
                this.player.facingRight = false;
            } else {
                this.player.velocityX = MOVE_SPEED * this.speedFactor;
                this.player.facingRight = true;
            }
        }

        if (this.actionDuration > 0) {
            this.actionDuration--;
        } else {
            const rand = Math.random();
            
            if (this.isRangedMode) {
                if (distance >= 150 && distance <= 200 && rand < 0.3) {
                    const fireball = this.player.shootFireball();
                    if (fireball) {
                        this.game.audio.playSound('fireball');
                        this.game.fireballs.push(fireball);
                    }
                }
            } else {
                if (distance < 80) {
                    if (rand < 0.4) {
                        if (rand < 0.25) {
                            if (this.player.punch()) {
                                this.game.audio.playSound('punch');
                                this.game.checkHit(this.player, this.opponent, 10);
                            }
                        } else {
                            if (this.player.kick()) {
                                this.game.audio.playSound('kick');
                                this.game.checkHit(this.player, this.opponent, 15);
                            }
                        }
                    } else if (rand < 0.5) {
                        this.player.isDucking = true;
                        this.actionDuration = 15;
                    }
                }
            }

            const shouldJump = 
                (this.opponent.isKicking && distance < 70) ||
                (this.game.fireballs.some(f => !f.isPlayer1 && Math.abs(f.x - this.player.x) < 100)) ||
                (rand < 0.05);

            if (shouldJump) {
                this.player.jump();
            }
        }

        if (this.actionDuration === 0) {
            this.player.isDucking = false;
        }

        this.decisionDelay = Math.floor(Math.random() * 3) + 1;
    }
}

class Player {
    constructor(x, isPlayer1) {
        this.x = x;
        this.y = GROUND_Y;
        this.width = 40;
        this.height = 80;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.isDucking = false;
        this.health = 100;
        this.isPlayer1 = isPlayer1;
        this.isPunching = false;
        this.isKicking = false;
        this.attackCooldown = 0;
        this.fireballCooldown = 0;
        this.facingRight = isPlayer1; // Initialize facing direction based on player
    }

    update() {
        // Update facing direction based on movement
        if (this.velocityX > 0) {
            this.facingRight = true;
        } else if (this.velocityX < 0) {
            this.facingRight = false;
        }

        // Add fireball cooldown to existing update method
        if (this.fireballCooldown > 0) {
            this.fireballCooldown--;
        }
        
        // Existing update code
        this.velocityY += GRAVITY;
        this.y += this.velocityY;

        if (this.y > GROUND_Y) {
            this.y = GROUND_Y;
            this.velocityY = 0;
            this.isJumping = false;
        }

        this.x += this.velocityX;

        if (this.x < 0) this.x = 0;
        if (this.x > CANVAS_WIDTH - this.width) this.x = CANVAS_WIDTH - this.width;

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
            if (this.attackCooldown === 0) {
                this.isPunching = false;
                this.isKicking = false;
            }
        }
    }

    draw() {
        // Draw black border first
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 12;
        this.drawFigure();
        
        // Draw colored figure on top
        ctx.strokeStyle = this.isPlayer1 ? 'blue' : 'red';
        ctx.lineWidth = 5;
        this.drawFigure();
    }

    drawFigure() {
        // Draw body
        const bodyHeight = this.isDucking ? this.height / 2 : this.height;
        const headY = this.y - bodyHeight;
        
        // Head
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, headY + 10, 10, 0, Math.PI * 2);
        ctx.stroke();
        
        // Body
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, headY + 20);
        ctx.lineTo(this.x + this.width / 2, headY + bodyHeight - 20);
        ctx.stroke();
        
        // Arms
        if (this.isPunching) {
            // Punching animation
            const punchDirection = this.facingRight ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, headY + 30);
            ctx.lineTo(this.x + this.width / 2 + (30 * punchDirection), headY + 30);
            ctx.stroke();
        } else {
            // Normal arms
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, headY + 30);
            ctx.lineTo(this.x + this.width / 2 - 15, headY + 45);
            ctx.moveTo(this.x + this.width / 2, headY + 30);
            ctx.lineTo(this.x + this.width / 2 + 15, headY + 45);
            ctx.stroke();
        }
        
        // Legs with walking animation
        if (this.isKicking) {
            // Kicking animation
            const kickDirection = this.facingRight ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, headY + bodyHeight - 20);
            ctx.lineTo(this.x + this.width / 2 + (30 * kickDirection), headY + bodyHeight);
            ctx.stroke();
        } else if (Math.abs(this.velocityX) > 0) {
            // Walking animation
            const walkCycle = (Date.now() / 100) % (2 * Math.PI); // Complete cycle every ~628ms
            const legSpread = 15;
            const legLift = 10;
            
            // Left leg
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, headY + bodyHeight - 20);
            ctx.lineTo(
                this.x + this.width / 2 - (legSpread * Math.cos(walkCycle)),
                headY + bodyHeight - (legLift * Math.abs(Math.sin(walkCycle)))
            );
            ctx.stroke();
            
            // Right leg
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, headY + bodyHeight - 20);
            ctx.lineTo(
                this.x + this.width / 2 + (legSpread * Math.cos(walkCycle)),
                headY + bodyHeight - (legLift * Math.abs(Math.sin(walkCycle + Math.PI)))
            );
            ctx.stroke();
        } else {
            // Standing still
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, headY + bodyHeight - 20);
            ctx.lineTo(this.x + this.width / 2 - 15, headY + bodyHeight);
            ctx.moveTo(this.x + this.width / 2, headY + bodyHeight - 20);
            ctx.lineTo(this.x + this.width / 2 + 15, headY + bodyHeight);
            ctx.stroke();
        }
    }

    jump() {
        if (!this.isJumping) {
            this.velocityY = JUMP_FORCE;
            this.isJumping = true;
        }
    }

    punch() {
        if (this.attackCooldown === 0) {
            this.isPunching = true;
            this.attackCooldown = 20;
            return true;
        }
        return false;
    }

    kick() {
        if (this.attackCooldown === 0) {
            this.isKicking = true;
            this.attackCooldown = 30;
            return true;
        }
        return false;
    }

    shootFireball() {
        if (this.fireballCooldown === 0) {
            this.fireballCooldown = 45; // Longer cooldown for fireballs
            const direction = this.facingRight ? 1 : -1;
            const startX = this.facingRight ? this.x + this.width : this.x;
            return new Fireball(
                startX,
                this.y - this.height / 2,
                direction,
                this.isPlayer1
            );
        }
        return null;
    }
}

class Game {
    constructor() {
        this.reset();
        this.isAIGame = false;
        this.isPaused = false;
        this.player1Name = "Player 1";
        this.player2Name = "Player 2";
        this.setupPauseControls();
        this.setupGameOverControls();
        this.displayText = "";
        this.displayTextAlpha = 0;
        this.displayTextScale = 1;
        this.audio = new AudioManager();
        this.currentWorld = null;
        this.isStartScreen = true;
        this.startScreenAlpha = 0;
        this.startScreenDirection = 1;
        this.modeSelection = false;
        this.nameInput = false;
        this.isSinglePlayer = false;
        this.hoveredButton = null;
        this.player1Input = "";
        this.player2Input = "";
        this.activeInput = null;
        this.backHovered = false;
        this.startHovered = false;
        
        // Set initial background to world1
        this.backgroundImage = new Image();
        this.backgroundImage.src = 'images/world1.png';
        
        // Ensure canvas is visible
        canvas.style.display = 'block';
        canvas.style.visibility = 'visible';
        canvas.style.opacity = '1';
        
        // Hide menu initially
        menuOverlay.style.display = 'none';
        menuBackdrop.style.display = 'none';

        // Add click handler to start audio and show start screen
        const startAudio = () => {
            this.audio.initialize();
            document.removeEventListener('click', startAudio);
            canvas.removeEventListener('click', startAudio);
        };

        // Add click listeners to start audio (needed due to browser autoplay policies)
        document.addEventListener('click', startAudio);
        canvas.addEventListener('click', startAudio);
        
        // Function to handle start screen exit
        const exitStartScreen = (e) => {
            if (this.isStartScreen && !this.modeSelection) {
                this.modeSelection = true;
                // Add mouse move listener for button hover effects
                canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
                canvas.addEventListener('click', this.handleClick.bind(this));
                e.preventDefault();
            }
        };
        
        // Add both click and keydown listeners for exiting start screen
        document.addEventListener('keydown', exitStartScreen);
        canvas.addEventListener('click', exitStartScreen);

        // Add keyboard listener for name input
        document.addEventListener('keydown', (e) => {
            if (!this.nameInput) return;

            if (e.key === 'Tab') {
                e.preventDefault();
                if (this.isSinglePlayer) {
                    this.activeInput = 'player1';
                } else {
                    this.activeInput = this.activeInput === 'player1' ? 'player2' : 'player1';
                }
            } else if (e.key === 'Backspace') {
                if (this.activeInput === 'player1') {
                    this.player1Input = this.player1Input.slice(0, -1);
                } else if (this.activeInput === 'player2') {
                    this.player2Input = this.player2Input.slice(0, -1);
                }
            } else if (e.key.length === 1 && /[\w\s]/.test(e.key)) {
                if (this.activeInput === 'player1' && this.player1Input.length < 12) {
                    this.player1Input += e.key;
                } else if (this.activeInput === 'player2' && this.player2Input.length < 12) {
                    this.player2Input += e.key;
                }
            }
        });
    }

    setRandomBackground() {
        const backgrounds = ['world1.png', 'world2.png', 'world3.png'];
        
        // Filter out the current world from possible choices
        const availableBackgrounds = backgrounds.filter(bg => bg !== this.currentWorld);
        
        // Pick a random background from remaining options
        const randomBg = availableBackgrounds[Math.floor(Math.random() * availableBackgrounds.length)];
        this.currentWorld = randomBg;
        
        this.backgroundImage = new Image();
        this.backgroundImage.src = `images/${this.currentWorld}`;
        
        // Extract world number and start corresponding music
        const worldNumber = this.currentWorld.match(/world(\d)/)[1];
        this.audio.startBackgroundMusic(worldNumber);
    }

    reset() {
        this.player1 = new Player(100, true);
        this.player2 = new Player(CANVAS_WIDTH - 140, false);
        this.ai = null;
        this.round = 1;
        this.player1Wins = 0;
        this.player2Wins = 0;
        this.roundOver = false;
        this.gameOver = false;
        this.fireballs = [];
        this.currentWorld = null; // Reset world when starting new game
    }

    setupPauseControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.gameOver) {
                if (this.isPaused) {
                    this.resumeGame();
                } else {
                    this.pauseGame();
                }
            }
        });

        resumeBtn.addEventListener('click', () => this.resumeGame());
        exitBtn.addEventListener('click', () => this.exitToMenu());
    }

    setupGameOverControls() {
        // Play Again button handler
        playAgainBtn.addEventListener('click', () => {
            // Hide game over menu
            gameOverMenu.style.display = 'none';
            gameOverBackdrop.style.display = 'none';
            
            // Reset game state but keep player names and game mode
            this.reset();
            
            // Show pause instruction again
            document.querySelector('.pause-instruction').classList.add('show');
            
            // Pick a new random background and start its music
            this.currentWorld = null; // Reset world to force new random selection
            this.setRandomBackground();
            
            // Show Round 1 text
            this.displayText = "Round 1";
            this.displayTextAlpha = 1;
            this.displayTextScale = 1.5;
            this.audio.playSound('round');
            
            // Show Fight! text after a delay
            setTimeout(() => {
                this.displayText = "Fight!";
                this.displayTextAlpha = 1;
                this.displayTextScale = 1.5;
                this.audio.playSound('fight');
            }, 1500);
            
            // Recreate AI if in single player mode
            if (this.isAIGame) {
                this.ai = new AI(this.player2, this.player1, this);
            }
        });

        // Exit to Menu button handler
        document.getElementById('exit-to-menu').addEventListener('click', () => {
            this.isPaused = false;
            this.reset();
            gameOverMenu.style.display = 'none';
            gameOverBackdrop.style.display = 'none';
            menuOverlay.style.display = 'none';
            menuBackdrop.style.display = 'none';
            document.getElementById('player2-controls').classList.remove('hidden');
            
            // Hide pause instruction
            document.querySelector('.pause-instruction').classList.remove('show');
            
            // Stop game music and start the start screen music
            this.audio.stopBackgroundMusic();
            this.audio.playSound('startScreen');
            
            // Set background back to world1
            this.backgroundImage = new Image();
            this.backgroundImage.src = 'images/world1.png';
            
            // Return to start screen with mode selection
            this.isStartScreen = true;
            this.modeSelection = true;
            
            // Add mouse move listener for button hover effects
            canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
            canvas.addEventListener('click', this.handleClick.bind(this));
            
            // Hide all elements that should be hidden during start screen
            document.querySelectorAll('.hide-during-start').forEach(el => {
                el.classList.remove('show-after-start');
            });
            
            // Reset menu state
            this.showModeButtons();
        });
    }

    setupMenuControls() {
        singlePlayerBtn.addEventListener('click', () => {
            // Initialize audio on first click
            this.audio.initialize();
            modeButtons.style.display = 'none';
            singlePlayerInputs.style.display = 'block';
        });

        multiPlayerBtn.addEventListener('click', () => {
            // Initialize audio on first click
            this.audio.initialize();
            modeButtons.style.display = 'none';
            multiplayerInputs.style.display = 'block';
        });

        backSingleBtn.addEventListener('click', () => this.showModeButtons());
        backMultiBtn.addEventListener('click', () => this.showModeButtons());

        startSingleBtn.addEventListener('click', () => {
            this.player1Name = player1NameSingle.value.trim() || "Player 1";
            this.player2Name = "Computer";
            this.startGame(true);
        });

        startMultiBtn.addEventListener('click', () => {
            this.player1Name = player1NameMulti.value.trim() || "Player 1";
            this.player2Name = player2NameMulti.value.trim() || "Player 2";
            this.startGame(false);
        });
    }

    showModeButtons() {
        modeButtons.style.display = 'block';
        singlePlayerInputs.style.display = 'none';
        multiplayerInputs.style.display = 'none';
        // Reset input fields
        player1NameSingle.value = '';
        player1NameMulti.value = '';
        player2NameMulti.value = '';
    }

    pauseGame() {
        this.isPaused = true;
        pauseMenu.style.display = 'block';
        pauseBackdrop.style.display = 'block';
    }

    resumeGame() {
        this.isPaused = false;
        pauseMenu.style.display = 'none';
        pauseBackdrop.style.display = 'none';
    }

    exitToMenu() {
        this.isPaused = false;
        this.reset();
        pauseMenu.style.display = 'none';
        pauseBackdrop.style.display = 'none';
        gameOverMenu.style.display = 'none';
        gameOverBackdrop.style.display = 'none';
        menuOverlay.style.display = 'none';
        menuBackdrop.style.display = 'none';
        document.getElementById('player2-controls').classList.remove('hidden');
        
        // Hide pause instruction
        document.querySelector('.pause-instruction').classList.remove('show');
        
        // Stop game music and start the start screen music
        this.audio.stopBackgroundMusic();
        this.audio.playSound('startScreen');
        
        // Set background back to world1
        this.backgroundImage = new Image();
        this.backgroundImage.src = 'images/world1.png';
        
        // Return to start screen with mode selection
        this.isStartScreen = true;
        this.modeSelection = true;
        
        // Add mouse move listener for button hover effects
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        canvas.addEventListener('click', this.handleClick.bind(this));
        
        // Hide all elements that should be hidden during start screen
        document.querySelectorAll('.hide-during-start').forEach(el => {
            el.classList.remove('show-after-start');
        });
        
        // Reset menu state
        this.showModeButtons();
    }

    startGame(isSinglePlayer) {
        this.reset();
        this.isAIGame = isSinglePlayer;
        this.player1Name = this.player1Input || "Player 1";
        this.player2Name = this.isSinglePlayer ? "Computer" : (this.player2Input || "Player 2");
        
        if (isSinglePlayer) {
            this.ai = new AI(this.player2, this.player1, this);
            document.getElementById('player2-controls').classList.add('hidden');
        } else {
            document.getElementById('player2-controls').classList.remove('hidden');
        }

        // Reset input state
        this.nameInput = false;
        this.player1Input = "";
        this.player2Input = "";
        this.activeInput = null;
        this.isStartScreen = false;
        this.modeSelection = false;

        // Show game elements
        document.querySelectorAll('.hide-during-start').forEach(el => {
            el.classList.add('show-after-start');
        });
        
        // Stop start screen music
        this.audio.stopSound('startScreen');
        
        // Now pick a random world and start its music
        this.setRandomBackground();
        
        // Show pause instruction
        document.querySelector('.pause-instruction').classList.add('show');
        
        // Setup game controls
        this.setupControls();
        
        // Show Round 1 text
        this.displayText = "Round 1";
        this.displayTextAlpha = 1;
        this.displayTextScale = 1.5;
        this.audio.playSound('round');
        
        // Show Fight! text after a delay
        setTimeout(() => {
            this.displayText = "Fight!";
            this.displayTextAlpha = 1;
            this.displayTextScale = 1.5;
            this.audio.playSound('fight');
        }, 1500);
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (this.roundOver || this.isPaused || this.nameInput) return;
            
            // Player 1 controls
            switch(e.key) {
                case 'a': this.player1.velocityX = -MOVE_SPEED; break;
                case 'd': this.player1.velocityX = MOVE_SPEED; break;
                case 'w': this.player1.jump(); break;
                case 's': this.player1.isDucking = true; break;
                case 'z': 
                    if (this.player1.punch()) {
                        this.audio.playSound('punch');
                        this.checkHit(this.player1, this.player2, 10);
                    }
                    break;
                case 'x':
                    if (this.player1.kick()) {
                        this.audio.playSound('kick');
                        this.checkHit(this.player1, this.player2, 15);
                    }
                    break;
                case 'c':
                    const fireball1 = this.player1.shootFireball();
                    if (fireball1) {
                        this.audio.playSound('fireball');
                        this.fireballs.push(fireball1);
                    }
                    break;
            }

            // Player 2 controls (only in multiplayer)
            if (!this.isAIGame) {
                switch(e.key) {
                    case 'ArrowLeft': this.player2.velocityX = -MOVE_SPEED; break;
                    case 'ArrowRight': this.player2.velocityX = MOVE_SPEED; break;
                    case 'ArrowUp': this.player2.jump(); break;
                    case 'ArrowDown': this.player2.isDucking = true; break;
                    case ',':
                        if (this.player2.punch()) {
                            this.audio.playSound('punch');
                            this.checkHit(this.player2, this.player1, 10);
                        }
                        break;
                    case '.':
                        if (this.player2.kick()) {
                            this.audio.playSound('kick');
                            this.checkHit(this.player2, this.player1, 15);
                        }
                        break;
                    case '/':
                        const fireball2 = this.player2.shootFireball();
                        if (fireball2) {
                            this.audio.playSound('fireball');
                            this.fireballs.push(fireball2);
                        }
                        break;
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (this.roundOver || this.isPaused || this.nameInput) return;

            // Player 1 controls
            switch(e.key) {
                case 'a': if (this.player1.velocityX < 0) this.player1.velocityX = 0; break;
                case 'd': if (this.player1.velocityX > 0) this.player1.velocityX = 0; break;
                case 's': this.player1.isDucking = false; break;
            }

            // Player 2 controls (only in multiplayer)
            if (!this.isAIGame) {
                switch(e.key) {
                    case 'ArrowLeft': if (this.player2.velocityX < 0) this.player2.velocityX = 0; break;
                    case 'ArrowRight': if (this.player2.velocityX > 0) this.player2.velocityX = 0; break;
                    case 'ArrowDown': this.player2.isDucking = false; break;
                }
            }
        });
    }

    checkHit(attacker, defender, damage) {
        const attackerCenter = attacker.x + attacker.width / 2;
        const defenderCenter = defender.x + defender.width / 2;
        const distance = Math.abs(attackerCenter - defenderCenter);

        if (distance < 60 && !defender.isDucking) {
            defender.health -= damage;
            // Play hit sound
            this.audio.playSound('hit');
            
            // Apply knockback
            const knockbackForce = damage * 0.8; // Knockback proportional to damage
            const knockbackDirection = attackerCenter < defenderCenter ? 1 : -1;
            defender.velocityX = knockbackForce * knockbackDirection;
            
            // Small vertical knockback for variety
            defender.velocityY = -2;
            
            if (defender.health <= 0) {
                defender.health = 0;
                this.endRound();
            }
        }
    }

    endRound() {
        this.roundOver = true;
        if (this.player1.health <= 0) {
            this.player2Wins++;
        } else {
            this.player1Wins++;
        }

        // Show KO text and play sound
        this.displayText = "KO!";
        this.displayTextAlpha = 1;
        this.displayTextScale = 2;
        this.audio.playSound('ko');

        if (this.player1Wins === 2 || this.player2Wins === 2) {
            this.gameOver = true;
            const winner = this.player1Wins > this.player2Wins ? this.player1Name : this.player2Name;
            setTimeout(() => {
                winnerMessage.textContent = `${winner} Wins!`;
                gameOverMenu.style.display = 'block';
                gameOverBackdrop.style.display = 'block';
                // Hide pause instruction when game is over
                document.querySelector('.pause-instruction').classList.remove('show');
            }, 2000);
        } else {
            setTimeout(() => {
                // Show Round X text and play sound
                this.displayText = `Round ${this.round + 1}`;
                this.displayTextAlpha = 1;
                this.displayTextScale = 1.5;
                this.audio.playSound('round');
                setTimeout(() => {
                    this.startNewRound();
                }, 1500);
            }, 2000);
        }
    }

    startNewRound() {
        this.round++;
        this.roundOver = false;
        this.player1 = new Player(100, true);
        this.player2 = new Player(CANVAS_WIDTH - 140, false);
        this.fireballs = [];
        if (this.isAIGame) {
            this.ai = new AI(this.player2, this.player1, this);
        }
        
        // Show Fight! text and play sound
        this.displayText = "Fight!";
        this.displayTextAlpha = 1;
        this.displayTextScale = 1.5;
        this.audio.playSound('fight');
    }

    update() {
        if (!this.isStartScreen && !this.roundOver && !this.isPaused) {
            this.player1.update();
            this.player2.update();
            if (this.isAIGame && this.ai) {
                this.ai.update();
            }

            // Update and check fireballs
            for (let i = this.fireballs.length - 1; i >= 0; i--) {
                const fireball = this.fireballs[i];
                const isOffscreen = fireball.update();
                
                // Check for collisions
                const target = fireball.isPlayer1 ? this.player2 : this.player1;
                if (fireball.checkCollision(target) && !target.isDucking) {
                    target.health -= 20;
                    
                    // Apply stronger knockback for fireballs
                    const knockbackForce = 12;
                    const knockbackDirection = fireball.speed > 0 ? 1 : -1;
                    target.velocityX = knockbackForce * knockbackDirection;
                    target.velocityY = -4;
                    
                    this.fireballs.splice(i, 1);
                    
                    if (target.health <= 0) {
                        target.health = 0;
                        this.endRound();
                    }
                    continue;
                }

                // Remove if offscreen
                if (isOffscreen) {
                    this.fireballs.splice(i, 1);
                }
            }
        }
    }

    draw() {
        // Clear canvas with scaled context
        ctx.save();
        
        // Draw background image
        if (this.backgroundImage.complete) {
            ctx.drawImage(this.backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        if (this.isStartScreen) {
            this.drawStartScreen();
        } else {
            // Draw ground
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, GROUND_Y + 50, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

            // Draw players
            this.player1.draw();
            this.player2.draw();

            // Draw fireballs
            this.fireballs.forEach(fireball => fireball.draw());

            // Draw health bars at the top corners
            this.drawHealthBars();
            
            // Draw round number and scores
            this.drawGameInfo();
            
            // Draw display text if active
            if (this.displayTextAlpha > 0) {
                ctx.save();
                ctx.globalAlpha = this.displayTextAlpha;
                ctx.font = `${48 * this.displayTextScale}px 'Knewave'`;
                ctx.fillStyle = '#ff0000';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                ctx.strokeText(this.displayText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
                ctx.fillText(this.displayText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
                
                this.displayTextAlpha -= 0.01;
                this.displayTextScale = Math.max(1, this.displayTextScale - 0.02);
                ctx.restore();
            }
        }
        
        ctx.restore();
    }

    drawStartScreen() {
        // Update flashing effect
        this.startScreenAlpha += 0.02 * this.startScreenDirection;
        if (this.startScreenAlpha >= 1) {
            this.startScreenDirection = -1;
        } else if (this.startScreenAlpha <= 0.2) {
            this.startScreenDirection = 1;
        }

        // Draw title
        ctx.font = "120px 'Knewave'";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw shadow
        ctx.fillStyle = '#000000';
        ctx.fillText('FIGHT', CANVAS_WIDTH / 2 + 4, CANVAS_HEIGHT / 3 - 16);
        
        // Draw gradient text
        const gradient = ctx.createLinearGradient(
            0, CANVAS_HEIGHT / 3 - 70,
            0, CANVAS_HEIGHT / 3 + 30
        );
        gradient.addColorStop(0, '#FFA500');  // Orange
        gradient.addColorStop(1, '#FFD700');  // Golden yellow
        ctx.fillStyle = gradient;
        ctx.fillText('FIGHT', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 3 - 20);

        if (!this.modeSelection) {
            // Draw "Press any key to start"
            ctx.font = "36px 'Knewave'";
            ctx.globalAlpha = this.startScreenAlpha;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText('Press any key to start', CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.6);
            ctx.globalAlpha = 1;
        } else if (!this.nameInput) {
            // Draw mode selection buttons
            const buttonWidth = 300;
            const buttonHeight = 60;
            const buttonSpacing = 20;
            const startY = CANVAS_HEIGHT * 0.6;
            
            // Single Player button
            ctx.fillStyle = this.hoveredButton === 'single' ? '#45a049' : '#4CAF50';
            this.drawButton('SINGLE PLAYER', CANVAS_WIDTH / 2, startY, buttonWidth, buttonHeight);
            
            // Two Players button
            ctx.fillStyle = this.hoveredButton === 'multi' ? '#45a049' : '#4CAF50';
            this.drawButton('TWO PLAYERS', CANVAS_WIDTH / 2, startY + buttonHeight + buttonSpacing, buttonWidth, buttonHeight);
        } else {
            // Draw name input interface
            const inputWidth = 280;
            const inputHeight = 40;
            const spacing = 15;

            // Position elements at fixed percentages of canvas height
            const titleY = CANVAS_HEIGHT * 0.45;  // Moved down from 0.35
            const player1Y = CANVAS_HEIGHT * 0.55; // Moved down from 0.45
            const player2Y = CANVAS_HEIGHT * 0.65; // Moved down from 0.55
            const startButtonY = CANVAS_HEIGHT * 0.75; // Moved down from 0.65
            const backButtonY = CANVAS_HEIGHT * 0.85; // Moved down from 0.75

            // Title
            ctx.font = "32px 'Knewave'";
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(this.isSinglePlayer ? 'Enter Your Name:' : 'Enter Player Names:', CANVAS_WIDTH / 2, titleY);

            // Player 1 input
            this.drawInputField('Player 1', this.player1Input, CANVAS_WIDTH / 2, player1Y, inputWidth, inputHeight, this.activeInput === 'player1');

            // Player 2 input (only in multiplayer)
            if (!this.isSinglePlayer) {
                this.drawInputField('Player 2', this.player2Input, CANVAS_WIDTH / 2, player2Y, inputWidth, inputHeight, this.activeInput === 'player2');
            }

            // Start button
            ctx.fillStyle = this.startHovered ? '#45a049' : '#4CAF50';
            this.drawButton('START GAME', CANVAS_WIDTH / 2, startButtonY, inputWidth, inputHeight);

            // Back button
            ctx.fillStyle = this.backHovered ? '#666' : '#555';
            this.drawButton('BACK', CANVAS_WIDTH / 2, backButtonY, inputWidth, inputHeight);
        }
    }

    drawButton(text, x, y, width, height) {
        const roundness = 10;
        
        // Draw button background
        ctx.beginPath();
        ctx.moveTo(x - width/2 + roundness, y);
        ctx.lineTo(x + width/2 - roundness, y);
        ctx.quadraticCurveTo(x + width/2, y, x + width/2, y + roundness);
        ctx.lineTo(x + width/2, y + height - roundness);
        ctx.quadraticCurveTo(x + width/2, y + height, x + width/2 - roundness, y + height);
        ctx.lineTo(x - width/2 + roundness, y + height);
        ctx.quadraticCurveTo(x - width/2, y + height, x - width/2, y + height - roundness);
        ctx.lineTo(x - width/2, y + roundness);
        ctx.quadraticCurveTo(x - width/2, y, x - width/2 + roundness, y);
        ctx.fill();
        
        // Draw text
        ctx.font = "24px 'Knewave'";
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y + height/2);
    }

    drawInputField(placeholder, value, x, y, width, height, isActive) {
        // Draw input field background
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = isActive ? '#4CAF50' : '#666666';
        ctx.lineWidth = 3;
        this.drawRoundedRect(x - width/2, y, width, height, 5);
        ctx.stroke();
        ctx.fill();

        // Draw text
        ctx.font = "24px 'Knewave'";
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const text = value || placeholder;
        ctx.fillStyle = value ? '#333333' : '#999999';
        ctx.fillText(text, x - width/2 + 10, y + height/2);

        // Draw cursor if active
        if (isActive) {
            const textWidth = value ? ctx.measureText(value).width : 0;
            if (Math.floor(Date.now() / 500) % 2 === 0) {
                ctx.fillStyle = '#4CAF50';
                ctx.fillRect(x - width/2 + 15 + textWidth, y + 5, 3, height - 10);
            }
        }
    }

    drawRoundedRect(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    handleMouseMove(e) {
        if (!this.modeSelection) return;

        const rect = canvas.getBoundingClientRect();
        const x = screenToGameX(e.clientX);
        const y = screenToGameY(e.clientY);
        
        if (!this.nameInput) {
            const buttonWidth = 300;
            const buttonHeight = 60;
            const buttonSpacing = 20;
            const startY = CANVAS_HEIGHT * 0.6;
            
            // Check single player button
            if (x >= CANVAS_WIDTH/2 - buttonWidth/2 && 
                x <= CANVAS_WIDTH/2 + buttonWidth/2 && 
                y >= startY && 
                y <= startY + buttonHeight) {
                this.hoveredButton = 'single';
            }
            // Check multiplayer button
            else if (x >= CANVAS_WIDTH/2 - buttonWidth/2 && 
                     x <= CANVAS_WIDTH/2 + buttonWidth/2 && 
                     y >= startY + buttonHeight + buttonSpacing && 
                     y <= startY + buttonHeight * 2 + buttonSpacing) {
                this.hoveredButton = 'multi';
            }
            else {
                this.hoveredButton = null;
            }
        } else {
            const inputWidth = 300;
            const inputHeight = 50;
            const spacing = 20;
            let startY = CANVAS_HEIGHT * 0.45; // Match the drawing position

            // Check input fields
            if (x >= CANVAS_WIDTH/2 - inputWidth/2 && 
                x <= CANVAS_WIDTH/2 + inputWidth/2) {
                
                if (y >= startY && y <= startY + inputHeight) {
                    canvas.style.cursor = 'text';
                    return;
                }
                
                if (!this.isSinglePlayer && 
                    y >= startY + inputHeight + spacing && 
                    y <= startY + inputHeight * 2 + spacing) {
                    canvas.style.cursor = 'text';
                    return;
                }

                // Calculate button positions based on mode
                const buttonY = this.isSinglePlayer ? 
                    startY + inputHeight + spacing * 3 :
                    startY + inputHeight * 2 + spacing * 5;
                
                // Check start button
                if (y >= buttonY && y <= buttonY + inputHeight) {
                    this.startHovered = true;
                    this.backHovered = false;
                    canvas.style.cursor = 'pointer';
                    return;
                }

                // Check back button
                if (y >= buttonY + inputHeight + spacing && 
                    y <= buttonY + inputHeight * 2 + spacing) {
                    this.backHovered = true;
                    this.startHovered = false;
                    canvas.style.cursor = 'pointer';
                    return;
                }
            }

            this.startHovered = false;
            this.backHovered = false;
            canvas.style.cursor = 'default';
        }
    }

    handleClick(e) {
        if (!this.modeSelection) return;

        const rect = canvas.getBoundingClientRect();
        const x = screenToGameX(e.clientX);
        const y = screenToGameY(e.clientY);
        
        if (!this.nameInput) {
            const buttonWidth = 300;
            const buttonHeight = 60;
            const buttonSpacing = 20;
            const startY = CANVAS_HEIGHT * 0.6;
            
            // Check single player button
            if (x >= CANVAS_WIDTH/2 - buttonWidth/2 && 
                x <= CANVAS_WIDTH/2 + buttonWidth/2 && 
                y >= startY && 
                y <= startY + buttonHeight) {
                this.nameInput = true;
                this.isSinglePlayer = true;
                this.activeInput = 'player1';
                this.hoveredButton = null;
            }
            // Check multiplayer button
            else if (x >= CANVAS_WIDTH/2 - buttonWidth/2 && 
                     x <= CANVAS_WIDTH/2 + buttonWidth/2 && 
                     y >= startY + buttonHeight + buttonSpacing && 
                     y <= startY + buttonHeight * 2 + buttonSpacing) {
                this.nameInput = true;
                this.isSinglePlayer = false;
                this.activeInput = 'player1';
                this.hoveredButton = null;
            }
        } else {
            const inputWidth = 280;
            const inputHeight = 40;
            
            // Position elements at fixed percentages of canvas height
            const titleY = CANVAS_HEIGHT * 0.45;  // Moved down from 0.35
            const player1Y = CANVAS_HEIGHT * 0.55; // Moved down from 0.45
            const player2Y = CANVAS_HEIGHT * 0.65; // Moved down from 0.55
            const startButtonY = CANVAS_HEIGHT * 0.75; // Moved down from 0.65
            const backButtonY = CANVAS_HEIGHT * 0.85; // Moved down from 0.75

            // Check input fields
            if (x >= CANVAS_WIDTH/2 - inputWidth/2 && 
                x <= CANVAS_WIDTH/2 + inputWidth/2) {
                
                if (y >= player1Y && y <= player1Y + inputHeight) {
                    this.activeInput = 'player1';
                    return;
                }
                
                if (!this.isSinglePlayer && 
                    y >= player2Y && y <= player2Y + inputHeight) {
                    this.activeInput = 'player2';
                    return;
                }

                // Check start button
                if (y >= startButtonY && y <= startButtonY + inputHeight) {
                    this.startGame(this.isSinglePlayer);
                    return;
                }

                // Check back button
                if (y >= backButtonY && y <= backButtonY + inputHeight) {
                    // Reset name input state
                    this.nameInput = false;
                    this.player1Input = "";
                    this.player2Input = "";
                    this.activeInput = null;
                    return;
                }
            }
        }
    }

    drawHealthBars() {
        const barWidth = 200;
        const barHeight = 30;
        const margin = 20;
        const nameMargin = 5;

        // Set up text style
        ctx.font = "20px 'Knewave'";
        ctx.textBaseline = 'top';
        
        // Player 1 (Left) health bar
        ctx.fillStyle = 'black';
        ctx.fillRect(margin - 2, margin - 2, barWidth + 4, barHeight + 4);
        ctx.fillStyle = 'red';
        ctx.fillRect(margin, margin, barWidth, barHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(margin, margin, (barWidth * this.player1.health) / 100, barHeight);
        
        // Player 1 name
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.fillText(this.player1Name, margin, margin + barHeight + nameMargin);
        
        // Player 2 (Right) health bar
        ctx.fillStyle = 'black';
        ctx.fillRect(CANVAS_WIDTH - margin - barWidth - 2, margin - 2, barWidth + 4, barHeight + 4);
        ctx.fillStyle = 'red';
        ctx.fillRect(CANVAS_WIDTH - margin - barWidth, margin, barWidth, barHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(CANVAS_WIDTH - margin - barWidth, margin, (barWidth * this.player2.health) / 100, barHeight);
        
        // Player 2 name
        ctx.fillStyle = 'white';
        ctx.textAlign = 'right';
        ctx.fillText(this.player2Name, CANVAS_WIDTH - margin, margin + barHeight + nameMargin);
    }

    drawGameInfo() {
        // Set up text style
        ctx.font = "24px 'Knewave'";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Draw round number with shadow
        const roundText = `Round ${this.round}`;
        ctx.fillStyle = 'black';
        ctx.fillText(roundText, CANVAS_WIDTH / 2 + 2, 22);
        ctx.fillStyle = 'white';
        ctx.fillText(roundText, CANVAS_WIDTH / 2, 20);

        // Draw score with shadow
        const scoreText = `${this.player1Wins} - ${this.player2Wins}`;
        ctx.fillStyle = 'black';
        ctx.fillText(scoreText, CANVAS_WIDTH / 2 + 2, 52);
        ctx.fillStyle = 'white';
        ctx.fillText(scoreText, CANVAS_WIDTH / 2, 50);
    }
}

// Create game instance
const game = new Game();

function gameLoop() {
    game.update();
    game.draw();
    requestAnimationFrame(gameLoop);
}

gameLoop(); 