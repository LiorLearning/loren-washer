class MainGame extends Phaser.Scene {
    constructor() {
        super({ key: 'MainGame' });
    }

    init() {
        // Game state
        this.level = 1;
        this.scrolls = 0;
        this.flameShards = 0;
        this.waveTimer = 0;
        this.currentWave = 1;
        this.enemies = [];
        this.scrolls = [];
        this.killsThisWave = 0;
        this.totalKills = 0;
        this.playerCanAttack = true;
        this.playerHealth = 30;
        this.playerMaxHealth = 30;
        this.currency = 0;
        this.elapsedTime = 0;
        this.waveTarget = 50;
        this.waveProgress = 0;
        this.healthRegenRate = 0.25; // per second
        this.healthRegenAccumulator = 0;
        this.storeActive = false;
        this.selectedPowerUpIndex = null;
        this.gameOver = false;
        this.powerUpState = {
            invisibilityDash: { unlocked: false, uses: 2, active: false, timer: 0 },
            acceleratedRecovery: { unlocked: false },
            poisonZone: { unlocked: false, cooldown: 0 },
            ultraBlast: { unlocked: false, uses: 2, cooldown: 0 }
        };
        this.playerInvulnTimer = 0; // Invulnerability timer after taking damage
        this.playerShotsFired = 0; // Counter for shots fired
        this.awaitingMathTextY = 0; // For dynamic positioning
    }

    preload() {
        this.load.on('complete', () => {
            this.createPlaceholderGraphics();
        });
        // Load background images
        this.load.image('background', 'assets/background.png');
        this.load.image('background_dojo', 'assets/background_dojo.png');
        this.load.image('background_village', 'assets/background_village.png');
        this.load.image('background_gate', 'assets/background_gate.png');
        // Load hero3 static image for player
        this.load.image('hero', 'assets/hero3.png');
        // Load endermen2 static image for enemy
        this.load.image('enemy_basic', 'assets/endermen2.png');
        // Load spiderjockey static image for enemy (alternating)
        this.load.image('spiderjockey', 'assets/spiderjockey.png');
        // Load enderpearl image for scroll drop
        this.load.image('scroll', 'assets/enderpearl.png');
        // Load hit sound effect
        this.load.audio('hit_sfx', 'assets/hit.mp3');
    }

    create() {
        // Resume audio context on first user input
        this.input.once('pointerdown', () => this.sound.context.resume());
        this.input.keyboard.once('keydown', () => this.sound.context.resume());

        // Add background image (centered, covers screen)
        this.background = this.add.image(480, 270, 'background_dojo').setDepth(-100);
        this.background.setDisplaySize(960, 540);

        // --- MODERN SPLIT INTRO SCREEN (FIXED) ---
        this.introActive = true;
        this.introGroup = this.add.group();
        const screenW = 960, screenH = 540;
        const neonPurple = 0xb48cff;
        // --- Soft background glow behind UI (smaller, less overlap) ---
        const bgGlow = this.add.graphics();
        bgGlow.fillStyle(neonPurple, 0.08);
        bgGlow.fillEllipse(screenW/2 + 220, screenH/2 + 10, 340, 220);
        bgGlow.setDepth(900);
        this.introGroup.add(bgGlow);
        // --- Left Block (Title, Level, Button, Credits) ---
        // Calculate vertical stack for perfect alignment
        const leftX = 260;
        const stackTop = 140;
        const titleFontSize = 48;
        const levelFontSize = 24;
        const buttonFontSize = 28;
        const creditsFontSize = 20;
        // Title
        this.introTitleGlow = this.add.text(leftX, stackTop, 'UNLOCK THE\nENDERSWORD', {
            fontSize: `${titleFontSize}px`,
            fill: '#b48cff',
            fontStyle: 'bold',
            fontFamily: 'Arial Black, Arial, sans-serif',
            align: 'center',
            stroke: '#fff',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#b48cff', blur: 32, fill: true },
            lineSpacing: 0
        }).setOrigin(0.5, 0).setDepth(1001).setAlpha(0);
        this.introGroup.add(this.introTitleGlow);
        // Get title block height
        const titleBlockHeight = this.introTitleGlow.height;
        // Level 1, centered below title
        const levelY = stackTop + titleBlockHeight + 8;
        this.introLevelText = this.add.text(leftX, levelY, 'Level 1', {
            fontSize: `${levelFontSize}px`,
            fill: '#fff',
            fontFamily: 'monospace',
            align: 'center',
            fontStyle: 'bold',
            stroke: '#b48cff',
            strokeThickness: 2,
            shadow: { offsetX: 0, offsetY: 0, color: '#b48cff', blur: 8, fill: true },
            letterSpacing: 1
        }).setOrigin(0.5, 0).setDepth(1001).setAlpha(0);
        this.introGroup.add(this.introLevelText);
        // Start Button (background)
        const btnW = 220, btnH = 60;
        const buttonY = levelY + this.introLevelText.height + 24;
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x3a206e, 1);
        btnBg.fillRoundedRect(leftX - btnW/2, buttonY, btnW, btnH, 18);
        btnBg.lineStyle(4, neonPurple, 0.7);
        btnBg.strokeRoundedRect(leftX - btnW/2, buttonY, btnW, btnH, 18);
        btnBg.setDepth(1000);
        btnBg.alpha = 0;
        btnBg.shadowColor = neonPurple;
        btnBg.shadowBlur = 32;
        this.introGroup.add(btnBg);
        // Start Button (text)
        this.introStartBtn = this.add.text(leftX, buttonY + btnH/2, 'START GAME', {
            fontSize: `${buttonFontSize}px`,
            fill: '#fff',
            fontFamily: 'monospace',
            align: 'center',
            stroke: '#b48cff',
            strokeThickness: 3,
            shadow: { offsetX: 0, offsetY: 0, color: '#b48cff', blur: 16, fill: true }
        }).setOrigin(0.5).setDepth(1002).setInteractive({ useHandCursor: true }).setAlpha(0);
        this.introGroup.add(this.introStartBtn);
        // Credits (improved readability)
        const creditsY = buttonY + btnH + 24;
        this.introCredits = this.add.text(leftX, creditsY, 'Created by LOREN', {
            fontSize: `${creditsFontSize}px`,
            fontFamily: 'monospace',
            fontStyle: 'bold',
            fill: '#fff',
            align: 'center',
            stroke: '#b48cff',
            strokeThickness: 2,
            shadow: { offsetX: 0, offsetY: 0, color: '#b48cff', blur: 4, fill: true },
            letterSpacing: 2
        }).setOrigin(0.5, 0).setDepth(1001).setAlpha(0);
        this.introGroup.add(this.introCredits);
        // --- Right Panel (Instructions, fixed) ---
        // Vertically center panel with left block
        const panelX = 700, panelW = 340, panelR = 24;
        // Instructions as a single text block with wordWrap and line breaks
        const instrTextBlock =
            '• Move: W / A / S / D or Arrow Keys\n\n' +
            '• Power Up: Press E or Left Click (when available)\n\n' +
            '• Math Scroll: Press M to answer and unlock fire\n\n' +
            '• Buy/Upgrade: Click in store, game resumes automatically';
        // Estimate text height for panel sizing
        const tempInstrText = this.add.text(0, 0, instrTextBlock, {
            fontSize: '19px',
            fontFamily: 'monospace',
            wordWrap: { width: 300 },
            lineSpacing: 2
        }).setVisible(false);
        const panelH = tempInstrText.height + 80;
        tempInstrText.destroy();
        // Center panel vertically with left block
        const panelY = 120 + (screenH - 120 - 40 - panelH) / 2;
        // Panel background
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x181f2a, 0.92);
        panelBg.fillRoundedRect(panelX - panelW/2, panelY, panelW, panelH, panelR);
        panelBg.lineStyle(4, neonPurple, 0.7);
        panelBg.strokeRoundedRect(panelX - panelW/2, panelY, panelW, panelH, panelR);
        panelBg.setDepth(1000);
        panelBg.alpha = 0;
        panelBg.shadowColor = neonPurple;
        panelBg.shadowBlur = 32;
        this.introGroup.add(panelBg);
        // Panel header
        const panelHeader = this.add.text(panelX, panelY + 28, 'Game Instructions', {
            fontSize: '24px',
            fill: '#b48cff',
            fontFamily: 'Arial Black, Arial, sans-serif',
            align: 'center',
            stroke: '#fff',
            strokeThickness: 2,
            shadow: { offsetX: 0, offsetY: 0, color: '#b48cff', blur: 12, fill: true }
        }).setOrigin(0.5).setDepth(1001).setAlpha(0);
        this.introGroup.add(panelHeader);
        // Instructions text (tighter word wrap and line spacing)
        const instrText = this.add.text(panelX, panelY + 60, instrTextBlock, {
            fontSize: '19px',
            fill: '#fff',
            fontFamily: 'monospace',
            align: 'left',
            wordWrap: { width: 300 },
            lineSpacing: 2
        }).setOrigin(0.5, 0).setDepth(1001).setAlpha(0);
        this.introGroup.add(instrText);
        // Hide all game UI until game starts
        this.introGroup.setVisible(true);
        this.children.list.forEach(child => {
            if (!this.introGroup.contains(child)) child.setVisible(false);
        });
        // Fade in intro elements
        this.tweens.add({ targets: this.introTitleGlow, alpha: 1, duration: 500, delay: 0 });
        this.tweens.add({ targets: this.introLevelText, alpha: 1, duration: 500, delay: 200 });
        this.tweens.add({ targets: btnBg, alpha: 1, duration: 500, delay: 400 });
        this.tweens.add({ targets: this.introStartBtn, alpha: 1, duration: 500, delay: 500 });
        this.tweens.add({ targets: this.introCredits, alpha: 1, duration: 500, delay: 900 });
        this.tweens.add({ targets: panelBg, alpha: 1, duration: 500, delay: 300 });
        this.tweens.add({ targets: panelHeader, alpha: 1, duration: 500, delay: 500 });
        this.tweens.add({ targets: instrText, alpha: 1, duration: 500, delay: 700 });
        // Start game on button click
        this.introStartBtn.on('pointerdown', () => {
            this.introGroup.setVisible(false);
            // Show all game UI
            this.children.list.forEach(child => {
                if (!this.introGroup.contains(child)) child.setVisible(true);
            });
            this.introActive = false;
            // Now create the game world, player, UI, and start enemy spawner
            this.createWorld();
            this.createPlayer();
            this.cursors = this.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D,
                up_arrow: Phaser.Input.Keyboard.KeyCodes.UP,
                down_arrow: Phaser.Input.Keyboard.KeyCodes.DOWN,
                left_arrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
                right_arrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
                math: Phaser.Input.Keyboard.KeyCodes.M
            });
            this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            this.keyM = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
            this.createUI();
            this.startEnemySpawner();
            this.mathOverlayVisible = false;
            this.awaitingMath = false;
            this.mathOverlayGroup = this.add.group();
        });
        // --- END INTRO SCREEN ---
        // Do not create world, player, UI, or spawner until intro is dismissed
    }

    createPlaceholderGraphics() {
        // Player (blue circle)
        let graphics = this.make.graphics({x: 0, y: 0, add: false});
        graphics.fillStyle(0x0000ff);
        graphics.fillCircle(16, 16, 16);
        graphics.generateTexture('player', 32, 32);
        graphics.clear();

        // Enemy (pink circle)
        graphics.fillStyle(0xff69b4);
        graphics.fillCircle(16, 16, 16);
        graphics.generateTexture('enemy_basic', 32, 32);
        graphics.clear();

        // Fire projectile (orange/yellow gradient circle with glow)
        graphics.fillStyle(0xff4400);
        graphics.fillCircle(12, 12, 12);
        graphics.fillStyle(0xff8800);
        graphics.fillCircle(12, 12, 8);
        graphics.fillStyle(0xffff00);
        graphics.fillCircle(12, 12, 4);
        graphics.generateTexture('fire_projectile', 24, 24);
        graphics.clear();

        // Scroll (yellow circle)
        graphics.fillStyle(0xffff00);
        graphics.fillCircle(10, 10, 10);
        graphics.generateTexture('scroll', 20, 20);
        graphics.destroy();
    }

    createWorld() {
        // Set world bounds
        this.physics.world.setBounds(0, 0, 960, 540);
    }

    createPlayer() {
        // Spawn player as a static image
        this.player = this.physics.add.image(480, 420, 'hero');
        this.player.setCollideWorldBounds(true);
        this.player.attackRange = 100;
        this.player.attackCooldown = 500;
        this.player.lastAttackTime = 0;
        this.player.attackDamage = 10;
        this.player.cooldownIndicator = this.add.graphics();
        this.player.setScale(0.08); // scale down for better fit
        this.player.setOrigin(0.5, 0.5); // Center origin for image
        this.player.setDepth(1); // ensure above background
        // Set a smaller, centered physics body for new asset size
        this.player.body.setSize(40, 70, true);
    }

    createUI() {
        // Health bar (top left)
        this.healthBarBg = this.add.rectangle(120, 30, 120, 16, 0x222222).setOrigin(0, 0.5).setDepth(20);
        this.healthBar = this.add.rectangle(120, 30, 120, 16, 0xff4444).setOrigin(0, 0.5).setDepth(21);
        this.healthBarBorder = this.add.rectangle(120, 30, 120, 16).setOrigin(0, 0.5).setStrokeStyle(2, 0xffffff).setDepth(22);
        // HP numbers
        this.healthBarText = this.add.text(180, 30, '30/30', { fontSize: '14px', fill: '#fff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(23);
        // Wave progress bar (top left, below health)
        this.waveBarBg = this.add.rectangle(120, 54, 120, 12, 0x222222).setOrigin(0, 0.5).setDepth(20);
        this.waveBar = this.add.rectangle(120, 54, 120, 12, 0x00e0ff).setOrigin(0, 0.5).setDepth(21);
        this.waveBarBorder = this.add.rectangle(120, 54, 120, 12).setOrigin(0, 0.5).setStrokeStyle(2, 0xffffff).setDepth(22);
        // Wave numbers
        this.waveBarText = this.add.text(180, 54, '0/100', { fontSize: '14px', fill: '#fff', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(23);
        // Show wave number below the bar
        this.waveNumberText = this.add.text(180, 70, 'Wave 1', { fontSize: '16px', fill: '#5eeaff', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5).setDepth(23);
        // Remove level text
        if (this.levelText) this.levelText.setVisible(false);
        // Timer (top center)
        this.timerText = this.add.text(480, 30, '00:00', {
            fontSize: '28px',
            fill: '#fff',
            fontFamily: 'Arial',
        }).setOrigin(0.5).setDepth(20);
        // Kills (top right)
        this.killsText = this.add.text(820, 30, '💀 0', {
            fontSize: '24px',
            fill: '#fff',
            fontFamily: 'Arial',
        }).setDepth(20);
        // Currency (top right)
        this.currencyText = this.add.text(900, 30, '💰 0', {
            fontSize: '24px',
            fill: '#fff',
            fontFamily: 'Arial',
        }).setDepth(20);
        // Instructions (bottom center)
        this.instructionsText = this.add.text(480, 520, 'Press M to open a math scroll', {
            fontSize: '18px',
            fill: '#fff',
            fontFamily: 'Arial',
        }).setOrigin(0.5).setDepth(20);
        // Create awaiting math message UI
        this.awaitingMathBg = this.add.rectangle(480, 270, 200, 40, 0x000000, 0.8)
            .setOrigin(0.5)
            .setDepth(100)
            .setVisible(false);
        this.awaitingMathText = this.add.text(480, 270, 'Press M to answer math question', {
            fontSize: '18px',
            fill: '#fff',
            fontFamily: 'monospace',
            align: 'center'
        }).setOrigin(0.5).setDepth(101).setVisible(false);
        // Create math overlay UI (modern quiz style)
        const panelW = 600, panelH = 380, panelR = 32;
        // Remove old overlay background rectangle
        // this.mathOverlayBg = this.add.rectangle(480, 270, panelW, panelH, 0x181a22, 0.98)
        //     .setOrigin(0.5)
        //     .setDepth(300)
        //     .setVisible(false);

        // Use a single graphics object for both fill and stroke
        this.mathOverlayPanel = this.add.graphics();
        this.mathOverlayPanel.clear();
        this.mathOverlayPanel.fillStyle(0x181a22, 0.98);
        this.mathOverlayPanel.fillRoundedRect(480 - panelW/2, 270 - panelH/2, panelW, panelH, panelR);
        this.mathOverlayPanel.lineStyle(8, 0x00eaff, 0.7);
        this.mathOverlayPanel.strokeRoundedRect(480 - panelW/2, 270 - panelH/2, panelW, panelH, panelR);
        this.mathOverlayPanel.setDepth(299).setVisible(false);

        // Title
        this.mathOverlayTitle = this.add.text(480, 270 - panelH/2 + 48, 'MATH CHALLENGE', {
            fontSize: '44px',
            fill: '#fff',
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#00eaff',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#00eaff', blur: 18, fill: true }
        }).setOrigin(0.5).setDepth(301).setVisible(false);
        // Question
        this.mathQuestionText = this.add.text(480, 270 - panelH/2 + 110, '', {
            fontSize: '36px',
            fill: '#fff',
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#fff',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(302).setVisible(false);
        // Answer buttons (2x2 grid, centered)
        this.mathAnswerButtons = [];
        const btnW = 200, btnH = 70, btnR = 24;
        const btnColors = { fill: 0x3ab0ff, stroke: 0xffffff };
        // Center the grid
        const gridRows = 2, gridCols = 2;
        const btnSpacingX = 40, btnSpacingY = 28;
        const totalBtnW = gridCols * btnW + (gridCols - 1) * btnSpacingX;
        const totalBtnH = gridRows * btnH + (gridRows - 1) * btnSpacingY;
        // Calculate vertical position: place grid below question, centered in lower part of panel
        const questionFontSize = 36;
        const questionY = 270 - panelH/2 + 110;
        const questionBottomY = questionY + questionFontSize/2;
        const gridTopY = questionBottomY + 32; // 32px gap below question
        for (let i = 0; i < 4; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            const x = 480 - totalBtnW/2 + btnW/2 + col * (btnW + btnSpacingX);
            const y = gridTopY + row * (btnH + btnSpacingY) + btnH/2;
            // Button background
            const btnBg = this.add.graphics();
            btnBg.fillStyle(btnColors.fill, 1);
            btnBg.fillRoundedRect(x - btnW/2, y - btnH/2, btnW, btnH, btnR);
            btnBg.lineStyle(4, 0x00eaff, 0.7);
            btnBg.strokeRoundedRect(x - btnW/2, y - btnH/2, btnW, btnH, btnR);
            btnBg.setDepth(303).setVisible(false);
            // Button text
            const btn = this.add.text(x, y, '', {
                fontSize: '32px',
                fill: '#fff',
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontStyle: 'bold',
                align: 'center',
                stroke: '#fff',
                strokeThickness: 2,
                shadow: { offsetX: 0, offsetY: 0, color: '#00eaff', blur: 8, fill: true }
            }).setOrigin(0.5).setDepth(304).setVisible(false).setInteractive({ useHandCursor: true });
            btn.on('pointerdown', () => this.handleMathAnswer(i));
            this.mathAnswerButtons.push({ btn, btnBg });
        }
        // Feedback text
        this.mathFeedbackText = this.add.text(480, 270 + panelH/2 - 40, '', {
            fontSize: '28px',
            fill: '#fff',
            fontFamily: 'Arial Black, Arial, sans-serif',
            align: 'center',
            stroke: '#00eaff',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(305).setVisible(false);
        // Store overlay (hidden by default)
        this.storeOverlayGroup = this.add.group();
        this.storeOverlayBg = this.add.rectangle(480, 270, 900, 340, 0x181a22, 0.98)
            .setStrokeStyle(4, 0xff00ff)
            .setDepth(100).setVisible(false);
        this.storeOverlayGroup.add(this.storeOverlayBg);
        // Power-up data
        this.powerUps = [
            {
                icon: '🌀',
                name: 'Invisibility Dash',
                desc: 'Unlock stealth movement for 5 seconds once per wave',
                cost: 50,
                level: 0,
                maxLevel: 1
            },
            {
                icon: '💉',
                name: 'Accelerated Recovery',
                desc: 'Passive health regeneration at 0.5 HP/sec',
                cost: 60,
                level: 0,
                maxLevel: 1
            },
            {
                icon: '☄️',
                name: 'Poison Zone Blast',
                desc: 'Left-click: Shoot a fireball that creates a poison zone (10s cooldown)',
                cost: 80,
                level: 0,
                maxLevel: 1
            },
            {
                icon: '💥',
                name: 'Ultra One-Shot Blast',
                desc: 'Right-click: Massive blast, usable 2x per game',
                cost: 100,
                level: 0,
                maxLevel: 1
            }
        ];
        this.powerUpCards = [];
        const cardW = 240, cardH = 300, cardSpacing = 20;
        const startX = 480 - (2 * cardW + 1.5 * cardSpacing);
        for (let i = 0; i < this.powerUps.length; i++) {
            const x = startX + i * (cardW + cardSpacing);
            // Card background
            const cardBg = this.add.rectangle(x, 270, cardW, cardH, 0x23242a, 0.98)
                .setStrokeStyle(3, 0xff00ff)
                .setDepth(101).setVisible(false);
            // Icon
            const icon = this.add.text(x, 120, this.powerUps[i].icon, {
                fontSize: '48px',
                fontFamily: 'Arial',
                align: 'center',
            }).setOrigin(0.5).setDepth(102).setVisible(false);
            // Name
            const name = this.add.text(x, 160, this.powerUps[i].name, {
                fontSize: '22px',
                fill: '#fff',
                fontFamily: 'monospace',
                fontStyle: 'bold',
                align: 'center',
            }).setOrigin(0.5).setDepth(102).setVisible(false);
            // Description
            const desc = this.add.text(x, 200, this.powerUps[i].desc, {
                fontSize: '16px',
                fill: '#ccc',
                fontFamily: 'monospace',
                align: 'center',
                wordWrap: { width: cardW - 40 }
            }).setOrigin(0.5, 0).setDepth(102).setVisible(false);
            // Cost badge (top right)
            const costBadge = this.add.rectangle(x + cardW/2 - 22, 120 - cardH/2 + 22, 32, 32, 0x181a22, 1)
                .setStrokeStyle(2, 0xff00ff).setDepth(103).setVisible(false);
            const costText = this.add.text(x + cardW/2 - 22, 120 - cardH/2 + 22, this.powerUps[i].cost.toString(), {
                fontSize: '18px', fill: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold', align: 'center'
            }).setOrigin(0.5).setDepth(104).setVisible(false);
            // Level badge (top right, next to cost)
            const levelBadge = this.add.rectangle(x + cardW/2 - 22, 120 - cardH/2 + 60, 28, 28, 0x181a22, 1)
                .setStrokeStyle(2, 0xffffff).setDepth(103).setVisible(false);
            const levelText = this.add.text(x + cardW/2 - 22, 120 - cardH/2 + 60, '0', {
                fontSize: '16px', fill: '#fff', fontFamily: 'monospace', align: 'center'
            }).setOrigin(0.5).setDepth(104).setVisible(false);
            // Clickable area
            const cardArea = this.add.rectangle(x, 270, cardW, cardH, 0xffffff, 0.01)
                .setInteractive({ useHandCursor: true }).setDepth(110).setVisible(false);
            cardArea.on('pointerdown', () => this.purchasePowerUp(i));
            this.storeOverlayGroup.addMultiple([cardBg, icon, name, desc, costBadge, costText, levelBadge, levelText, cardArea]);
            this.powerUpCards.push({ cardBg, icon, name, desc, costBadge, costText, levelBadge, levelText, cardArea });
        }
        this.storeContinueText = this.add.text(480, 520, 'Press SPACE to continue', {
            fontSize: '20px',
            fill: '#ffd700',
            fontFamily: 'Arial',
            align: 'center',
        }).setOrigin(0.5).setDepth(101).setVisible(false);
        this.storeBuyButton = this.add.text(480, 520, 'Buy/Upgrade', {
            fontSize: '24px',
            fill: '#fff',
            backgroundColor: '#222a38',
            padding: { left: 20, right: 20, top: 10, bottom: 10 },
            fontFamily: 'Arial',
            align: 'center',
            borderRadius: 8
        }).setOrigin(0.5).setDepth(102).setVisible(false).setInteractive({ useHandCursor: true });
        this.storeBuyButton.on('pointerdown', () => this.confirmPurchasePowerUp());
        this.storeMessageText = this.add.text(480, 560, '', {
            fontSize: '20px',
            fill: '#ff4444',
            fontFamily: 'Arial',
            align: 'center',
            backgroundColor: '#222a38',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(0.5).setDepth(102).setVisible(false);
        // Power-up UI icons (top center)
        this.powerUpIcons = [];
        const iconList = [
            { key: 'invisibilityDash', icon: '🌀' },
            { key: 'acceleratedRecovery', icon: '💉' },
            { key: 'poisonZone', icon: '☄️' },
            { key: 'ultraBlast', icon: '💥' }
        ];
        for (let i = 0; i < iconList.length; i++) {
            const icon = this.add.text(320 + i * 48, 70, iconList[i].icon, {
                fontSize: '32px', fill: '#fff', fontFamily: 'Arial', fontStyle: 'bold', align: 'center'
            }).setOrigin(0.5).setDepth(30).setVisible(false);
            const count = this.add.text(340 + i * 48, 56, '', {
                fontSize: '18px', fill: '#ffd700', fontFamily: 'Arial', fontStyle: 'bold', align: 'center'
            }).setOrigin(0, 0).setDepth(31).setVisible(false);
            this.powerUpIcons.push({ icon, count, key: iconList[i].key });
        }
    }

    startEnemySpawner() {
        this.enemySpawnEvent = this.time.addEvent({
            delay: 2000,
            callback: () => {
                if (!this.mathOverlayVisible && !this.storeActive) {
                    // Calculate spawn count based on current enemies
                    const currentEnemies = this.enemies.filter(e => e.active).length;
                    const maxEnemies = 10;
                    const availableSlots = maxEnemies - currentEnemies;
                    
                    if (availableSlots > 0) {
                        // Spawn fewer enemies if we're close to the limit
                        const spawnCount = Math.min(
                            Math.min(3, Math.floor(this.currentWave / 2) + 1),
                            availableSlots
                        );
                        
                        for (let i = 0; i < spawnCount; i++) {
                            this.spawnEnemy('basic');
                        }
                    }
                }
            },
            callbackScope: this,
            loop: true
        });
        // Initial spawn of 3 enemies
        for (let i = 0; i < 3; i++) {
            this.spawnEnemy('basic');
        }
    }

    spawnEnemy(type = 'basic') {
        // Limit max enemies
        const MAX_ENEMIES = 10;
        if (this.enemies.length >= MAX_ENEMIES) return;
        
        let x, y;
        let tries = 0;
        const MIN_DISTANCE = 240; // Increased minimum distance between enemies and from player
        
        do {
            // 70% chance to spawn at edges, 30% chance to spawn in a random position
            if (Math.random() < 0.7) {
                const edge = Phaser.Math.Between(0, 3);
                if (edge === 0) { x = Phaser.Math.Between(0, 960); y = 0; }
                else if (edge === 1) { x = 960; y = Phaser.Math.Between(0, 540); }
                else if (edge === 2) { x = Phaser.Math.Between(0, 960); y = 540; }
                else { x = 0; y = Phaser.Math.Between(0, 540); }
            } else {
                // Spawn in a random position within the screen
                x = Phaser.Math.Between(100, 860);
                y = Phaser.Math.Between(100, 440);
            }
            tries++;
            
            // Check distance from all existing enemies
            const tooClose = this.enemies.some(e => 
                e.active && Phaser.Math.Distance.Between(e.x, e.y, x, y) < MIN_DISTANCE
            );
            
            // Also check distance from player
            const tooCloseToPlayer = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y) < MIN_DISTANCE;
            
            // If position is good or we've tried too many times, break the loop
            if (!tooClose && !tooCloseToPlayer || tries >= 10) break;
            
        } while (tries < 10);
        
        // If we couldn't find a good position after 10 tries, don't spawn
        if (tries >= 10) return;
        
        let enemy;
        if (type === 'basic') {
            // Alternate asset by wave: odd = endermen, even = spiderjockey
            const assetKey = (this.currentWave % 2 === 1) ? 'enemy_basic' : 'spiderjockey';
            enemy = this.physics.add.image(x, y, assetKey);
            enemy.type = 'basic';
            // Always 2-hit kill: 20 HP
            enemy.maxHealth = 20;
            enemy.health = enemy.maxHealth;
            const speedMultiplier = 1 + (this.currentWave - 1) * 0.04; // Slightly slower scaling
            enemy.speed = Math.floor(100 * speedMultiplier); // Lowered base speed further
            enemy.setScale(0.06); // scale down for better fit
            enemy.setOrigin(0.5, 0.5); // Ensure center origin
            // Set a smaller, centered physics body for new asset size
            enemy.body.setSize(30, 60, true);
            // Add random movement pattern
            enemy.movementPattern = Math.random() < 0.12 ? 'zigzag' : 'direct'; // Only 12% zigzag
            enemy.zigzagTimer = 0;
            enemy.zigzagDirection = 1;
        }
        this.enemies.push(enemy);
    }

    update(time, delta) {
        if (this.introActive) return; // Block all game logic while intro is up
        if (this.gameOver) return;
        
        // Update player invulnerability timer
        if (this.playerInvulnTimer > 0) {
            this.playerInvulnTimer -= delta / 1000;
            if (this.playerInvulnTimer < 0) this.playerInvulnTimer = 0;
        }
        
        if (this.storeActive || this.mathOverlayVisible) {
            // Pause everything except overlay
            this.physics.world.pause();
            if (this.enemySpawnEvent) this.enemySpawnEvent.paused = true;
            
            // Handle store controls
            if (this.storeActive) {
                if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
                    this.hideStoreOverlay();
                }
                // Debug log for M key
                if (Phaser.Input.Keyboard.JustDown(this.keyM)) {
                    console.log('M key pressed in store, toggling math overlay');
                    this.toggleMathOverlay();
                    return; // Return to prevent the store from hiding
                }
            }
            return;
        } else {
            this.physics.world.resume();
            if (this.enemySpawnEvent) this.enemySpawnEvent.paused = false;
        }

        this.elapsedTime += delta / 1000;
        // Health regen
        let regen = this.healthRegenRate;
        if (this.powerUpState.acceleratedRecovery.unlocked) regen += 0.5;
        if (this.playerHealth < this.playerMaxHealth) {
            this.healthRegenAccumulator += delta / 1000;
            const regenAmount = Math.floor(this.healthRegenAccumulator * regen);
            if (regenAmount > 0) {
                this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + regenAmount);
                this.healthRegenAccumulator -= regenAmount / regen;
            }
        } else {
            this.healthRegenAccumulator = 0;
        }
        // Power-up cooldowns
        if (this.powerUpState.poisonZone.cooldown > 0) {
            this.powerUpState.poisonZone.cooldown -= delta / 1000;
            if (this.powerUpState.poisonZone.cooldown < 0) this.powerUpState.poisonZone.cooldown = 0;
        }
        if (this.powerUpState.ultraBlast.cooldown > 0) {
            this.powerUpState.ultraBlast.cooldown -= delta / 1000;
            if (this.powerUpState.ultraBlast.cooldown < 0) this.powerUpState.ultraBlast.cooldown = 0;
        }
        // Invisibility Dash timer
        if (this.powerUpState.invisibilityDash.active) {
            this.powerUpState.invisibilityDash.timer -= delta / 1000;
            if (this.powerUpState.invisibilityDash.timer <= 0) {
                this.powerUpState.invisibilityDash.active = false;
                this.player.setAlpha(1);
                this.player.speed = 200;
            }
        }
        // Handle E key for power-ups
        if (!this.input.keyboard._phaserPowerUpE) {
            this.input.keyboard._phaserPowerUpE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        }
        if (Phaser.Input.Keyboard.JustDown(this.input.keyboard._phaserPowerUpE)) {
            this.handlePowerUpActivation();
        }
        this.handlePlayerMovement();
        this.handlePlayerAutoAttack();
        this.updateEnemies();
        this.updateUI();
        // Show/hide awaiting math message
        if (this.storeActive) {
            this.awaitingMathText.setVisible(false);
            this.awaitingMathBg.setVisible(false);
        } else {
            if (this.awaitingMath) {
                // Position above player, but clamp to screen
                let px = this.player.x;
                let py = this.player.y - 70;
                px = Phaser.Math.Clamp(px, 180, this.scale.width - 180);
                py = Phaser.Math.Clamp(py, 60, this.scale.height - 60);
                this.awaitingMathText.setPosition(px, py);
                this.awaitingMathBg.setPosition(px, py);
                // Adjust background size to fit text
                const tw = this.awaitingMathText.width + 36;
                const th = this.awaitingMathText.height + 18;
                this.awaitingMathBg.setSize(tw, th);
            }
            this.awaitingMathText.setVisible(this.awaitingMath);
            this.awaitingMathBg.setVisible(this.awaitingMath);
        }
        // Allow pressing M to open math overlay at any time (unless overlay/store is open)
        if (!this.storeActive && !this.mathOverlayVisible && Phaser.Input.Keyboard.JustDown(this.keyM)) {
            this.toggleMathOverlay();
        }
        this.drawCooldownIndicator();
    }

    handlePlayerMovement() {
        const speed = 200;
        // WASD or Arrow keys
        let vx = 0, vy = 0;
        if (this.cursors.left.isDown || this.cursors.left_arrow.isDown) {
            vx = -speed;
        } else if (this.cursors.right.isDown || this.cursors.right_arrow.isDown) {
            vx = speed;
        }
        if (this.cursors.up.isDown || this.cursors.up_arrow.isDown) {
            vy = -speed;
        } else if (this.cursors.down.isDown || this.cursors.down_arrow.isDown) {
            vy = speed;
        }
        this.player.setVelocity(vx, vy);
        // Flip image when moving left/right
        if (vx > 0) {
            this.player.setFlipX(false);
        } else if (vx < 0) {
            this.player.setFlipX(true);
        }
    }

    handlePlayerAutoAttack() {
        if (!this.playerCanAttack) return;
        const currentTime = this.time.now;
        if (currentTime - this.player.lastAttackTime >= 500) {
            // Find nearest enemy in 120px
            let closestEnemy = null;
            let minDist = 120;
            this.enemies.forEach(enemy => {
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                if (dist <= minDist) {
                    minDist = dist;
                    closestEnemy = enemy;
                }
            });
            if (closestEnemy) {
                this.spawnAttackProjectile(this.player.x, this.player.y, closestEnemy);
                this.player.lastAttackTime = currentTime;
            }
        }
    }

    spawnAttackProjectile(x, y, targetEnemy) {
        const projectile = this.physics.add.sprite(x, y, 'fire_projectile');
        projectile.setDepth(2);
        projectile.setScale(1.2); // Slightly larger fire projectile
        projectile.setOrigin(0.5, 0.5); // Ensure center origin
        
        // Add particle emitter for fire trail
        const particles = this.add.particles(0, 0, 'fire_projectile', {
            speed: 20,
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            lifespan: 300,
            frequency: 20,
            follow: projectile
        });

        const angle = Phaser.Math.Angle.Between(x, y, targetEnemy.x, targetEnemy.y);
        const speed = 500;
        this.physics.moveTo(projectile, targetEnemy.x, targetEnemy.y, speed);
        
        // Add rotation to make it look more dynamic
        projectile.rotation = angle;
        
        const hitHandler = () => {
            if (!targetEnemy.active) return;
            // Create hit effect and destroy it after 400ms
            const hitParticles = this.add.particles(projectile.x, projectile.y, 'fire_projectile', {
                speed: { min: 50, max: 100 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.4, end: 0 },
                alpha: { start: 0.6, end: 0 },
                lifespan: 400,
                quantity: 10,
                blendMode: 'ADD'
            });
            this.time.delayedCall(400, () => hitParticles.destroy());
            this.dealDamageToEnemy(targetEnemy, 10, projectile.x, projectile.y);
            projectile.destroy();
            particles.destroy();
        };
        
        this.physics.add.overlap(projectile, targetEnemy, hitHandler, null, this);
        this.time.delayedCall(300, () => {
            if (projectile && projectile.active) {
                projectile.destroy();
                particles.destroy();
            }
        });
        // Increment shots fired and check for math question
        this.playerShotsFired++;
        if (this.playerShotsFired % 8 === 0) {
            this.playerCanAttack = false;
            this.awaitingMath = true;
        }
    }

    dealDamageToEnemy(enemy, damage, hitX, hitY) {
        this.sound.play('hit_sfx', { volume: 0.5 }); // Play hit sound when enemy is hit
        enemy.health -= damage;
        this.showDamageNumber(enemy.x, enemy.y, `-${damage}`); // Use enemy.x, enemy.y for accuracy
        if (enemy.health <= 0) {
            this.spawnScroll(enemy.x, enemy.y); // Spawn scroll at exact enemy position
            enemy.destroy();
            this.enemies = this.enemies.filter(e => e !== enemy);
            this.killsThisWave++;
            this.totalKills++;
            // Remove math trigger from kills
            // if (this.killsThisWave % 5 === 0) {
            //     this.playerCanAttack = false;
            //     this.awaitingMath = true;
            // }
            // (Removed: wave increment here, now handled only in spawnScroll)
        }
    }

    // Optional: Draw a cooldown indicator arc around the player
    drawCooldownIndicator() {
        const currentTime = this.time.now;
        const elapsed = currentTime - this.player.lastAttackTime;
        const pct = Phaser.Math.Clamp(elapsed / this.player.attackCooldown, 0, 1);
        const radius = 24;
        this.player.cooldownIndicator.clear();
        if (pct < 1) {
            this.player.cooldownIndicator.lineStyle(3, 0xff2222, 0.7);
            this.player.cooldownIndicator.beginPath();
            this.player.cooldownIndicator.arc(this.player.x, this.player.y, radius, -Math.PI/2, -Math.PI/2 + Math.PI*2*pct, false);
            this.player.cooldownIndicator.strokePath();
        }
    }

    updateEnemies() {
        // Enemy separation: repel nearby enemies
        const separationDist = 60; // Stronger separation
        const separationStrength = 180; // Much stronger force
        for (let i = 0; i < this.enemies.length; i++) {
            const e1 = this.enemies[i];
            if (!e1.active) continue;
            let sepX = 0, sepY = 0;
            for (let j = 0; j < this.enemies.length; j++) {
                if (i === j) continue;
                const e2 = this.enemies[j];
                if (!e2.active) continue;
                const dist = Phaser.Math.Distance.Between(e1.x, e1.y, e2.x, e2.y);
                if (dist < separationDist && dist > 0) {
                    sepX += (e1.x - e2.x) / dist;
                    sepY += (e1.y - e2.y) / dist;
                }
            }
            if (sepX !== 0 || sepY !== 0) {
                const len = Math.sqrt(sepX * sepX + sepY * sepY);
                e1.x += (sepX / len) * (separationStrength * 0.016);
                e1.y += (sepY / len) * (separationStrength * 0.016);
            }
        }
        // Remove inactive/destroyed enemies from the array
        this.enemies = this.enemies.filter(enemy => enemy.active !== false);
        this.enemies.forEach((enemy, idx) => {
            if (!enemy.active) return;
            // Offset targeting: each enemy gets a unique offset around the player
            if (!enemy.targetOffset) {
                // Assign a random offset (radius 40-80, random angle)
                const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                const radius = Phaser.Math.Between(40, 80);
                enemy.targetOffset = {
                    x: Math.cos(angle) * radius,
                    y: Math.sin(angle) * radius
                };
            }
            let targetX = this.player.x + enemy.targetOffset.x;
            let targetY = this.player.y + enemy.targetOffset.y;
            // Add a small random jitter (reduced)
            targetX += Phaser.Math.Between(-3, 3);
            targetY += Phaser.Math.Between(-3, 3);
            let vx, vy;
            if (enemy.movementPattern === 'zigzag') {
                // Update zigzag timer (slower frequency)
                enemy.zigzagTimer += 0.012;
                if (enemy.zigzagTimer >= 1.5) {
                    enemy.zigzagTimer = 0;
                    enemy.zigzagDirection *= -1;
                }
                // Calculate base movement towards offset target
                const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
                const baseSpeed = enemy.speed * 0.7; // Lower zigzag base speed
                vx = Math.cos(angle) * baseSpeed;
                vy = Math.sin(angle) * baseSpeed;
                // Add perpendicular movement for zigzag (reduced)
                const perpAngle = angle + (Math.PI/2 * enemy.zigzagDirection);
                const perpSpeed = enemy.speed * 0.18; // Lower zigzag amplitude
                vx += Math.cos(perpAngle) * perpSpeed;
                vy += Math.sin(perpAngle) * perpSpeed;
            } else {
                // Direct movement towards offset target
                const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
                vx = Math.cos(angle) * enemy.speed;
                vy = Math.sin(angle) * enemy.speed;
            }
            enemy.setVelocity(vx, vy);
            // Flip image when moving left/right
            if (vx > 0) {
                enemy.setFlipX(false);
            } else if (vx < 0) {
                enemy.setFlipX(true);
            }
            // Check collision with player (smaller range for new assets)
            if (Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) < 16) {
                if (this.powerUpState.invisibilityDash.active) {
                    // Kill enemy and collect points during invisibility
                    this.spawnScroll(enemy.x, enemy.y);
                    enemy.destroy();
                    // Enemy will be removed at the start of next updateEnemies
                    this.killsThisWave++;
                    this.totalKills++;
                    this.waveProgress += 10;
                } else {
                    // Only damage if not invulnerable
                    if (this.playerInvulnTimer === 0) {
                        // Count nearby enemies for crowd damage
                        const nearbyEnemies = this.enemies.filter(e => 
                            e.active && Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < 32
                        ).length;
                        // Base damage of 3, increased by 1 for each additional nearby enemy (up to 2 extra)
                        const crowdMultiplier = Math.min(nearbyEnemies, 3);
                        const damage = Math.min(3 * crowdMultiplier, 6); // Cap at 6
                        this.damagePlayer(damage);
                        this.playerInvulnTimer = 0.7;
                    }
                    // Enemy is NOT destroyed, stays alive
                }
            }
        });
    }

    spawnScroll(x, y) {
        const scroll = this.physics.add.sprite(x, y, 'scroll');
        scroll.setScale(0.03); // scale down enderpearl for better fit
        scroll.setOrigin(0.5, 0.5); // Ensure center origin
        this.physics.add.overlap(this.player, scroll, () => {
            this.scrolls++;
            this.waveProgress += 10;
            this.killsThisWave = Math.floor(this.waveProgress / 10);
            scroll.destroy();
            // After every 5 kills, require math question to resume attacking
            if (this.killsThisWave > 0 && this.killsThisWave % 5 === 0) {
                this.playerCanAttack = false;
                this.awaitingMath = true;
            }
            // Wave up after reaching wave target
            if (this.waveProgress >= this.waveTarget) {
                this.currentWave++;
                this.killsThisWave = 0;
                this.waveProgress = 0;
                this.waveTarget = 50 + (this.currentWave - 1) * 30;
                // Reset power-ups at the start of each wave
                this.resetPowerUpsForNewWave();
                this.updateBackgroundForWave();
                this.showStoreOverlay();
            }
        });
    }

    showDamageNumber(x, y, damage) {
        const text = this.add.text(x, y, damage, {
            fontSize: '20px',
            fill: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.tweens.add({
            targets: text,
            y: y - 30,
            alpha: 0,
            duration: 700,
            onComplete: () => text.destroy()
        });
    }

    updateUI() {
        // Health bar
        const healthPct = Phaser.Math.Clamp(this.playerHealth / this.playerMaxHealth, 0, 1);
        this.healthBar.width = 120 * healthPct;
        this.healthBarText.setText(`${Math.floor(this.playerHealth)}/${this.playerMaxHealth}`);
        // Wave progress bar
        const wavePct = Phaser.Math.Clamp(this.waveProgress / this.waveTarget, 0, 1);
        this.waveBar.width = 120 * wavePct;
        this.waveBarText.setText(`${this.waveProgress}/${this.waveTarget}`);
        // Show wave number below the bar
        this.waveNumberText.setText(`Wave ${this.currentWave}`);
        // Timer
        const minutes = Math.floor(this.elapsedTime / 60);
        const seconds = Math.floor(this.elapsedTime % 60);
        this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        // Kills
        this.killsText.setText(`💀 ${this.killsThisWave}`);
        // Currency
        this.currencyText.setText(`💰 ${this.currency}`);
        // Power-up icons UI
        let iconX = this.scale.width/2 - 80;
        for (let i = 0; i < this.powerUpIcons.length; i++) {
            const p = this.powerUpIcons[i];
            const state = this.powerUpState[p.key];
            if (state && state.unlocked) {
                p.icon.setVisible(true);
                p.icon.setPosition(iconX, 70);
                // Highlight if active
                if (p.key === 'invisibilityDash' && state.active) {
                    p.icon.setStyle({ backgroundColor: '#ffe066', color: '#222' });
                } else if (p.key === 'poisonZone' && state.cooldown > 0) {
                    p.icon.setStyle({ backgroundColor: '#888', color: '#fff' });
                } else if (p.key === 'ultraBlast' && state.cooldown > 0) {
                    p.icon.setStyle({ backgroundColor: '#888', color: '#fff' });
                } else {
                    p.icon.setStyle({ backgroundColor: '', color: '#fff' });
                }
                // Show count for multi-use powers
                if (p.key === 'invisibilityDash') {
                    p.count.setText(state.uses.toString()).setVisible(true);
                    p.count.setPosition(iconX + 18, 56);
                } else if (p.key === 'ultraBlast') {
                    p.count.setText(state.uses.toString()).setVisible(true);
                    p.count.setPosition(iconX + 18, 56);
                } else {
                    p.count.setVisible(false);
                }
                iconX += 48;
            } else {
                p.icon.setVisible(false);
                p.count.setVisible(false);
            }
        }
    }

    toggleMathOverlay() {
        // Safety check to ensure all required elements exist
        if (!this.mathOverlayPanel || !this.mathOverlayTitle || !this.mathQuestionText || !this.mathAnswerButtons || !this.mathFeedbackText) {
            console.error('Math overlay elements not properly initialized');
            return;
        }

        this.mathOverlayVisible = !this.mathOverlayVisible;
        // Set all math overlay elements to high depth (above store)
        this.mathOverlayPanel.setVisible(this.mathOverlayVisible).setDepth(299);
        this.mathOverlayTitle.setVisible(this.mathOverlayVisible).setDepth(301);
        this.mathQuestionText.setVisible(this.mathOverlayVisible).setDepth(302);
        this.mathAnswerButtons.forEach(({btn, btnBg}) => {
            btn.setVisible(this.mathOverlayVisible).setDepth(303);
            btnBg.setVisible(this.mathOverlayVisible).setDepth(302);
        });
        this.mathFeedbackText.setVisible(false).setDepth(304);
        // Always hide the awaiting math prompt when showing overlay
        if (this.mathOverlayVisible) {
            this.generateMathChallenge();
            this.awaitingMathText.setVisible(false);
            this.awaitingMathBg.setVisible(false);
        }
    }

    generateMathChallenge() {
        const a = Phaser.Math.Between(2, 9);
        const b = Phaser.Math.Between(2, 9);
        const correct = a * b;
        let answers = [correct];
        while (answers.length < 4) {
            let wrong = Phaser.Math.Between(4, 81);
            if (!answers.includes(wrong)) answers.push(wrong);
        }
        Phaser.Utils.Array.Shuffle(answers);
        this.mathCurrentCorrectIndex = answers.indexOf(correct);
        this.mathQuestionText.setText(`What is ${a} × ${b}?`);
        for (let i = 0; i < 4; i++) {
            this.mathAnswerButtons[i].btn.setText(answers[i]);
        }
    }

    handleMathAnswer(index) {
        if (!this.mathOverlayVisible) return;
        if (index === this.mathCurrentCorrectIndex) {
            this.flameShards += 5;
            this.currency += 10; // 10 currency for correct answer
            this.mathFeedbackText.setText('Correct! +10 Currency');
            this.mathFeedbackText.setStyle({ fill: '#00ff88', backgroundColor: '#222' });
            this.playerCanAttack = true;
            this.awaitingMath = false;
            this.playerShotsFired = 0; // Reset shots fired counter after answering
            // Update store UI if in store
            if (this.storeActive) {
                this.updateUI();
                this.showStoreOverlay(); // Refresh store UI with new currency
            }
        } else {
            this.mathFeedbackText.setText('Incorrect!');
            this.mathFeedbackText.setStyle({ fill: '#ff4444', backgroundColor: '#222' });
        }
        this.mathFeedbackText.setVisible(true);
        this.time.delayedCall(1000, () => {
            this.mathOverlayVisible = false;
            this.mathOverlayPanel.setVisible(false);
            this.mathOverlayTitle.setVisible(false);
            this.mathQuestionText.setVisible(false);
            this.mathAnswerButtons.forEach(({btn, btnBg}) => {
                btn.setVisible(false);
                btnBg.setVisible(false);
            });
            this.mathFeedbackText.setVisible(false);
        });
    }

    damagePlayer(amount) {
        if (this.powerUpState.invisibilityDash.active) return; // immunity
        this.playerHealth = Math.max(0, this.playerHealth - amount);
        if (this.playerHealth <= 0 && !this.gameOver) {
            this.gameOver = true;
            this.showGameOver();
        }
    }

    showStoreOverlay() {
        this.storeActive = true;
        // Hide awaiting math message when store is open
        this.awaitingMathText.setVisible(false);
        this.awaitingMathBg.setVisible(false);
        const w = this.scale.width;
        const h = this.scale.height;
        const maxCards = this.powerUpCards.length;
        const margin = 32;
        let availableW = w - 2 * margin;
        let maxCardW = 220, minCardW = 120, cardH = 300, minSpacing = 12, maxSpacing = 32;
        let cardW = Math.min(maxCardW, Math.max(minCardW, Math.floor((availableW - (maxCards - 1) * minSpacing) / maxCards)));
        let spacing = Math.max(minSpacing, Math.min(maxSpacing, Math.floor((availableW - cardW * maxCards) / (maxCards - 1))));
        if (cardW * maxCards + spacing * (maxCards - 1) > availableW) {
            cardW = Math.floor((availableW - spacing * (maxCards - 1)) / maxCards);
        }
        const totalCardW = cardW * maxCards + spacing * (maxCards - 1);
        const startX = w/2 - totalCardW/2 + cardW/2;
        this.storeOverlayBg.setSize(totalCardW + 2 * margin, cardH + 60).setPosition(w/2, h/2).setVisible(true);
        for (let i = 0; i < this.powerUpCards.length; i++) {
            const x = startX + i * (cardW + spacing);
            const card = this.powerUpCards[i];
            const powerUp = this.powerUps[i];
            const iconSize = Math.floor(cardW/5);
            const titleSize = Math.floor(cardW/13);
            const descSize = Math.floor(cardW/18);
            card.icon.setPosition(x, h/2 - cardH/2 + 48).setFontSize(iconSize + 'px').setVisible(true);
            card.name.setPosition(x, h/2 - cardH/2 + 90).setFontSize(titleSize + 'px').setVisible(true);
            card.desc.setPosition(x, h/2 - cardH/2 + 120).setFontSize(descSize + 'px').setWordWrapWidth(cardW - 32).setVisible(true);
            card.cardBg.setPosition(x, h/2).setSize(cardW, cardH).setVisible(true);
            card.costBadge.setPosition(x + cardW/2 - 24, h/2 - cardH/2 + 20).setSize(32, 32).setVisible(true);
            card.costText.setPosition(x + cardW/2 - 24, h/2 - cardH/2 + 20).setFontSize(Math.floor(cardW/14) + 'px').setVisible(true);
            card.levelBadge.setPosition(x + cardW/2 - 24, h/2 - cardH/2 + 58).setSize(28, 28).setVisible(true);
            card.levelText.setPosition(x + cardW/2 - 24, h/2 - cardH/2 + 58).setFontSize(Math.floor(cardW/16) + 'px').setText(powerUp.level.toString()).setVisible(true);
            card.cardArea.setPosition(x, h/2).setSize(cardW, cardH).setVisible(true);
            card.cardArea.removeAllListeners();
            card.cardArea.setInteractive({ useHandCursor: true });
            card.cardArea.on('pointerdown', () => this.selectPowerUpCard(i));
            // Highlight selected
            if (this.selectedPowerUpIndex === i) {
                card.cardBg.setStrokeStyle(5, 0xffff00);
            } else {
                card.cardBg.setStrokeStyle(3, 0xff00ff);
            }
            // Affordability/disabled state
            if (powerUp.level >= powerUp.maxLevel) {
                card.cardBg.setFillStyle(0x23242a, 0.3);
                card.name.setColor('#888');
                card.desc.setColor('#888');
                card.icon.setAlpha(0.5);
            } else if (this.currency < powerUp.cost) {
                card.cardBg.setFillStyle(0x23242a, 0.5);
                card.name.setColor('#888');
                card.desc.setColor('#888');
                card.icon.setAlpha(0.5);
            } else {
                card.cardBg.setFillStyle(0x23242a, 0.98);
                card.name.setColor('#fff');
                card.desc.setColor('#ccc');
                card.icon.setAlpha(1);
            }
        }
        // Show buy button if a card is selected
        if (this.selectedPowerUpIndex !== null) {
            this.storeBuyButton.setPosition(w/2, h/2 + cardH/2 + 40).setVisible(true);
        } else {
            this.storeBuyButton.setVisible(false);
        }
        this.storeMessageText.setVisible(false);
        this.storeContinueText.setPosition(w/2, h - 40).setVisible(true);
        // Update unlocked state for power-ups
        this.powerUpState.invisibilityDash.unlocked = this.powerUps[0].level > 0;
        this.powerUpState.acceleratedRecovery.unlocked = this.powerUps[1].level > 0;
        this.powerUpState.poisonZone.unlocked = this.powerUps[2].level > 0;
        this.powerUpState.ultraBlast.unlocked = this.powerUps[3].level > 0;
    }

    hideStoreOverlay() {
        this.storeActive = false;
        this.selectedPowerUpIndex = null;
        this.storeOverlayBg.setVisible(false);
        this.storeContinueText.setVisible(false);
        this.storeBuyButton.setVisible(false);
        this.storeMessageText.setVisible(false);
        for (let i = 0; i < this.powerUpCards.length; i++) {
            const card = this.powerUpCards[i];
            card.cardBg.setVisible(false);
            card.icon.setVisible(false);
            card.name.setVisible(false);
            card.desc.setVisible(false);
            card.costBadge.setVisible(false);
            card.costText.setVisible(false);
            card.levelBadge.setVisible(false);
            card.levelText.setVisible(false);
            card.cardArea.setVisible(false);
        }
    }

    purchasePowerUp(index) {
        const powerUp = this.powerUps[index];
        const card = this.powerUpCards[index];
        if (this.currency >= powerUp.cost && powerUp.level < powerUp.maxLevel) {
            this.currency -= powerUp.cost;
            powerUp.level++;
            card.levelText.setText(powerUp.level.toString());
            this.showStoreOverlay(); // Refresh UI
        } else {
            // Shake card if not enough currency
            this.tweens.add({
                targets: card.cardBg,
                x: card.cardBg.x + 8,
                duration: 60,
                yoyo: true,
                repeat: 2,
                onComplete: () => card.cardBg.setX(card.cardBg.x)
            });
        }
    }

    selectPowerUpCard(index) {
        this.selectedPowerUpIndex = index;
        this.showStoreOverlay();
    }

    confirmPurchasePowerUp() {
        if (this.selectedPowerUpIndex === null) return;
        const index = this.selectedPowerUpIndex;
        const powerUp = this.powerUps[index];
        const card = this.powerUpCards[index];
        if (powerUp.level >= powerUp.maxLevel) {
            this.storeMessageText.setText('Max level reached!').setVisible(true);
            return;
        }
        if (this.currency >= powerUp.cost) {
            this.currency -= powerUp.cost;
            powerUp.level++;
            card.levelText.setText(powerUp.level.toString());
            this.selectedPowerUpIndex = null;
            // Immediately update powerUpState after purchase
            this.powerUpState.invisibilityDash.unlocked = this.powerUps[0].level > 0;
            this.powerUpState.acceleratedRecovery.unlocked = this.powerUps[1].level > 0;
            this.powerUpState.poisonZone.unlocked = this.powerUps[2].level > 0;
            this.powerUpState.ultraBlast.unlocked = this.powerUps[3].level > 0;
            this.hideStoreOverlay(); // Immediately continue the game after purchase
        } else {
            this.storeMessageText.setText('Not enough currency!').setVisible(true);
            // Shake card for feedback
            this.tweens.add({
                targets: card.cardBg,
                x: card.cardBg.x + 8,
                duration: 60,
                yoyo: true,
                repeat: 2,
                onComplete: () => card.cardBg.setX(card.cardBg.x)
            });
        }
    }

    handlePowerUpActivation() {
        // Priority: Poison Zone > Ultra Blast > Invisibility Dash
        if (this.powerUpState.poisonZone.unlocked && this.powerUpState.poisonZone.cooldown === 0) {
            this.activatePoisonZone();
            return;
        }
        if (this.powerUpState.ultraBlast.unlocked && this.powerUpState.ultraBlast.uses > 0 && this.powerUpState.ultraBlast.cooldown === 0) {
            this.activateUltraBlast();
            return;
        }
        if (this.powerUpState.invisibilityDash.unlocked && this.powerUpState.invisibilityDash.uses > 0 && !this.powerUpState.invisibilityDash.active) {
            this.activateInvisibilityDash();
            return;
        }
    }

    activateInvisibilityDash() {
        if (!this.powerUpState.invisibilityDash.active) {
            this.powerUpState.invisibilityDash.active = true;
            this.powerUpState.invisibilityDash.timer = 5;
            this.player.setAlpha(0.4);
            this.player.speed = 300;
        }
    }

    activatePoisonZone() {
        console.log('[PoisonZone] Attempting to activate');
        // Shoot fireball at nearest enemy
        const nearest = this.enemies.length > 0 ? this.enemies.reduce((a, b) => {
            const da = Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y);
            const db = Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y);
            return da < db ? a : b;
        }) : null;
        if (!nearest) {
            console.log('[PoisonZone] No nearest enemy found, aborting');
            return;
        }
        console.log('[PoisonZone] Nearest enemy at', nearest.x, nearest.y);
        // Make fireball more visible and slower for debugging
        const fireball = this.physics.add.sprite(this.player.x, this.player.y, null);
        const graphics = this.make.graphics({x: 0, y: 0, add: false});
        graphics.fillStyle(0x00ff00, 1);
        graphics.fillCircle(12, 12, 12); // larger fireball
        graphics.lineStyle(3, 0xffffff, 1);
        graphics.strokeCircle(12, 12, 12);
        graphics.generateTexture('fireball', 24, 24);
        graphics.destroy();
        fireball.setTexture('fireball');
        fireball.setDepth(10);
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, nearest.x, nearest.y);
        const speed = 220; // slower for visibility
        this.physics.moveTo(fireball, nearest.x, nearest.y, speed);
        this.physics.add.overlap(fireball, nearest, () => {
            console.log('[PoisonZone] Fireball hit enemy at', nearest.x, nearest.y);
            this.createPoisonZone(nearest.x, nearest.y);
            fireball.destroy();
        });
        this.time.delayedCall(2000, () => { if (fireball && fireball.active) fireball.destroy(); });
        this.powerUpState.poisonZone.cooldown = 10;
    }

    createPoisonZone(x, y) {
        console.log('[PoisonZone] Creating poison zone at', x, y);
        // Larger, more visible zone
        const zone = this.add.ellipse(x, y, 180, 180, 0x00ff00, 0.4).setDepth(9);
        this.physics.add.existing(zone, true);
        zone.damageTimer = this.time.addEvent({
            delay: 400,
            callback: () => {
                let hit = false;
                this.enemies.forEach(enemy => {
                    if (enemy.active && Phaser.Math.Distance.Between(enemy.x, enemy.y, x, y) < 90) { // match new zone size
                        enemy.health -= 7;
                        this.showDamageNumber(enemy.x, enemy.y, '-7');
                        hit = true;
                        if (enemy.health <= 0) {
                            this.spawnScroll(enemy.x, enemy.y);
                            enemy.destroy();
                            this.enemies = this.enemies.filter(e => e !== enemy);
                        }
                    }
                });
                if (hit) console.log('[PoisonZone] Damaged enemies in zone');
            },
            callbackScope: this,
            repeat: 6
        });
        this.time.delayedCall(3200, () => {
            console.log('[PoisonZone] Destroying poison zone');
            zone.destroy();
        });
    }

    activateUltraBlast() {
        // Massive AoE blast centered on player
        // Cover ~70% of the screen (screen is 960x540)
        const blastRadius = Math.sqrt(0.7 * 960 * 540 / Math.PI); // Area = pi*r^2, solve for r
        const blast = this.add.circle(this.player.x, this.player.y, blastRadius, 0xffe066, 0.4).setDepth(2);
        this.physics.add.existing(blast, true);
        this.enemies.forEach(enemy => {
            if (enemy.active && Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) < blastRadius) {
                enemy.health -= 9999;
                this.showDamageNumber(enemy.x, enemy.y, '-9999');
                this.spawnScroll(enemy.x, enemy.y);
                enemy.destroy();
                this.enemies = this.enemies.filter(e => e !== enemy);
            }
        });
        this.time.delayedCall(600, () => blast.destroy());
        this.powerUpState.ultraBlast.uses--;
        this.powerUpState.ultraBlast.cooldown = 2;
    }

    showGameOver() {
        // Create semi-transparent background
        const bg = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.7).setDepth(100);
        
        // Game Over text
        const gameOverText = this.add.text(480, 200, 'GAME OVER', {
            fontSize: '64px',
            fill: '#ff0000',
            fontStyle: 'bold',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(101);
        
        // Stats with rounded time
        const minutes = Math.floor(this.elapsedTime / 60);
        const seconds = Math.floor(this.elapsedTime % 60);
        const stats = this.add.text(480, 300, 
            `Waves Survived: ${this.currentWave}\nTotal Kills: ${this.totalKills}\nTime Survived: ${minutes}:${seconds.toString().padStart(2, '0')}`, {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            align: 'center'
        }).setOrigin(0.5).setDepth(101);
        
        // Restart button
        const restartButton = this.add.text(480, 400, 'Click to Restart', {
            fontSize: '32px',
            fill: '#ffffff',
            backgroundColor: '#ff0000',
            padding: { x: 20, y: 10 },
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });
        
        restartButton.on('pointerdown', () => {
            this.scene.restart();
        });
    }

    // Add a new method to reset power-ups at the start of each wave
    resetPowerUpsForNewWave() {
        // Reset all powerups to locked and level 0 at the start of each wave
        this.powerUpState.invisibilityDash.unlocked = false;
        this.powerUpState.acceleratedRecovery.unlocked = false;
        this.powerUpState.poisonZone.unlocked = false;
        this.powerUpState.ultraBlast.unlocked = false;

        this.powerUps[0].level = 0;
        this.powerUps[1].level = 0;
        this.powerUps[2].level = 0;
        this.powerUps[3].level = 0;

        // Reset invisibility dash state
        this.powerUpState.invisibilityDash.active = false;
        this.powerUpState.invisibilityDash.timer = 0;
        this.player.setAlpha(1);
        this.player.speed = 200;
        // Reset ultra blast uses
        this.powerUpState.ultraBlast.uses = 2;
        this.powerUpState.ultraBlast.cooldown = 0;
        // Reset poison zone cooldown
        this.powerUpState.poisonZone.cooldown = 0;
        // No reset needed for accelerated recovery (passive)
    }

    // Helper to update background based on wave
    updateBackgroundForWave() {
        let key = 'background_dojo';
        if (this.currentWave >= 5) {
            key = 'background_gate';
        } else if (this.currentWave >= 3) {
            key = 'background_village';
        }
        if (this.background.texture.key !== key) {
            this.background.setTexture(key);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 960,
    height: 540,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: MainGame
};

const game = new Phaser.Game(config); 