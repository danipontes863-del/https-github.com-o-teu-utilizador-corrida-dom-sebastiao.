(function () {
    "use strict";

    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d");
    const scoreElement = document.getElementById("score");
    const bestElement = document.getElementById("best-score");
    const startScreen = document.getElementById("start-screen");
    const gameOverScreen = document.getElementById("game-over-screen");
    const finalScoreElement = document.getElementById("final-score");
    const startButton = document.getElementById("start-button");
    const restartButton = document.getElementById("restart-button");
    const historyFactElement = document.getElementById("history-fact");
    const historyCountElement = document.getElementById("history-count");
    const previousFactButton = document.getElementById("previous-fact");
    const nextFactButton = document.getElementById("next-fact");

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const GROUND_Y = 300;
    const PLAYER_X = 142;
    const PLAYER_WIDTH = 38;
    const PLAYER_HEIGHT = 54;
    const GRAVITY = 1850;
    const JUMP_VELOCITY = -680;
    const obstacleTypes = ["sword", "soldier", "horse", "rock"];
    const historyFacts = [
        "D. Sebastião nasceu a 20 de janeiro de 1554, em Lisboa.",
        "Era filho do príncipe D. João e de Joana de Áustria.",
        "Tornou-se rei em 1557, depois da morte do seu avô, D. João III.",
        "Ficou conhecido como «O Desejado», porque era muito esperado pelo povo português.",
        "Era muito religioso e acreditava que devia defender o cristianismo.",
        "Gostava de aventuras militares e queria conquistar terras em África.",
        "Em 1578, levou um exército português para combater em Marrocos.",
        "A batalha de Alcácer-Quibir aconteceu a 4 de agosto de 1578.",
        "Os portugueses sofreram uma grande derrota e perderam muitos soldados.",
        "D. Sebastião desapareceu durante a batalha, sem deixar certezas sobre o seu destino.",
        "Como não tinha filhos, a sua morte provocou uma crise na sucessão ao trono.",
        "O seu desaparecimento deu origem ao Sebastianismo, a crença de que um dia regressaria para salvar Portugal."
    ];

    let state = "ready";
    let score = 0;
    let bestScore = loadBestScore();
    let elapsed = 0;
    let speed = 330;
    let spawnDistance = 400;
    let worldOffset = 0;
    let previousTime = 0;
    let historyIndex = 0;
    let historyTimer = 0;
    let animationFrame = 0;
    let obstacles = [];
    let particles = [];
    const pressedKeys = new Set();
    let player = { x: PLAYER_X, y: GROUND_Y - PLAYER_HEIGHT, velocityY: 0, jumping: false, crouching: false };

    bestElement.textContent = formatScore(bestScore);
    showHistoryFact(0);

    function loadBestScore() {
        try {
            return Number(window.localStorage.getItem("sebastiao-best-score")) || 0;
        } catch (error) {
            console.warn("Não foi possível ler o recorde guardado.", error);
            return 0;
        }
    }

    function saveBestScore(value) {
        try {
            window.localStorage.setItem("sebastiao-best-score", String(value));
        } catch (error) {
            console.warn("Não foi possível guardar o recorde.", error);
        }
    }

    function formatScore(value) {
        return String(value).padStart(5, "0");
    }

    function showHistoryFact(index) {
        historyIndex = (index + historyFacts.length) % historyFacts.length;
        historyFactElement.textContent = historyFacts[historyIndex];
        historyCountElement.textContent =
            String(historyIndex + 1).padStart(2, "0") + " / " + String(historyFacts.length).padStart(2, "0");
        historyTimer = 0;
    }

    function startGame() {
        state = "running";
        score = 0;
        elapsed = 0;
        speed = 330;
        spawnDistance = 400;
        worldOffset = 0;
        obstacles = [];
        particles = [];
        player = { x: PLAYER_X, y: GROUND_Y - PLAYER_HEIGHT, velocityY: 0, jumping: false, crouching: false };
        pressedKeys.clear();
        showHistoryFact(0);
        scoreElement.textContent = formatScore(0);
        startScreen.hidden = true;
        gameOverScreen.hidden = true;
        previousTime = performance.now();
    }

    function finishGame() {
        state = "over";
        finalScoreElement.textContent = formatScore(score);
        gameOverScreen.hidden = false;
        if (score > bestScore) {
            bestScore = score;
            bestElement.textContent = formatScore(bestScore);
            saveBestScore(bestScore);
        }
    }

    function jump() {
        if (state !== "running" || player.jumping) {
            return;
        }
        player.velocityY = JUMP_VELOCITY;
        player.jumping = true;
        for (let i = 0; i < 5; i += 1) {
            particles.push({
                x: player.x + 16 + Math.random() * 12,
                y: GROUND_Y - 3,
                vx: -35 - Math.random() * 70,
                vy: -25 - Math.random() * 55,
                life: .35 + Math.random() * .25
            });
        }
    }

    function handleAction(event) {
        if (event) {
            event.preventDefault();
        }
        if (state === "ready" || state === "over") {
            startGame();
        } else {
            jump();
        }
    }

    function update(delta) {
        elapsed += delta;
        score = Math.floor(elapsed * 10);
        speed = Math.min(650, 330 + elapsed * 8);
        worldOffset += speed * delta;
        scoreElement.textContent = formatScore(score);

        historyTimer += delta;
        if (historyTimer >= 4.5) {
            showHistoryFact(historyIndex + 1);
        }

        const horizontalDirection = Number(pressedKeys.has("KeyD")) - Number(pressedKeys.has("KeyA"));
        player.x = Math.max(44, Math.min(WIDTH - PLAYER_WIDTH - 44, player.x + horizontalDirection * 300 * delta));
        player.crouching = pressedKeys.has("KeyS") && !player.jumping;

        if (player.jumping) {
            player.velocityY += (pressedKeys.has("KeyS") ? GRAVITY * 2.2 : GRAVITY) * delta;
            player.y += player.velocityY * delta;
            if (player.y >= GROUND_Y - PLAYER_HEIGHT) {
                player.y = GROUND_Y - PLAYER_HEIGHT;
                player.velocityY = 0;
                player.jumping = false;
            }
        }

        spawnDistance -= speed * delta;
        if (spawnDistance <= 0) {
            spawnObstacle();
        }

        obstacles.forEach(function (obstacle) {
            obstacle.x -= speed * delta;
        });
        obstacles = obstacles.filter(function (obstacle) {
            return obstacle.x + obstacle.width > -10;
        });

        particles.forEach(function (particle) {
            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;
            particle.vy += 170 * delta;
            particle.life -= delta;
        });
        particles = particles.filter(function (particle) {
            return particle.life > 0;
        });

        if (obstacles.some(collidesWithPlayer)) {
            finishGame();
        }
    }

    function spawnObstacle() {
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const dimensions = {
            sword: { width: 24, height: 43 },
            soldier: { width: 35, height: 49 },
            horse: { width: 62, height: 41 },
            rock: { width: 38, height: 28 }
        }[type];
        obstacles.push({
            type: type,
            x: WIDTH + 20,
            width: dimensions.width,
            height: dimensions.height
        });
        spawnDistance = 385 + Math.random() * 190 + Math.min(elapsed * 5, 95);
    }

    function collidesWithPlayer(obstacle) {
        const playerBox = {
            left: player.x + 7,
            right: player.x + PLAYER_WIDTH - 5,
            top: player.crouching ? GROUND_Y - 31 : player.y + 5,
            bottom: player.y + PLAYER_HEIGHT - 2
        };
        const obstacleBox = {
            left: obstacle.x + 4,
            right: obstacle.x + obstacle.width - 4,
            top: GROUND_Y - obstacle.height + 5,
            bottom: GROUND_Y - 2
        };
        return playerBox.left < obstacleBox.right &&
            playerBox.right > obstacleBox.left &&
            playerBox.top < obstacleBox.bottom &&
            playerBox.bottom > obstacleBox.top;
    }

    function drawBackground() {
        const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        sky.addColorStop(0, "#d99558");
        sky.addColorStop(.58, "#edb66f");
        sky.addColorStop(1, "#d39454");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        ctx.fillStyle = "rgba(255, 224, 161, .42)";
        ctx.beginPath();
        ctx.arc(755, 84, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f5d89d";
        ctx.fillRect(748, 77, 14, 14);

        drawMountains();
        drawDunes();
        drawGround();
        drawBackgroundDetails();
    }

    function drawMountains() {
        const shift = (worldOffset * .12) % 320;
        ctx.fillStyle = "#bd8050";
        for (let i = -1; i < 5; i += 1) {
            const x = i * 320 - shift;
            ctx.beginPath();
            ctx.moveTo(x, 227);
            ctx.lineTo(x + 95, 155);
            ctx.lineTo(x + 142, 189);
            ctx.lineTo(x + 203, 140);
            ctx.lineTo(x + 320, 225);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#d49a5e";
            ctx.fillRect(x + 188, 157, 15, 9);
            ctx.fillRect(x + 203, 166, 16, 8);
            ctx.fillStyle = "#bd8050";
        }
        ctx.fillStyle = "#c98a54";
        ctx.fillRect(0, 220, WIDTH, 26);
    }

    function drawDunes() {
        const shift = (worldOffset * .25) % 440;
        ctx.fillStyle = "#dfa363";
        for (let i = -1; i < 4; i += 1) {
            const x = i * 440 - shift;
            ctx.beginPath();
            ctx.moveTo(x, 267);
            ctx.lineTo(x + 112, 221);
            ctx.lineTo(x + 224, 250);
            ctx.lineTo(x + 345, 214);
            ctx.lineTo(x + 440, 265);
            ctx.lineTo(x + 440, 303);
            ctx.lineTo(x, 303);
            ctx.closePath();
            ctx.fill();
        }
    }

    function drawGround() {
        ctx.fillStyle = "#98603c";
        ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
        ctx.fillStyle = "#6e432e";
        ctx.fillRect(0, GROUND_Y + 7, WIDTH, 4);
        ctx.fillStyle = "#c5854b";
        ctx.fillRect(0, GROUND_Y, WIDTH, 4);

        const shift = worldOffset % 70;
        for (let i = -1; i < 16; i += 1) {
            const x = i * 70 - shift;
            ctx.fillStyle = "#b87945";
            ctx.fillRect(x, GROUND_Y + 19, 22, 3);
            ctx.fillRect(x + 37, GROUND_Y + 35, 12, 3);
            ctx.fillStyle = "#754831";
            ctx.fillRect(x + 12, GROUND_Y + 51, 28, 3);
        }
    }

    function drawBackgroundDetails() {
        const shift = (worldOffset * .55) % 260;
        for (let i = -1; i < 6; i += 1) {
            const x = i * 260 - shift;
            const y = 266 + ((i * 13) % 17);
            ctx.fillStyle = "#956043";
            ctx.fillRect(x + 30, y, 15, 5);
            ctx.fillRect(x + 25, y + 5, 25, 4);
            ctx.fillRect(x + 34, y - 10, 6, 12);
            ctx.fillStyle = "#65804c";
            ctx.fillRect(x + 29, y - 20, 5, 12);
            ctx.fillRect(x + 40, y - 24, 5, 15);
            ctx.fillRect(x + 24, y - 16, 5, 9);
            ctx.fillStyle = "#b57a4d";
            ctx.fillRect(x + 140, y + 11, 12, 4);
            ctx.fillRect(x + 147, y + 7, 8, 4);
        }
    }

    function drawPlayer() {
        const x = Math.round(player.x);
        const y = Math.round(player.y);
        const runningFrame = Math.floor(elapsed * 12) % 2;
        const legA = player.jumping ? 0 : runningFrame * 4;
        const legB = player.jumping ? 0 : (1 - runningFrame) * 4;

        ctx.save();
        if (player.crouching) {
            ctx.translate(0, GROUND_Y);
            ctx.scale(1, .62);
            ctx.translate(0, -GROUND_Y);
        }
        ctx.fillStyle = "rgba(71, 41, 27, .23)";
        ctx.fillRect(x + 4, GROUND_Y - 3, 42, 5);

        // Cape, tunic and boots are composed from pixel-sized rectangles.
        ctx.fillStyle = "#8b302b";
        ctx.fillRect(x + 6, y + 20, 11, 25);
        ctx.fillRect(x + 2, y + 26, 8, 13);
        ctx.fillStyle = "#b34535";
        ctx.fillRect(x + 8, y + 22, 7, 17);
        ctx.fillStyle = "#d2a143";
        ctx.fillRect(x + 13, y + 21, 3, 20);

        ctx.fillStyle = "#1e4e3b";
        ctx.fillRect(x + 13, y + 17, 20, 25);
        ctx.fillRect(x + 9, y + 20, 8, 17);
        ctx.fillRect(x + 28, y + 20, 9, 15);
        ctx.fillStyle = "#286447";
        ctx.fillRect(x + 17, y + 20, 12, 17);
        ctx.fillStyle = "#d0a044";
        ctx.fillRect(x + 15, y + 39, 19, 4);
        ctx.fillRect(x + 23, y + 22, 3, 3);
        ctx.fillRect(x + 23, y + 28, 3, 3);
        ctx.fillRect(x + 23, y + 34, 3, 3);

        ctx.fillStyle = "#e5b582";
        ctx.fillRect(x + 17, y + 6, 15, 14);
        ctx.fillRect(x + 13, y + 10, 4, 8);
        ctx.fillStyle = "#56392f";
        ctx.fillRect(x + 16, y + 4, 17, 5);
        ctx.fillRect(x + 14, y + 8, 4, 8);
        ctx.fillRect(x + 18, y + 18, 12, 3);
        ctx.fillStyle = "#33251f";
        ctx.fillRect(x + 28, y + 11, 3, 3);
        ctx.fillRect(x + 29, y + 16, 5, 2);

        ctx.fillStyle = "#efc35e";
        ctx.fillRect(x + 15, y + 1, 18, 4);
        ctx.fillRect(x + 18, y - 4, 3, 6);
        ctx.fillRect(x + 25, y - 7, 3, 9);
        ctx.fillRect(x + 31, y - 3, 3, 5);
        ctx.fillStyle = "#fff0a7";
        ctx.fillRect(x + 19, y - 3, 2, 2);
        ctx.fillRect(x + 26, y - 6, 2, 2);
        ctx.fillRect(x + 32, y - 2, 2, 2);

        ctx.fillStyle = "#503125";
        ctx.fillRect(x + 17, y + 43, 7, 7 + legA);
        ctx.fillRect(x + 28, y + 43, 7, 7 + legB);
        ctx.fillStyle = "#d7b27c";
        ctx.fillRect(x + 15, y + 49 + legA, 11, 5);
        ctx.fillRect(x + 27, y + 49 + legB, 12, 5);
        ctx.restore();
    }

    function drawObstacle(obstacle) {
        const x = Math.round(obstacle.x);
        const ground = GROUND_Y;
        if (obstacle.type === "sword") {
            ctx.fillStyle = "#554033";
            ctx.fillRect(x + 10, ground - 42, 5, 29);
            ctx.fillRect(x + 8, ground - 43, 9, 4);
            ctx.fillStyle = "#e8d7b8";
            ctx.fillRect(x + 11, ground - 42, 3, 24);
            ctx.fillRect(x + 9, ground - 47, 7, 6);
            ctx.fillStyle = "#8d452d";
            ctx.fillRect(x + 5, ground - 16, 15, 5);
            ctx.fillRect(x + 10, ground - 11, 5, 9);
            ctx.fillStyle = "#d3a054";
            ctx.fillRect(x + 11, ground - 8, 3, 3);
        } else if (obstacle.type === "soldier") {
            ctx.fillStyle = "#46372f";
            ctx.fillRect(x + 7, ground - 24, 22, 22);
            ctx.fillStyle = "#84533b";
            ctx.fillRect(x + 10, ground - 42, 16, 18);
            ctx.fillStyle = "#d0a06a";
            ctx.fillRect(x + 12, ground - 40, 12, 12);
            ctx.fillStyle = "#382a24";
            ctx.fillRect(x + 9, ground - 45, 18, 6);
            ctx.fillRect(x + 12, ground - 49, 12, 5);
            ctx.fillStyle = "#d1b888";
            ctx.fillRect(x + 20, ground - 53, 3, 8);
            ctx.fillStyle = "#d1aa64";
            ctx.fillRect(x + 8, ground - 23, 21, 3);
            ctx.fillRect(x + 12, ground - 2, 6, 2);
            ctx.fillRect(x + 23, ground - 2, 6, 2);
            ctx.fillStyle = "#633b2c";
            ctx.fillRect(x + 31, ground - 43, 3, 43);
            ctx.fillStyle = "#ded0b3";
            ctx.fillRect(x + 28, ground - 49, 9, 7);
        } else if (obstacle.type === "horse") {
            ctx.fillStyle = "#68402d";
            ctx.fillRect(x + 8, ground - 29, 42, 20);
            ctx.fillRect(x + 40, ground - 38, 13, 17);
            ctx.fillRect(x + 47, ground - 42, 12, 10);
            ctx.fillRect(x + 43, ground - 45, 4, 8);
            ctx.fillStyle = "#895439";
            ctx.fillRect(x + 12, ground - 34, 27, 8);
            ctx.fillStyle = "#473026";
            ctx.fillRect(x + 12, ground - 12, 6, 12);
            ctx.fillRect(x + 25, ground - 12, 6, 12);
            ctx.fillRect(x + 42, ground - 16, 6, 16);
            ctx.fillRect(x + 5, ground - 31, 7, 5);
            ctx.fillRect(x + 1, ground - 38, 5, 10);
            ctx.fillStyle = "#e8c987";
            ctx.fillRect(x + 53, ground - 36, 3, 3);
            ctx.fillStyle = "#a37a50";
            ctx.fillRect(x + 15, ground - 9, 6, 3);
            ctx.fillRect(x + 28, ground - 9, 6, 3);
        } else {
            ctx.fillStyle = "#74513a";
            ctx.fillRect(x + 3, ground - 15, 31, 13);
            ctx.fillRect(x + 8, ground - 23, 22, 9);
            ctx.fillRect(x + 15, ground - 28, 11, 7);
            ctx.fillStyle = "#9c7049";
            ctx.fillRect(x + 11, ground - 21, 8, 4);
            ctx.fillRect(x + 20, ground - 26, 5, 4);
            ctx.fillStyle = "#61432f";
            ctx.fillRect(x + 2, ground - 5, 34, 3);
        }
    }

    function drawParticles() {
        particles.forEach(function (particle) {
            ctx.globalAlpha = Math.min(1, particle.life * 2);
            ctx.fillStyle = "#f5d296";
            ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 4, 4);
        });
        ctx.globalAlpha = 1;
    }

    function draw() {
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        drawBackground();
        obstacles.forEach(drawObstacle);
        drawPlayer();
        drawParticles();
        ctx.fillStyle = "rgba(71, 45, 30, .32)";
        ctx.fillRect(0, HEIGHT - 3, WIDTH, 3);
    }

    function loop(timestamp) {
        const delta = previousTime ? Math.min((timestamp - previousTime) / 1000, .035) : 0;
        previousTime = timestamp;
        if (state === "running") {
            update(delta);
        } else {
            elapsed += delta * .25;
            worldOffset += delta * 16;
        }
        draw();
        animationFrame = window.requestAnimationFrame(loop);
    }

    startButton.addEventListener("click", startGame);
    restartButton.addEventListener("click", startGame);
    previousFactButton.addEventListener("click", function () {
        showHistoryFact(historyIndex - 1);
    });
    nextFactButton.addEventListener("click", function () {
        showHistoryFact(historyIndex + 1);
    });
    canvas.addEventListener("pointerdown", function (event) {
        if (event.pointerType === "touch") {
            handleAction(event);
        } else if (state === "running") {
            handleAction(event);
        }
    });

    window.addEventListener("keydown", function (event) {
        if (event.code === "KeyA" || event.code === "KeyD" || event.code === "KeyS") {
            if (state === "running") {
                event.preventDefault();
                pressedKeys.add(event.code);
                if (event.code === "KeyS" && player.jumping) {
                    player.velocityY = Math.max(player.velocityY, 220);
                }
            }
            return;
        }
        if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
            if (event.repeat) {
                return;
            }
            if (state === "ready" || state === "over") {
                handleAction(event);
            } else {
                event.preventDefault();
                jump();
            }
        }
    });

    window.addEventListener("keyup", function (event) {
        pressedKeys.delete(event.code);
    });

    window.addEventListener("blur", function () {
        pressedKeys.clear();
    });

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) {
            previousTime = performance.now();
        }
    });

    draw();
    animationFrame = window.requestAnimationFrame(loop);
}());
