// Constants and Variables
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('nextPiece');
const nextPieceCtx = nextPieceCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const levelElement = document.getElementById('level');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const soundBtn = document.getElementById('soundBtn');
const volumeSlider = document.getElementById('volumeSlider');

// Nút mini cho mobile
const startBtnMini = document.getElementById('startBtnMini');
const pauseBtnMini = document.getElementById('pauseBtnMini');

// Mobile control buttons
const rotateBtn = document.getElementById('rotateBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const dropBtn = document.getElementById('dropBtn');
const hardDropBtn = document.getElementById('hardDropBtn');

// Audio elements
const bgMusic = document.getElementById('bgMusic');
const clearSound = document.getElementById('clearSound');
const moveSound = document.getElementById('moveSound');
const rotateSound = document.getElementById('rotateSound');
const dropSound = document.getElementById('dropSound');
const gameOverSound = document.getElementById('gameOverSound');
const levelUpSound = document.getElementById('levelUpSound');

// Sound settings
let soundEnabled = true;
let volume = 0.7; // Mặc định 70%

// Thiết lập âm lượng ban đầu cho tất cả âm thanh
function setAllVolumes(vol) {
    bgMusic.volume = vol;
    clearSound.volume = vol;
    moveSound.volume = vol * 0.6; // Giảm âm lượng cho âm thanh di chuyển
    rotateSound.volume = vol * 0.6; // Giảm âm lượng cho âm thanh xoay
    dropSound.volume = vol * 0.8;
    gameOverSound.volume = vol;
    levelUpSound.volume = vol;
}

// Áp dụng âm lượng ban đầu
setAllVolumes(volume);

const BLOCK_SIZE = 30;
const BOARD_WIDTH = 12;
const BOARD_HEIGHT = 20;
const COLORS = [
    null,
    '#FF0D72', // I
    '#0DC2FF', // J
    '#0DFF72', // L
    '#F538FF', // O
    '#FF8E0D', // S
    '#FFE138', // T
    '#3877FF'  // Z
];

// Game variables
let board = [];
let score = 0;
let lines = 0;
let level = 1;
let gameOver = false;
let isPaused = false;
let dropCounter = 0;
let dropInterval = 1000; // milliseconds
let lastTime = 0;
let player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0
};
let nextPiece = null;
let animationId = null;

// Tetromino shapes
const PIECES = [
    // I
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    // J
    [
        [2, 0, 0],
        [2, 2, 2],
        [0, 0, 0]
    ],
    // L
    [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0]
    ],
    // O
    [
        [4, 4],
        [4, 4]
    ],
    // S
    [
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0]
    ],
    // T
    [
        [0, 6, 0],
        [6, 6, 6],
        [0, 0, 0]
    ],
    // Z
    [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0]
    ]
];

// Functions
function createMatrix(width, height) {
    const matrix = [];
    while (height--) {
        matrix.push(new Array(width).fill(0));
    }
    return matrix;
}

function createPiece() {
    return PIECES[Math.floor(Math.random() * PIECES.length)];
}

function drawMatrix(matrix, offset, context = ctx) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                // Vẽ khối chính
                context.fillStyle = COLORS[value];
                context.fillRect(
                    (offset.x + x) * BLOCK_SIZE,
                    (offset.y + y) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
                
                // Viền ngoài
                context.strokeStyle = '#000';
                context.lineWidth = 2;
                context.strokeRect(
                    (offset.x + x) * BLOCK_SIZE,
                    (offset.y + y) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
                
                // Hiệu ứng sáng (phần trên và trái)
                context.fillStyle = 'rgba(255, 255, 255, 0.3)';
                context.beginPath();
                context.moveTo((offset.x + x) * BLOCK_SIZE, (offset.y + y) * BLOCK_SIZE);
                context.lineTo((offset.x + x + 1) * BLOCK_SIZE, (offset.y + y) * BLOCK_SIZE);
                context.lineTo((offset.x + x) * BLOCK_SIZE, (offset.y + y + 1) * BLOCK_SIZE);
                context.fill();
                
                // Hiệu ứng tối (phần dưới và phải)
                context.fillStyle = 'rgba(0, 0, 0, 0.1)';
                context.beginPath();
                context.moveTo((offset.x + x + 1) * BLOCK_SIZE, (offset.y + y) * BLOCK_SIZE);
                context.lineTo((offset.x + x + 1) * BLOCK_SIZE, (offset.y + y + 1) * BLOCK_SIZE);
                context.lineTo((offset.x + x) * BLOCK_SIZE, (offset.y + y + 1) * BLOCK_SIZE);
                context.fill();
            }
        });
    });
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawMatrix(board, {x: 0, y: 0});
    drawMatrix(player.matrix, player.pos);
    
    // Draw next piece - bỏ background đen
    nextPieceCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    
    if (nextPiece) {
        const offset = {
            x: (nextPieceCanvas.width / BLOCK_SIZE - nextPiece[0].length) / 2,
            y: (nextPieceCanvas.height / BLOCK_SIZE - nextPiece.length) / 2
        };
        drawMatrix(nextPiece, offset, nextPieceCtx);
    }
}

