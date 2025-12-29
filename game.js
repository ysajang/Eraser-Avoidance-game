// Phaser 게임 설정
const config = {
    type: Phaser.AUTO, // Phaser의 렌더 타입(자동 감지)
    width: 400,        // 게임 너비
    height: 600,       // 게임 높이
    scale: {
        mode: Phaser.Scale.FIT,              // 화면에 맞게 비율 조정
        autoCenter: Phaser.Scale.CENTER_BOTH // 자동 중앙 정렬
    },
    physics: {
        default: 'arcade',      // 기본 물리엔진 설정
        arcade: {
            gravity: { y: 1000 }, // 중력값 (y축)
            debug: false,         // 디버그 모드 비활성화 (충돌 박스 시각화 끄기)
        },
    },
    scene: {
        preload, // 자원 로딩 함수
        create,  // 게임 초기화 함수
        update,  // 매 프레임마다 호출되는 함수
    },
};

const game = new Phaser.Game(config); // Phaser 게임 인스턴스 생성

// 전역 변수
let bird, pipes; // 새와 파이프 그룹
let coins; // 코인 그룹
let score = 0, scoreText; // 점수와 점수 텍스트
let highScore = 0, highScoreText; // 최고 점수와 텍스트
let gameOver = false, gameStarted = false; // 게임 종료/시작 여부
let pipeSpeed = 200, spawnDelay = 2500, pipeTimer; // 파이프 속도, 생성 지연, 타이머
let gap = 250; // 파이프 사이 간격 (초기값 250, 더 넓게 설정)
let gamePaused = false; // 일시정지 여부
let flapSound, scoreSound, hitSound, coinSound, extraSound, victorySound; // 사운드
let pauseText = null; // 일시정지 메시지 텍스트
let lastPipeX = 0; // 마지막으로 생성된 파이프의 x 위치 추적
let coinScore = 0; // 코인으로 얻은 점수
let coinTimer; // 코인 생성 타이머
let coinSpawnDelay = 400; // 코인 생성 간격 (밀리초)
let lastCoinY = 300; // 마지막 코인의 y 위치 (부드러운 곡선을 위해)
let coinPathOffset = 0; // 코인 경로 오프셋 (시간에 따라 증가)
let extraLife = 0; // Extra Life 개수
let extraLifeText = null; // Extra Life 표시 텍스트
let lastExtraLifeScore = 0; // 마지막으로 Extra Life를 획득한 점수 (150의 배수)
let isInvincible = false; // 무적 상태 (Extra Life 사용 시 1초간)
let backgroundImage = null; // 현재 배경 이미지 객체
let lastBackgroundScore = 0; // 마지막으로 배경을 변경한 점수
// 배경 이미지 리스트 (background 폴더에 있는 이미지 파일명을 추가하세요)
const backgroundList = [
    'background1.png',
    'background2.png',
    'background3.png',
    'background4.png',
    'background5.png'
];

// 리소스 로드(이미지/사운드)
function preload() {
    // 새 이미지 로드
    try { this.load.image('bird', 'assets/bird.png'); }
    catch (e) { }

    // 파이프 이미지 로드
    try { this.load.image('pipe', 'assets/pipe.png'); }
    catch (e) { }

    // 배경 이미지 로드 (background 폴더에서)
    backgroundList.forEach((bgName, index) => {
        try {
            this.load.image(`background_${index}`, `assets/background/${bgName}`);
        } catch (e) {
            // 파일이 없으면 무시
        }
    });

    // 플랩 사운드 로드
    try { this.load.audio('flap', 'assets/flap.mp3'); }
    catch (e) { }
    // 점수 사운드 로드
    try { this.load.audio('score', 'assets/score.mp3'); }
    catch (e) { }
    // 히트 사운드 로드
    try { this.load.audio('hit', 'assets/hit.mp3'); }
    catch (e) { }
    // 코인 사운드 로드
    try { this.load.audio('coin', 'assets/coin.mp3'); }
    catch (e) { }
    // Extra Life 사운드 로드
    try { this.load.audio('extra', 'assets/Extra.mp3'); }
    catch (e) { }
    // Victory 사운드 로드
    try { this.load.audio('victory', 'assets/victory.mp3'); }
    catch (e) { }
}