function merge(board, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, direction) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x]
            ] = [
                matrix[y][x],
                matrix[x][y]
            ];
        }
    }
    
    if (direction > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerRotate(direction) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, direction);
    
    while (collide(board, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -direction);
            player.pos.x = pos;
            return;
        }
    }
    
    // Play rotate sound
    playSound(rotateSound);
}

function collide(board, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (board[y + o.y] &&
                board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function playerDrop() {
    player.pos.y++;
    if (collide(board, player)) {
        player.pos.y--;
        merge(board, player);
        playerReset();
        arenaSweep();
        updateScore();
        
        // Play drop sound
        playSound(dropSound);
    }
    dropCounter = 0;
}

function playerHardDrop() {
    while (!collide(board, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(board, player);
    playerReset();
    arenaSweep();
    updateScore();
    dropCounter = 0;
    
    // Play drop sound
    playSound(dropSound);
}

function playerMove(direction) {
    player.pos.x += direction;
    if (collide(board, player)) {
        player.pos.x -= direction;
    } else {
        // Play move sound
        playSound(moveSound);
    }
}

function playerReset() {
    if (!nextPiece) {
        nextPiece = createPiece();
    }
    
    player.matrix = nextPiece;
    nextPiece = createPiece();
    
    // Position new piece at top center
    player.pos.y = 0;
    player.pos.x = Math.floor((board[0].length - player.matrix[0].length) / 2);
    
    // Check if game over
    if (collide(board, player)) {
        gameOver = true;
        cancelAnimationFrame(animationId);
        drawGameOver();
        
        // Play game over sound and stop background music
        bgMusic.pause();
        playSound(gameOverSound);
    }
}

function arenaSweep() {
    let rowCount = 0;
    outer: for (let y = board.length - 1; y >= 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;
        rowCount++;
    }
    
    if (rowCount > 0) {
        // Tính điểm dựa trên số dòng và level hiện tại
        const linePoints = [0, 40, 100, 300, 1200]; // 0, 1, 2, 3, 4 dòng
        score += linePoints[rowCount] * level;
        lines += rowCount;
        
        // Play clear sound
        playSound(clearSound);
        
        // Tăng level sau mỗi 10 dòng
        const oldLevel = level;
        level = Math.floor(lines / 10) + 1;
        
        // Giới hạn level tối đa là 10
        if (level > 10) level = 10;
        
        // Nếu level tăng, giảm thời gian rơi (tăng tốc độ)
        if (oldLevel !== level) {
            dropInterval = 1000 - (level - 1) * 100;
            if (dropInterval < 100) {
                dropInterval = 100;
            }
            
            // Play level up sound
            playSound(levelUpSound);
        }
    }
}

function updateScore() {
    scoreElement.textContent = score;
    linesElement.textContent = lines;
    levelElement.textContent = level;
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = '20px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 30);
}

function update(time = 0) {
    if (gameOver || isPaused) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    
    draw();
    animationId = requestAnimationFrame(update);
}

function resetGame() {
    board = createMatrix(BOARD_WIDTH, BOARD_HEIGHT);
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    gameOver = false;
    isPaused = false;
    nextPiece = null;
    updateScore();
    
    playerReset();
    
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Chỉ vẽ ban đầu, không bắt đầu game ngay
    draw();
    
    // Stop background music
    bgMusic.pause();
    bgMusic.currentTime = 0;
}

function togglePause() {
    if (gameOver) return;
    
    isPaused = !isPaused;
    if (!isPaused) {
        lastTime = performance.now();
        update();
        
        // Resume background music if sound is enabled
        if (soundEnabled) {
            bgMusic.play().catch(e => console.log("Music resume error:", e));
        }
    } else {
        cancelAnimationFrame(animationId);
        
        // Draw pause text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.font = '20px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        
        // Pause background music
        bgMusic.pause();
    }
}

// Functions for sound
function playSound(sound) {
    if (soundEnabled) {
        // Dừng và chạy lại từ đầu
        sound.pause();
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Audio playback error:", e));
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    
    if (soundEnabled) {
        soundBtn.textContent = "🔊 Sound: ON";
        soundBtn.classList.remove('muted');
        
        // Nếu game đang chạy và không bị tạm dừng, phát nhạc nền
        if (animationId && !isPaused && !gameOver) {
            bgMusic.play().catch(e => console.log("Music playback error:", e));
        }
    } else {
        soundBtn.textContent = "🔇 Sound: OFF";
        soundBtn.classList.add('muted');
        bgMusic.pause();
    }
}

function changeVolume(e) {
    volume = e.target.value / 100;
    setAllVolumes(volume);
    
    // Lưu trạng thái âm lượng vào localStorage
    localStorage.setItem('tetrisVolume', volume);
    
    // Nếu âm lượng được đặt về 0, tắt âm thanh
    if (volume === 0 && soundEnabled) {
        toggleSound();
    }
    // Nếu âm lượng tăng từ 0 và âm thanh đang tắt, bật âm thanh
    else if (volume > 0 && !soundEnabled) {
        toggleSound();
    }
}

// Mobile Touch Controls
function setupMobileControls() {
    // Ngăn chặn toàn bộ hành vi vuốt màn hình trong khi chơi
    document.addEventListener('touchmove', function(e) {
        if (animationId && !isPaused && !gameOver) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Ngăn chặn zoom trên thiết bị di động
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1 && animationId && !isPaused) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Support both click and touch events
    function setupButton(button, action, isHoldable = false) {
        // Tốc độ lặp lại cho các nút được giữ
        const initialDelay = 200; // Độ trễ ban đầu (ms)
        const repeatInterval = 80; // Khoảng thời gian lặp lại (ms)
        
        // Theo dõi trạng thái nút
        let isPressed = false;
        let intervalId = null;
        let timeoutId = null;
        
        // Hàm xử lý khi bắt đầu nhấn
        const startAction = (e) => {
            if (e && e.preventDefault) e.preventDefault();
            if (isPressed || gameOver || isPaused) return;
            
            isPressed = true;
            button.classList.add('active');
            
            // Thực hiện hành động ngay lập tức
            action();
            
            // Nếu là nút có thể giữ, thiết lập độ trễ và lặp
            if (isHoldable) {
                clearTimeout(timeoutId);
                clearInterval(intervalId);
                
                // Thiết lập độ trễ ban đầu trước khi lặp lại
                timeoutId = setTimeout(() => {
                    intervalId = setInterval(action, repeatInterval);
                }, initialDelay);
            }
        };
        
        // Hàm xử lý khi kết thúc nhấn
        const endAction = (e) => {
            if (e && e.preventDefault && e.cancelable) e.preventDefault();
            if (!isPressed) return;
            
            isPressed = false;
            button.classList.remove('active');
            
            // Xóa các hẹn giờ
            clearTimeout(timeoutId);
            clearInterval(intervalId);
            timeoutId = null;
            intervalId = null;
        };
        
        // Đăng ký sự kiện cảm ứng và chuột
        button.addEventListener('touchstart', startAction, { passive: false });
        button.addEventListener('mousedown', startAction);
        
        button.addEventListener('touchend', endAction);
        button.addEventListener('touchcancel', endAction);
        button.addEventListener('mouseup', endAction);
        button.addEventListener('mouseleave', endAction);
        
        // Đảm bảo nút không giữ trạng thái khi game tạm dừng hoặc kết thúc
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) endAction();
        });
    }
    
    // Set up all control buttons
    setupButton(rotateBtn, () => {
        if (!gameOver && !isPaused) {
            playerRotate(1);
            playSound(rotateSound);
        }
    });
    
    setupButton(leftBtn, () => {
        if (!gameOver && !isPaused) playerMove(-1);
    }, true);
    
    setupButton(rightBtn, () => {
        if (!gameOver && !isPaused) playerMove(1);
    }, true);
    
    setupButton(dropBtn, () => {
        if (!gameOver && !isPaused) playerDrop();
    }, true);
    
    setupButton(hardDropBtn, () => {
        if (!gameOver && !isPaused) playerHardDrop();
    });
    
    // Thiết lập sự kiện vuốt màn hình cho canvas
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    let isSwipingDown = false; // Biến theo dõi vuốt xuống
    let downIntervalId = null; // ID của interval cho di chuyển xuống liên tục
    
    canvas.addEventListener('touchstart', (e) => {
        if (gameOver || isPaused) return;
        
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = true;
        isSwipingDown = false; // Reset trạng thái vuốt xuống
        
        // Xóa interval trước đó nếu có
        if (downIntervalId) {
            clearInterval(downIntervalId);
            downIntervalId = null;
        }
    });
    
    canvas.addEventListener('touchmove', (e) => {
        if (!isSwiping || gameOver || isPaused) return;
        
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        
        const diffX = touchX - touchStartX;
        const diffY = touchY - touchStartY;
        
        // Ngưỡng để xác định vuốt
        const threshold = 30;
        
        // Nếu vuốt ngang đủ xa
        if (Math.abs(diffX) > threshold && Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0) {
                playerMove(1); // Vuốt phải
            } else {
                playerMove(-1); // Vuốt trái
            }
            // Đặt lại điểm bắt đầu để tránh kích hoạt nhiều lần
            touchStartX = touchX;
            touchStartY = touchY;
        }
        // Nếu vuốt xuống đủ xa
        else if (diffY > threshold && Math.abs(diffY) > Math.abs(diffX)) {
            // Vuốt xuống - thực hiện ngay lập tức
            playerDrop();
            touchStartY = touchY;
            
            // Nếu chưa đang vuốt xuống liên tục, bắt đầu
            if (!isSwipingDown) {
                isSwipingDown = true;
                
                // Thiết lập interval để tiếp tục thả xuống mỗi 100ms khi người dùng giữ vuốt xuống
                downIntervalId = setInterval(() => {
                    if (!gameOver && !isPaused) {
                        playerDrop();
                    } else {
                        // Dừng interval nếu game over hoặc pause
                        clearInterval(downIntervalId);
                        downIntervalId = null;
                    }
                }, 100);
            }
        }
        // Nếu vuốt lên đủ xa
        else if (diffY < -threshold && Math.abs(diffY) > Math.abs(diffX)) {
            playerRotate(1); // Vuốt lên = xoay
            touchStartY = touchY;
            
            // Dừng vuốt xuống liên tục nếu đang diễn ra
            if (isSwipingDown) {
                isSwipingDown = false;
                clearInterval(downIntervalId);
                downIntervalId = null;
            }
        }
    });
    
    canvas.addEventListener('touchend', () => {
        isSwiping = false;
        
        // Dừng vuốt xuống liên tục khi nhấc tay
        if (isSwipingDown) {
            isSwipingDown = false;
            clearInterval(downIntervalId);
            downIntervalId = null;
        }
    });
    
    canvas.addEventListener('touchcancel', () => {
        isSwiping = false;
        
        // Dừng vuốt xuống liên tục khi sự kiện bị hủy
        if (isSwipingDown) {
            isSwipingDown = false;
            clearInterval(downIntervalId);
            downIntervalId = null;
        }
    });
    
    // Nhấn đúp để thả nhanh
    let lastTap = 0;
    canvas.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 300 && tapLength > 0) {
            // Nhấn đúp được phát hiện
            playerHardDrop();
            e.preventDefault();
        }
        
        lastTap = currentTime;
    });
}

// Event listeners
document.addEventListener('keydown', event => {
    if (gameOver) return;
    
    if (event.key === 'ArrowLeft') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight') {
        playerMove(1);
    } else if (event.key === 'ArrowDown') {
        playerDrop();
    } else if (event.key === 'ArrowUp') {
        playerRotate(1);
    } else if (event.key === ' ') {
        event.preventDefault();
        playerHardDrop();
    } else if (event.key === 'p' || event.key === 'P') {
        togglePause();
    } else if (event.key === 'm' || event.key === 'M') {
        toggleSound();
    }
});

// Sự kiện cho nút chính
startBtn.addEventListener('click', () => {
    if (gameOver) {
        resetGame();
        // Bắt đầu game ngay sau khi reset
        lastTime = performance.now();
        isPaused = false;
        update();
        pauseBtn.style.display = 'block';
        pauseBtnMini.textContent = '⏸';
        
        // Start background music if sound is enabled
        if (soundEnabled) {
            bgMusic.play().catch(e => console.log("Music start error:", e));
        }
    } else if (isPaused) {
        togglePause();
        pauseBtnMini.textContent = '⏸';
    } else if (!animationId) {
        // Bắt đầu game khi ấn nút Start
        lastTime = performance.now();
        isPaused = false;
        update();
        // Hiển thị nút Pause khi game bắt đầu
        pauseBtn.style.display = 'block';
        pauseBtnMini.textContent = '⏸';
        
        // Start background music if sound is enabled
        if (soundEnabled) {
            bgMusic.play().catch(e => console.log("Music start error:", e));
        }
    }
});