// 게임 생성 로직
function create() {
    // 배경색 설정
    this.cameras.main.setBackgroundColor('#4EC0CA');
    // 배경 이미지 있으면 추가 (첫 번째 배경) - 가장 뒤에 렌더링
    if (this.textures.exists('background_0')) {
        backgroundImage = this.add.image(200, 300, 'background_0').setDisplaySize(400, 600).setDepth(-1);
    }

    // 새 생성 (y 위치를 높여서 텍스트와 겹치지 않도록)
    if (this.textures.exists('bird')) {
        bird = this.physics.add.sprite(100, 200, 'bird').setScale(1.5); // 이미지 있으면 사용 (y: 250 -> 200)
        bird.setDepth(1); // 플레이어는 배경보다 앞에
        bird.body.setSize(bird.displayWidth * 0.5, bird.displayHeight * 0.25);
        bird.body.setOffset((bird.displayWidth - bird.body.width) / 2 - bird.body.width * 0.5, (bird.displayHeight - bird.body.height) / 2 - bird.body.height * 0.8);
    } else {
        bird = this.add.rectangle(100, 200, 34, 24, 0xFFFF00); // 없으면 사각형 사용 (y: 250 -> 200)
        this.physics.add.existing(bird);
        bird.setDepth(1); // 플레이어는 배경보다 앞에
        bird.body.setSize(34, 24);
    }
    bird.body.setCollideWorldBounds(false); // 월드 경계 충돌 해제
    bird.body.setAllowGravity(false); // 게임 시작 전까지 중력 비활성화
    bird.body.rotation = 0; // body 회전 초기화

    // 입력 이벤트 등록(마우스 클릭/스페이스바)
    // 입력 - 조건부로 처리
    this.input.on('pointerdown', function (pointer) {
        if (!gameStarted) {
            gameStarted = true;
            gameTitle.destroy();
            startText.destroy();
            if (extraLifeInfo) extraLifeInfo.destroy();
            bird.body.setAllowGravity(true); // 게임 시작 시 중력 활성화
            pipeTimer = this.time.addEvent({
                delay: spawnDelay,
                callback: addPipes,
                callbackScope: this,
                loop: true,
            });

            // 코인 생성 타이머 시작 (파이프와 독립적으로)
            // 기존 타이머가 있으면 제거 (중복 방지)
            if (coinTimer) {
                coinTimer.remove();
            }
            coinTimer = this.time.addEvent({
                delay: coinSpawnDelay,
                callback: addContinuousCoin,
                callbackScope: this,
                loop: true,
            });

            // 게임 시작 후 flap 이벤트 등록
            this.input.on('pointerdown', flap);
        } else {
            flap();
        }
    }, this);

    this.input.keyboard.on('keydown-SPACE', flap);

    // 파이프 그룹 생성
    pipes = this.physics.add.group();

    // 코인 그룹 생성
    coins = this.physics.add.group();



    // 점수 텍스트
    scoreText = this.add.text(280, 12, 'Score : 0', {
        fontSize: '20px', fill: '#fff', fontFamily: 'Noto Sans KR', stroke: '#000', strokeThickness: 4,
    }).setDepth(3);
    // 최고 점수 텍스트
    highScoreText = this.add.text(280, 40, `Best : ${highScore}`, {
        fontSize: '20px', fill: '#fff', fontFamily: 'Noto Sans KR', stroke: '#000', strokeThickness: 3,
    }).setDepth(3);

    // Extra Life 표시 텍스트
    extraLifeText = this.add.text(280, 68, 'Extra Life : 0', {
        fontSize: '16px', fill: '#FFD700', fontFamily: 'Noto Sans KR', stroke: '#000', strokeThickness: 3,
    }).setDepth(3);

    // 시작 텍스트
    const gameTitle = this.add.text(200, 240, 'Eraser Avoidance!', {
        fontSize: '36px', fill: '#11FF11', fontFamily: 'Noto Sans KR', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(3);

    // 시작 텍스트
    const startText = this.add.text(200, 320, 'Click to Start!', {
        fontSize: '36px', fill: '#fff', fontFamily: 'Noto Sans KR', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(3);

    // Extra Life 안내 텍스트
    const extraLifeInfo = this.add.text(200, 380, 'Get Extra Life at 100 points!', {
        fontSize: '20px', fill: '#FFD700', fontFamily: 'Noto Sans KR', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(3);

    // 일시정지 버튼(아이콘)
    const pauseButtonX = this.cameras.main.width - 380;
    const pauseButtonY = 30;
    const pauseIcon = this.add.graphics();

    // 흰색 막대 (아이콘)
    pauseIcon.fillStyle(0xFFFFFF, 1)
        .fillRect(0, 0, 10, 30)
        .fillRect(15, 0, 10, 30);

    // 테두리 추가: 검정색, 두께 3
    pauseIcon.lineStyle(2, 0x000000, 1)
        .strokeRect(0, 0, 10, 30)
        .strokeRect(15, 0, 10, 30);

    pauseIcon.setPosition(pauseButtonX, pauseButtonY);
    pauseIcon.setDepth(3); // 파이프보다 높은 레이어

    // hitArea를 명시적으로 지정 (아이콘 크기: 약 20x24)
    pauseIcon.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, 20, 24),
        Phaser.Geom.Rectangle.Contains,
        { useHandCursor: true }
    );
    pauseIcon.on('pointerdown', togglePause, this);

    // 사운드 객체 생성
    if (this.cache.audio.exists('flap')) flapSound = this.sound.add('flap');
    if (this.cache.audio.exists('score')) scoreSound = this.sound.add('score');
    if (this.cache.audio.exists('hit')) hitSound = this.sound.add('hit');
    if (this.cache.audio.exists('coin')) {
        coinSound = this.sound.add('coin');
        coinSound.setVolume(0.6); // 볼륨 60%로 설정
    }
    if (this.cache.audio.exists('extra')) extraSound = this.sound.add('extra');
    if (this.cache.audio.exists('victory')) victorySound = this.sound.add('victory');

    // 새와 파이프 충돌 처리
    this.physics.add.overlap(bird, pipes, hitPipe, null, this);

    // 새와 코인 충돌 처리
    this.physics.add.overlap(bird, coins, collectCoin, null, this);
}

// 일시정지 오버레이 표시 함수
function showPauseOverlay(scene) {
    if (pauseText) return; // 이미 표시중이면 리턴

    // 반투명 사각형 오버레이
    const overlay = scene.add.rectangle(200, 300, 400, 600, 0x000000, 0.5).setDepth(1000);

    // 오버레이를 클릭 가능하게 설정
    overlay.setInteractive({ useHandCursor: true });
    overlay.on('pointerdown', function () {
        togglePause.call(scene);
    });

    // "Paused" 문구 표시
    pauseText = scene.add.text(200, 280, 'Paused', {
        fontSize: '48px',
        fill: '#fff',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1001);

    // "-tap to continue-" 문구 표시 (Paused 아래)
    const continueText = scene.add.text(200, 340, '-tap to continue-', {
        fontSize: '24px',
        fill: '#fff',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1001);

    // 텍스트 객체에 오버레이와 continueText 참조 추가
    pauseText.overlay = overlay;
    pauseText.continueText = continueText;
}

// 일시정지 오버레이 숨김 함수
function hidePauseOverlay(scene) {
    if (pauseText) {
        if (pauseText.overlay) {
            pauseText.overlay.destroy(); // 사각형 제거
        }
        if (pauseText.continueText) {
            pauseText.continueText.destroy(); // continue 텍스트 제거
        }
        pauseText.destroy(); // Paused 텍스트 제거
        pauseText = null;
    }
}

// 일시정지/재시작 토글 함수
function togglePause() {
    if (gameOver || !gameStarted) return; // 게임 오버거나 시작 전이면 무시

    gamePaused = !gamePaused; // 상태 반전

    if (gamePaused) {
        this.physics.pause(); // 물리 멈춤
        if (pipeTimer) pipeTimer.paused = true; // 파이프 타이머 일시정지
        if (coinTimer) coinTimer.paused = true; // 코인 타이머 일시정지
        showPauseOverlay(this); // 오버레이 표시
    } else {
        this.physics.resume(); // 물리 재개
        if (pipeTimer) pipeTimer.paused = false; // 파이프 타이머 재개
        if (coinTimer) coinTimer.paused = false; // 코인 타이머 재개
        hidePauseOverlay(this); // 오버레이 제거
    }
}

// 메인 게임 업데이트 함수
function update() {
    if (!gameStarted || gameOver || gamePaused) return; // 플레이 중이 아니면 리턴

    // 새가 화면 밖으로 나가면 게임 오버
    if (bird.y > 600 || bird.y < 0) {
        endGame(this);
        return; // 즉시 리턴하여 코인 이동 로직 실행 방지
    }

    // 코인도 파이프와 같은 속도로 이동하도록 업데이트
    coins.children.entries.forEach(coin => {
        if (coin.body && !coin.body.destroyed) {
            coin.body.setVelocityX(-pipeSpeed);
        }
    });

    // 새가 아래로 떨어지면 각도 증가(낙하 느낌)
    if (bird.body.velocity.y > 0) {
        bird.angle = Math.min(bird.angle + 2, 60);
        bird.body.rotation = Math.min(bird.body.rotation + 2, 60); // body 충돌 영역도 함께 회전
    }

    // 마지막 파이프 위치 업데이트 (화면에 있는 파이프 중 가장 오른쪽)
    let maxPipeX = 0;
    pipes.children.entries.forEach(pipe => {
        if (pipe.x > maxPipeX) {
            maxPipeX = pipe.x;
        }
    });
    if (maxPipeX > 0) {
        lastPipeX = maxPipeX;
    }

    // 파이프 통과 체크 및 점수증가
    // 파이프 통과 체크 및 점수증가
    pipes.children.entries.forEach(pipe => {
        if (!pipe.scored && pipe.x < bird.x - 50) { // 새가 파이프 지나치면
            score++;
            scoreText.setText(`Score: ${score}`);
            pipe.scored = true; // 중복 점수 방지
            if (scoreSound) scoreSound.play();

            // Score가 Best와 같거나 높으면 Best도 같이 업데이트
            if (score >= highScore) {
                highScore = score;
                localStorage.setItem('highScore', highScore);
                if (highScoreText) {
                    highScoreText.setText(`Best: ${highScore}`);
                }
            }

            // [수정] 50점마다 배경 변경 (기존: 200점마다)
            if (score > 0 && score % 50 === 0 && score > lastBackgroundScore) {
                lastBackgroundScore = score;
                changeBackground(this);
            }

            // 10점마다 난이도 증가 (속도만 증가)
            if (score > 0 && score % 10 === 0) {
                pipeSpeed += 10; // 파이프 속도만 증가
            }

            // 20점마다 gap과 spawnDelay 감소 (난이도 증가)
            if (score > 0 && score % 20 === 0) {
                gap = Math.max(gap - 10, 120); // gap을 10씩 감소 (최소 120, 더 넓게 유지)
                spawnDelay = Math.max(spawnDelay - 100, 1000); // spawnDelay를 100씩 감소 (최소 1000)
                // 파이프 타이머 delay 업데이트
                if (pipeTimer) {
                    pipeTimer.delay = spawnDelay;
                }
            }

            // 150의 배수마다 Extra Life 획득
            const extraLifeThreshold = Math.floor(score / 100) * 100; // 현재 점수에서 가장 가까운 150의 배수 (아래쪽)
            if (extraLifeThreshold >= 100 && extraLifeThreshold > lastExtraLifeScore) {
                lastExtraLifeScore = extraLifeThreshold;
                extraLife++;
                if (extraLifeText) {
                    extraLifeText.setText(`Extra Life: ${extraLife}`);
                }
                // Extra Life 획득 메시지 표시
                const extraLifeMsg = this.add.text(200, 150, 'Extra Life Earned!', {
                    fontSize: '32px', fill: '#FFD700', fontFamily: 'Arial', stroke: '#000', strokeThickness: 4,
                }).setOrigin(0.5).setDepth(1000); // 파이프보다 높은 레이어
                // 2초 후 메시지 제거
                this.time.delayedCall(1000, () => {
                    if (extraLifeMsg && extraLifeMsg.active) {
                        extraLifeMsg.destroy();
                    }
                });
                if (extraSound) extraSound.play(); // Extra Life 사운드 재생
            }

            // 9999점 이상 달성 시 게임 승리
            if (score >= 9999) {
                endGame(this);
                return;
            }
        }
    });
}

// 새 점프 동작(플랩)
function flap() {
    if (!gameStarted || gameOver || gamePaused) return; // 플레이 중일 때만 동작
    bird.body.setVelocityY(-350); // 위로 점프
    bird.angle = -40;             // 각도 위로 틸트
    bird.body.rotation = -40;     // body 충돌 영역도 -20도 기울임
    if (flapSound) flapSound.play(); // 사운드 재생
}

// 파이프 생성 함수
// 파이프 생성 함수
function addPipes() {
    if (!gameStarted || gameOver || gamePaused) return; // 플레이 중이고 일시정지가 아닐 때만 생성

    // 파이프 사이 통과 가능한 간격 (전역 변수 gap 사용 - 점수에 따라 동적으로 변경됨)

    // [수정] 파이프 생성 시 코인 경로의 y 위치를 기준으로 holePosition 설정
    // 코인이 일정한 경로를 따라 생성되므로, 파이프도 코인 경로를 중심으로 생성
    // 코인 경로 오프셋을 사용하여 파이프 생성 위치의 코인 경로 y 위치 계산
    const coinPathY = getCoinPathY(coinPathOffset);

    // 코인 경로의 y 위치를 holePosition으로 사용
    // 파이프가 코인 경로를 중심으로 생성되어 코인이 파이프 사이의 중간에 위치
    const holePosition = coinPathY;

    // 파이프 이미지 높이 가져오기 (이미지가 있는 경우)
    let pipeHeight = 500; // 기본값 (이미지가 없을 때)
    if (this.textures.exists('pipe')) {
        const pipeTexture = this.textures.get('pipe');
        pipeHeight = pipeTexture.getSourceImage().height;
    }

    // 파이프 시작 x 위치를 화면 오른쪽 끝으로 통일 (같은 x 좌표로 정렬)
    const pipeStartX = 400;

    // 화면에 있는 파이프 중 가장 오른쪽 파이프의 실제 위치 확인
    let rightmostPipeX = 0;
    pipes.children.entries.forEach(pipe => {
        if (pipe.x > rightmostPipeX) {
            rightmostPipeX = pipe.x;
        }
    });

    // 마지막 파이프와의 거리 확인 (겹침 방지)
    // 파이프 너비(100) + 최소 간격을 고려한 최소 거리 확보
    // spawnDelay가 줄어들 수 있으므로 파이프 속도와 생성 간격을 고려
    const pipeWidth = 100;
    const minDistance = pipeWidth + (pipeSpeed * spawnDelay / 1000) * 0.3; // 파이프 속도와 생성 간격 고려

    if (rightmostPipeX > 0 && pipeStartX - rightmostPipeX < minDistance) {
        // 마지막 파이프와 너무 가까우면 생성하지 않음
        return;
    }

    // 위쪽 파이프: 하단이 holePosition - gap/2에 위치하도록 설정
    // origin(0.5, 1)이므로 y 좌표는 파이프의 하단
    const topPipeBottomY = holePosition - gap / 2;
    const topPipeY = topPipeBottomY; // origin이 (0.5, 1)이므로 하단이 이 위치

    // 아래쪽 파이프: 상단이 holePosition + gap/2에 위치하도록 설정
    // origin(0.5, 0)이므로 y 좌표는 파이프의 상단
    const bottomPipeTopY = holePosition + gap / 2;
    const bottomPipeY = bottomPipeTopY; // origin이 (0.5, 0)이므로 상단이 이 위치

    // 위쪽 파이프 생성
    let topPipe;
    if (this.textures.exists('pipe')) {
        topPipe = this.physics.add.sprite(pipeStartX, topPipeY, 'pipe').setOrigin(0.5, 1).setDepth(2);
        topPipe.body.setSize(topPipe.displayWidth, topPipe.displayHeight);
        topPipe.body.setOffset((topPipe.displayWidth - topPipe.body.width) / 2, 0);
    } else {
        topPipe = this.add.rectangle(pipeStartX, topPipeY, 100, pipeHeight, 0x00FF00);
        this.physics.add.existing(topPipe);
        topPipe.setDepth(2);
        topPipe.body.setSize(100, pipeHeight);
    }
    pipes.add(topPipe); // 그룹에 추가
    topPipe.body.setVelocityX(-pipeSpeed); // 왼쪽으로 이동
    topPipe.body.allowGravity = false; // 중력 영향 X
    topPipe.scored = false;
    topPipe.checkWorldBounds = true; // 화면 밖 체크
    topPipe.outOfBoundsKill = true;  // 벗어나면 제거
    topPipe.holePosition = holePosition; // 구멍 중앙 위치 저장
    topPipe.isTopPipe = true; // 위쪽 파이프 표시
    topPipe.pipePairX = pipeStartX; // 파이프 쌍의 x 위치 저장
    topPipe.topPipeBottomY = topPipeBottomY; // 위쪽 파이프 하단 y 위치 저장
    topPipe.bottomPipeTopY = bottomPipeTopY; // 아래쪽 파이프 상단 y 위치 저장

    // 아래쪽 파이프 생성
    let bottomPipe;
    if (this.textures.exists('pipe')) {
        bottomPipe = this.physics.add.sprite(pipeStartX, bottomPipeY, 'pipe').setOrigin(0.5, 0).setDepth(2);
        bottomPipe.body.setSize(bottomPipe.displayWidth, bottomPipe.displayHeight);
        bottomPipe.body.setOffset((bottomPipe.displayWidth - bottomPipe.body.width) / 2, 0);
    } else {
        bottomPipe = this.add.rectangle(pipeStartX, bottomPipeY, 100, pipeHeight, 0x00FF00);
        this.physics.add.existing(bottomPipe);
        bottomPipe.setDepth(2);
        bottomPipe.body.setSize(100, pipeHeight);
    }
    pipes.add(bottomPipe); // 그룹에 추가
    bottomPipe.body.setVelocityX(-pipeSpeed); // 왼쪽으로 이동
    bottomPipe.body.allowGravity = false;
    bottomPipe.scored = false;
    bottomPipe.checkWorldBounds = true;
    bottomPipe.outOfBoundsKill = true;
    bottomPipe.holePosition = holePosition; // 구멍 중앙 위치 저장
    bottomPipe.isTopPipe = false; // 아래쪽 파이프 표시
    bottomPipe.pipePairX = pipeStartX; // 파이프 쌍의 x 위치 저장
    bottomPipe.topPipeBottomY = topPipeBottomY; // 위쪽 파이프 하단 y 위치 저장
    bottomPipe.bottomPipeTopY = bottomPipeTopY; // 아래쪽 파이프 상단 y 위치 저장

    // 마지막 파이프 위치 업데이트
    lastPipeX = pipeStartX;
}

// 코인 경로 계산 함수 (일정한 경로를 따라 생성)
function getCoinPathY(offset) {
    // 화면 중앙을 기준으로 사인파 경로 생성
    const centerY = 300; // 화면 중앙
    const amplitude = 120; // 곡선의 진폭 (위아래로 120픽셀 범위)
    const frequency = 0.02; // 주파수 (작을수록 느린 변화)

    // 사인파를 사용하여 부드러운 곡선 경로 생성
    const y = centerY + Math.sin(offset * frequency) * amplitude;

    // 화면 범위 내로 제한
    return Phaser.Math.Clamp(y, 120, 480);
}

// 연속적인 코인 생성 함수 (일정한 경로를 따라 생성)
function addContinuousCoin() {
    if (!gameStarted || gameOver || gamePaused) return;

    // 화면 오른쪽 끝에서 코인 생성
    const coinX = 400;

    // 코인 경로 오프셋 증가 (코인 생성 간격에 따라 증가)
    coinPathOffset += coinSpawnDelay * 0.1; // 시간에 따라 경로 오프셋 증가

    // 코인 경로 함수를 사용하여 y 위치 계산
    const newY = getCoinPathY(coinPathOffset);

    // 코인 생성
    createCoin.call(this, coinX, newY);

    // 마지막 코인 위치 업데이트
    lastCoinY = newY;
}

// 코인 생성 함수
function createCoin(x, y) {
    if (!gameStarted || gameOver || gamePaused) return;

    // 코인을 원형으로 생성 (이미지가 없을 경우)
    let coin;
    let originalScale = 0.8; // 스프라이트의 기본 scale
    if (this.textures.exists('coin')) {
        coin = this.physics.add.sprite(x, y, 'coin').setDepth(2);
        // 스프라이트의 기본 origin은 (0.5, 0.5)이므로 중심이 (x, y)에 위치
        // 원형 충돌 박스 사용 (코인은 원형이므로)
        // 충돌 영역을 시각적 크기의 약 45%로 설정 (너무 크지도 작지도 않게)
        const radius = Math.min(coin.displayWidth, coin.displayHeight) * 0.45;
        coin.body.setCircle(radius);
        // origin이 (0.5, 0.5)이고 setCircle을 사용하면 body 중심이 스프라이트 중심과 일치
        // Phaser에서 setCircle은 자동으로 중심에 맞춰지므로 offset은 (0, 0)이 맞음
        coin.body.setOffset(0, 0);
    } else {
        // 이미지가 없으면 그래픽 객체로 코인 생성 (외부 원 + 내부 원)
        const graphics = this.add.graphics();
        // fillCircle(0, 0, 15)로 그리면 그래픽의 (0, 0)이 원의 중심
        graphics.fillStyle(0xFFD700, 1); // 금색 외부 원
        graphics.fillCircle(0, 0, 15);
        graphics.fillStyle(0xFFFF00, 0.8); // 노란색 내부 원
        graphics.fillCircle(0, 0, 10);
        // setPosition(x, y)로 설정하면 그래픽의 (0, 0)이 (x, y)에 위치
        graphics.setPosition(x, y);

        coin = graphics;
        this.physics.add.existing(coin);
        coin.setDepth(2);
        originalScale = 1.0; // 그래픽 객체의 기본 scale
        coin.body.setCircle(15);
        // 그래픽의 (0, 0)이 (x, y)에 위치하고, 원의 중심도 (0, 0)이므로
        // body의 중심도 (x, y)에 위치해야 함
        // setCircle을 사용하면 body의 중심이 그래픽의 위치와 일치하도록 자동 설정됨
        // 하지만 실제 테스트 결과에 따라 미세 조정이 필요할 수 있음
        // 그래픽 객체의 경우 body offset은 (0, 0)이 맞지만,
        // 그래픽의 실제 위치와 body의 위치가 정확히 일치하는지 확인 필요
        coin.body.setOffset(-15, -15);
    }

    coins.add(coin);
    coin.body.setVelocityX(-pipeSpeed); // 파이프와 같은 속도로 이동
    coin.body.allowGravity = false;
    coin.checkWorldBounds = true;
    coin.outOfBoundsKill = true;

    // 코인 회전 애니메이션 (시각적 효과)
    this.tweens.add({
        targets: coin,
        angle: 360,
        duration: 2000,
        repeat: -1,
        ease: 'Linear'
    });

    // [수정] 코인 scale 애니메이션 추가 (커졌다가 작아지는 효과)
    // 초기 scale을 0으로 설정
    coin.setScale(0);

    // scale 애니메이션: 0 → 1.2 → 원래 크기
    const maxScale = originalScale * 1.5; // 원래 크기의 1.5배까지 커짐
    this.tweens.add({
        targets: coin,
        scale: maxScale,
        duration: 200,
        ease: 'Back.easeOut',
        onComplete: () => {
            // maxScale에서 원래 크기로 돌아오는 애니메이션
            this.tweens.add({
                targets: coin,
                scale: originalScale,
                duration: 150,
                ease: 'Back.easeIn'
            });
        }
    });
}

// 코인 수집 함수
function collectCoin(birdObj, coinObj) {
    if (coinObj.collected) return; // 이미 수집된 코인은 무시

    coinObj.collected = true;
    coinScore++;
    score += 1; // 코인당 1점 추가
    scoreText.setText(`Score: ${score}`);

    // Score가 Best와 같거나 높으면 Best도 같이 업데이트
    if (score >= highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        if (highScoreText) {
            highScoreText.setText(`Best: ${highScore}`);
        }
    }

    // [수정] 50점마다 배경 변경 (기존: 200점마다) - collectCoin 함수
    if (score > 0 && score % 50 === 0 && score > lastBackgroundScore) {
        lastBackgroundScore = score;
        changeBackground(this);
    }

    // 9999점 이상 달성 시 게임 승리
    if (score >= 9999) {
        endGame(this);
        return;
    }

    if (coinSound) coinSound.play();

    // 코인 수집 효과 (페이드 아웃)
    this.tweens.add({
        targets: coinObj,
        alpha: 0,
        scale: 0,
        duration: 200,
        onComplete: () => {
            coinObj.destroy();
        }
    });

    // 코인 수집 시 점수 텍스트 효과
    const coinScoreText = this.add.text(coinObj.x, coinObj.y, '+2', {
        fontSize: '24px',
        fill: '#FFD700',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 2,
    }).setOrigin(0.5);

    this.tweens.add({
        targets: coinScoreText,
        y: coinObj.y - 50,
        alpha: 0,
        duration: 500,
        onComplete: () => {
            coinScoreText.destroy();
        }
    });
}

// 새-파이프 충돌시 처리 함수
function hitPipe(birdObj, pipeObj) {
    // 이미 게임 오버 상태면 무시 (중복 충돌 방지)
    if (gameOver) {
        return;
    }

    // 무적 상태일 때는 충돌 무시
    if (isInvincible) {
        return;
    }

    // 파이프가 화면 밖에 있으면 충돌 무시 (화면 왼쪽으로 벗어난 파이프는 충돌 감지 안 함)
    if (pipeObj.body.right < 0 || pipeObj.body.left > 400) {
        return;
    }

    // 수동으로 충돌 박스 겹침 확인 (더 정확한 충돌 감지)
    const birdLeft = birdObj.body.left;
    const birdRight = birdObj.body.right;
    const birdTop = birdObj.body.top;
    const birdBottom = birdObj.body.bottom;
    const pipeLeft = pipeObj.body.left;
    const pipeRight = pipeObj.body.right;
    const pipeTop = pipeObj.body.top;
    const pipeBottom = pipeObj.body.bottom;

    // 실제로 겹치는지 확인
    const horizontalOverlap = birdRight > pipeLeft && birdLeft < pipeRight;
    const verticalOverlap = birdBottom > pipeTop && birdTop < pipeBottom;

    // 겹치지 않으면 무시
    if (!horizontalOverlap || !verticalOverlap) {
        return;
    }

    if (hitSound) hitSound.play(); // 충돌시 사운드
    endGame(this); // 게임 오버 처리
}

// 배경 변경 함수
function changeBackground(scene) {
    if (!backgroundImage) return;

    // 사용 가능한 배경 개수 계산
    let availableBackgrounds = 0;
    for (let i = 0; i < backgroundList.length; i++) {
        if (scene.textures.exists(`background_${i}`)) {
            availableBackgrounds++;
        }
    }

    if (availableBackgrounds === 0) return;

    // [수정] 현재 배경 인덱스 계산 (50점마다 변경, 기존: 200점마다)
    const backgroundIndex = Math.floor(score / 50) % availableBackgrounds;

    // 배경 이미지 키 결정
    const backgroundKey = `background_${backgroundIndex}`;

    // 기존 배경 제거
    if (backgroundImage && backgroundImage.active) {
        backgroundImage.destroy();
    }

    // 새 배경 생성 - 가장 뒤에 렌더링
    if (scene.textures.exists(backgroundKey)) {
        backgroundImage = scene.add.image(200, 300, backgroundKey).setDisplaySize(400, 600).setDepth(-1);
    }
}

// 게임 오버 오버레이 표시 함수
function showGameOverOverlay(scene) {
    // 반투명 사각형 오버레이
    const overlay = scene.add.rectangle(200, 300, 400, 600, 0x000000, 0.6).setDepth(999);

    // 오버레이 참조를 저장 (나중에 제거하기 위해)
    scene.gameOverOverlay = overlay;
}

// 폭죽 효과 함수
function createFireworks(scene, x, y) {
    // 폭죽 색상 배열 (밝고 화려한 색상들)
    const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0xFFA500, 0xFF1493];

    // 파티클 개수
    const particleCount = 30;

    // 각 파티클 생성
    for (let i = 0; i < particleCount; i++) {
        // 랜덤 색상 선택
        const color = colors[Math.floor(Math.random() * colors.length)];

        // 파티클 생성 (작은 원형)
        const particle = scene.add.circle(x, y, 3, color).setDepth(1001);

        // 랜덤 각도와 속도 계산
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5; // 원형으로 퍼지되 약간의 랜덤성 추가
        const speed = 200 + Math.random() * 150; // 속도: 200~350

        // 속도 벡터 계산
        const velocityX = Math.cos(angle) * speed;
        const velocityY = Math.sin(angle) * speed;

        // 파티클 이동 애니메이션
        scene.tweens.add({
            targets: particle,
            x: x + velocityX * 0.5, // 최종 위치
            y: y + velocityY * 0.5,
            alpha: 0,
            scale: 0,
            duration: 800 + Math.random() * 400, // 800~1200ms
            ease: 'Power2',
            onComplete: () => {
                if (particle && particle.active) {
                    particle.destroy();
                }
            }
        });

        // 중력 효과 (아래로 떨어지는 효과)
        scene.tweens.add({
            targets: particle,
            y: y + velocityY * 0.5 + 100, // 추가로 아래로 떨어짐
            duration: 800 + Math.random() * 400,
            ease: 'Power2'
        });
    }
}

// 게임 오버 처리 함수
function endGame(scene) {
    if (gameOver) return; // 중복처리 방지
    gameOver = true;
    bird.body.setVelocity(0, 0); // 새 멈춤
    pipes.children.entries.forEach(pipe => pipe.body.setVelocity(0, 0)); // 모든 파이프 멈춤
    coins.children.entries.forEach(coin => {
        if (coin.body && !coin.body.destroyed) {
            coin.body.setVelocity(0, 0); // 모든 코인 멈춤
        }
    }); // 모든 코인 멈춤

    // 최고 점수 갱신 (게임 오버 시 최종 확인)
    let isNewRecord = false;
    if (score >= highScore) {
        // 이미 실시간으로 업데이트되었지만, 신기록 여부 확인
        if (score > highScore) {
            isNewRecord = true;
        }
        // 최종 확인 및 업데이트
        highScore = score;
        localStorage.setItem('highScore', highScore);
        if (highScoreText) {
            highScoreText.setText(`Best: ${highScore}`);
        }
    }

    // 9999점 이상 달성 시 승리 처리
    const isWin = score >= 9999;

    // 승리 시에는 바로 승리 화면 표시
    if (isWin) {
        // 게임 오버 오버레이 표시 (어두운 배경)
        showGameOverOverlay(scene);

        // 파이프와 코인 제거 (점수가 뚜렷하게 보이도록)
        pipes.children.entries.forEach(pipe => {
            if (pipe) {
                pipe.setAlpha(0); // 파이프 숨기기
            }
        });
        coins.children.entries.forEach(coin => {
            if (coin && !coin.destroyed) {
                coin.setAlpha(0); // 코인 숨기기
            }
        });

        // "You Win!" 문구 표시
        scene.add.text(200, 250, 'You Win!', {
            fontSize: '48px', fill: '#FFD700', fontFamily: 'Arial', stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(1000);

        // Victory 사운드 재생 (4초까지만)
        if (victorySound) {
            victorySound.play();
            // 4초 후 사운드 중지
            scene.time.delayedCall(4000, () => {
                if (victorySound && victorySound.isPlaying) {
                    victorySound.stop();
                }
            });
        }

        // 폭죽 효과 생성 (여러 위치에서 연속으로 터지게)
        // 첫 번째 폭죽 (중앙)
        createFireworks(scene, 200, 250);

        // 약간의 지연 후 추가 폭죽들
        scene.time.delayedCall(200, () => {
            createFireworks(scene, 150, 200);
            createFireworks(scene, 250, 200);
        });

        scene.time.delayedCall(400, () => {
            createFireworks(scene, 100, 300);
            createFireworks(scene, 300, 300);
        });

        scene.time.delayedCall(600, () => {
            createFireworks(scene, 200, 150);
            createFireworks(scene, 200, 350);
        });

        // 재시작 안내 문구 표시
        scene.add.text(200, 320, 'Click to Restart', {
            fontSize: '24px', fill: '#fff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(1000);

        // 클릭시 재시작 처리 (새로고침처럼 완전히 새로 시작)
        scene.input.once('pointerdown', function () {
            // 모든 타이머 정리
            if (pipeTimer) {
                pipeTimer.remove();
                pipeTimer = null;
            }
            if (coinTimer) {
                coinTimer.remove();
                coinTimer = null;
            }

            // 모든 사운드 중지
            if (victorySound && victorySound.isPlaying) {
                victorySound.stop();
            }

            // 페이지 새로고침 (완전히 새로 시작)
            location.reload();
        });
        return; // 승리 처리 후 함수 종료
    }

    // Extra Life가 있으면 부활 옵션 제공
    if (extraLife > 0) {
        // Extra Life가 있을 때는 오버레이와 파이프/코인 숨김 없이 진행
        // "Game Over" 문구 표시
        const gameOverText = scene.add.text(200, 200, 'Game Over!', {
            fontSize: '56px', fill: '#fff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 5,
        }).setOrigin(0.5).setDepth(1000);

        // Extra Life 사용 안내
        const reviveText = scene.add.text(200, 280, 'Use Extra Life?', {
            fontSize: '40px', fill: '#FFD700', fontFamily: 'Arial', stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(1000);

        const yesText = scene.add.text(130, 340, 'YES (Click)', {
            fontSize: '20px', fill: '#00FF00', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(1000).setInteractive({ useHandCursor: true });

        // YES 텍스트 깜빡임 효과
        scene.tweens.add({
            targets: yesText,
            alpha: 0.3,
            duration: 500,
            yoyo: true,
            repeat: -1 // 무한 반복
        });

        const noText = scene.add.text(270, 340, 'NO (Click)', {
            fontSize: '20px', fill: '#FF0000', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(1000).setInteractive({ useHandCursor: true });

        // YES 클릭 시 부활
        yesText.on('pointerdown', function () {
            extraLife--;
            if (extraLifeText) {
                extraLifeText.setText(`Extra Life: ${extraLife}`);
            }

            // 게임 오버 오버레이 제거
            if (scene.gameOverOverlay) {
                scene.gameOverOverlay.destroy();
                scene.gameOverOverlay = null;
            }

            // 게임 오버 상태 해제 및 게임 재개
            gameOver = false;
            bird.body.setVelocity(0, 0);
            bird.body.setAllowGravity(true);

            // 새를 안전한 위치로 이동 (화면 중앙)
            bird.x = 100;
            bird.y = 300;
            bird.angle = 0;
            bird.body.rotation = 0;

            // 파이프와 코인 다시 보이게 하고 움직이기
            pipes.children.entries.forEach(pipe => {
                if (pipe) {
                    pipe.setAlpha(1); // 파이프 다시 보이게
                    if (pipe.body) {
                        pipe.body.setVelocityX(-pipeSpeed);
                    }
                }
            });
            coins.children.entries.forEach(coin => {
                if (coin && !coin.destroyed) {
                    coin.setAlpha(1); // 코인 다시 보이게
                    if (coin.body) {
                        coin.body.setVelocityX(-pipeSpeed);
                    }
                }
            });

            // 무적 상태 활성화 (1초간)
            isInvincible = true;

            // 무적 상태 시각적 효과 (깜빡임)
            const invincibleTween = scene.tweens.add({
                targets: bird,
                alpha: 0.5,
                duration: 100,
                yoyo: true,
                repeat: 10, // 1초간 (100ms * 10 = 1000ms)
                onComplete: () => {
                    isInvincible = false;
                    bird.alpha = 1; // 알파값 복원
                }
            });

            // UI 요소 제거
            gameOverText.destroy();
            reviveText.destroy();
            yesText.destroy();
            noText.destroy();
        });

        // NO 클릭 시 게임 종료
        noText.on('pointerdown', function () {
            // 게임 오버 오버레이 표시 (어두운 배경)
            showGameOverOverlay(scene);

            // 파이프와 코인 제거 (점수가 뚜렷하게 보이도록)
            pipes.children.entries.forEach(pipe => {
                if (pipe) {
                    pipe.setAlpha(0); // 파이프 숨기기
                }
            });
            coins.children.entries.forEach(coin => {
                if (coin && !coin.destroyed) {
                    coin.setAlpha(0); // 코인 숨기기
                }
            });

            // 신기록이면 표시
            if (isNewRecord) {
                scene.add.text(200, 200, 'New Record!', {
                    fontSize: '32px', fill: '#FFD700', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3,
                }).setOrigin(0.5).setDepth(1000);
            }
            // 게임 오버 텍스트 표시
            scene.add.text(200, 250, 'Game Over!', {
                fontSize: '48px', fill: '#fff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 4,
            }).setOrigin(0.5).setDepth(1000);
            // 재시작 안내 문구 표시
            const restartText = scene.add.text(200, 320, 'Click to Restart', {
                fontSize: '24px', fill: '#fff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3,
            }).setOrigin(0.5).setDepth(1000);

            // UI 요소 제거
            gameOverText.destroy();
            reviveText.destroy();
            yesText.destroy();
            noText.destroy();

            // 클릭시 재시작 처리
            scene.input.once('pointerdown', function () {
                // 게임 오버 오버레이 제거
                if (scene.gameOverOverlay) {
                    scene.gameOverOverlay.destroy();
                    scene.gameOverOverlay = null;
                }

                score = 0;
                coinScore = 0;
                extraLife = 0;
                lastExtraLifeScore = 0;
                lastBackgroundScore = 0;
                isInvincible = false;
                gameOver = false;
                gameStarted = false;
                pipeSpeed = 200;
                spawnDelay = 2500;
                gap = 250; // gap 초기값으로 리셋
                lastPipeX = 0;
                lastCoinY = 300;
                coinPathOffset = 0; // 코인 경로 오프셋 초기화
                coinSpawnDelay = 400;
                if (extraLifeText) {
                    extraLifeText.setText('Extra Life: 0');
                }
                scene.scene.restart();
            });
        });
    } else {
        // Extra Life가 없으면 일반 게임 오버 처리
        // 게임 오버 오버레이 표시 (어두운 배경)
        showGameOverOverlay(scene);

        // 파이프와 코인 제거 (점수가 뚜렷하게 보이도록)
        pipes.children.entries.forEach(pipe => {
            if (pipe) {
                pipe.setAlpha(0); // 파이프 숨기기
            }
        });
        coins.children.entries.forEach(coin => {
            if (coin && !coin.destroyed) {
                coin.setAlpha(0); // 코인 숨기기
            }
        });

        // 게임 오버 텍스트 표시
        scene.add.text(200, 250, 'Game Over!', {
            fontSize: '48px', fill: '#fff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(1000);
        // 신기록이면 표시
        if (isNewRecord) {
            scene.add.text(200, 200, 'New Record!', {
                fontSize: '32px', fill: '#FFD700', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3,
            }).setOrigin(0.5).setDepth(1000);
        }

        // 재시작 안내 문구 표시
        scene.add.text(200, 320, 'Click to Restart', {
            fontSize: '24px', fill: '#fff', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(1000);

        // 클릭시 재시작 처리
        scene.input.once('pointerdown', function () {
            score = 0;
            coinScore = 0;
            extraLife = 0;
            lastExtraLifeScore = 0;
            isInvincible = false;
            gameOver = false;
            gameStarted = false;
            pipeSpeed = 200;
            spawnDelay = 2500;
            gap = 250; // gap 초기값으로 리셋
            lastPipeX = 0; // 마지막 파이프 위치 초기화
            lastCoinY = 300; // 마지막 코인 위치 초기화
            coinPathOffset = 0; // 코인 경로 오프셋 초기화
            coinSpawnDelay = 400; // 코인 생성 간격 초기화
            if (extraLifeText) {
                extraLifeText.setText('Extra Life: 0');
            }
            // 배경 초기화
            if (backgroundImage && backgroundImage.active) {
                backgroundImage.destroy();
            }
            backgroundImage = null;
            lastBackgroundScore = 0;
            scene.scene.restart(); // 씬 재시작
        });
    }
}