pauseBtn.addEventListener('click', () => {
    if (!gameOver && animationId) {
        togglePause();
        // Cập nhật text của nút pause
        pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
        pauseBtnMini.textContent = isPaused ? '▶' : '⏸';
    }
});

// Sự kiện cho nút mini
startBtnMini.addEventListener('click', () => {
    if (gameOver) {
        resetGame();
        // Bắt đầu game ngay sau khi reset
        lastTime = performance.now();
        isPaused = false;
        update();
        pauseBtn.style.display = 'block';
        pauseBtnMini.textContent = '⏸';
        
        // Start background music if sound is enabled
        if (soundEnabled) {
            bgMusic.play().catch(e => console.log("Music start error:", e));
        }
    } else if (isPaused) {
        togglePause();
        pauseBtnMini.textContent = '⏸';
        pauseBtn.textContent = 'Pause';
    } else if (!animationId) {
        // Bắt đầu game khi ấn nút Start
        lastTime = performance.now();
        isPaused = false;
        update();
        // Hiển thị nút Pause khi game bắt đầu
        pauseBtn.style.display = 'block';
        pauseBtnMini.textContent = '⏸';
        
        // Start background music if sound is enabled
        if (soundEnabled) {
            bgMusic.play().catch(e => console.log("Music start error:", e));
        }
    }
});

pauseBtnMini.addEventListener('click', () => {
    if (!gameOver && animationId) {
        togglePause();
        // Cập nhật text của nút pause
        pauseBtnMini.textContent = isPaused ? '▶' : '⏸';
        pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
    }
});

resetBtn.addEventListener('click', resetGame);

soundBtn.addEventListener('click', toggleSound);

volumeSlider.addEventListener('change', changeVolume);

// Load âm lượng đã lưu từ localStorage
function loadVolumePreference() {
    const savedVolume = localStorage.getItem('tetrisVolume');
    if (savedVolume !== null) {
        volume = parseFloat(savedVolume);
        volumeSlider.value = volume * 100;
        setAllVolumes(volume);
    }
}

// Initialize game
function initGame() {
    board = createMatrix(BOARD_WIDTH, BOARD_HEIGHT);
    playerReset();
    updateScore();
    // Chỉ vẽ ban đầu, không bắt đầu game ngay
    draw();
    
    // Hiển thị thông báo "Press Start"
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = '20px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS START', canvas.width / 2, canvas.height / 2);
    
    // Ẩn nút Pause khi mới vào game
    pauseBtn.style.display = 'none';
    
    // Reset game state
    gameOver = false;
    isPaused = false;
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    animationId = null;
    updateScore();
    
    // Phát nhạc nền ngay khi trang web được mở
    if (soundEnabled) {
        playBackgroundMusic();
    }
}

// Hàm phát nhạc nền riêng biệt
function playBackgroundMusic() {
    // Thử phát nhạc và xử lý lỗi nếu có
    const playPromise = bgMusic.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            // Phát tự động bị chặn bởi trình duyệt
            console.log("Auto-play prevented by browser:", error);
            
            // Thêm thông báo để người dùng biết
            const audioNotice = document.createElement('div');
            audioNotice.className = 'audio-notice';
            audioNotice.innerHTML = 'Click anywhere to enable music';
            document.body.appendChild(audioNotice);
            
            // Thêm sự kiện click vào document để bật nhạc
            const enableAudio = () => {
                bgMusic.play().then(() => {
                    // Sau khi nhạc đã phát, xóa thông báo và bỏ sự kiện
                    document.body.removeChild(audioNotice);
                    document.removeEventListener('click', enableAudio);
                }).catch(e => console.log("Still could not play audio:", e));
            };
            document.addEventListener('click', enableAudio);
        });
    }
}

// Start the game
document.addEventListener('DOMContentLoaded', () => {
    loadVolumePreference();
    initGame();
    setupMobileControls();
    
    // Thêm CSS inline cho thông báo âm thanh
    const style = document.createElement('style');
    style.textContent = `
        .audio-notice {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);
}); 