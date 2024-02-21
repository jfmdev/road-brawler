import { biasedRandomBooleanFactory, randomFromInternal, randomItem } from "../misc/util";

// TODO Roadmap
// * Score should increase after the car is "passed", instead of when the car is removed from screen.
// * Add a sound when changing lane.
// * Add sound for car crashes.
// * Add sound when pressing play.
// * Add engine sound reproduced whenever the car hasn't crashed.
// * Improve crashing animation.
// * Simplify the code on this file by moving logic to utility files.
// * Allow to choose between 2 and 3 lanes.

// Speeds (pixels per second) and rates (milliseconds).
const BASE_CAR_SPEED = 54;
const BASE_CAR_RATE = 1750;
const BASE_TRUCK_SPEED = 36;
const BASE_VEGETATION_RATE = 500;

// Difficulty thresholds.
const MAX_SPEED_MULTIPLIER = 4;
const DIFFICULTY_MIN_SCORE = 5;
const DIFFICULTY_MAX_SCORE = 50;

// Sprites sizes.
const FLOOR_SIZE = 16;
const CAR_SIZE = 32;
const CAR_BODY_WIDTH = 12;
const CAR_BODY_HEIGHT = 18;
const VEGETATION_WIDTH = 14;
const VEGETATION_HEIGHT = 30;
const VEGETATION_COUNT = 12;

// Miscellaneous constants.
const VEGETATION_SPACING = 250;

enum GameStatus {
  MAIN_MENU,
  PLAYING,
  FINISHING,
  GAME_OVER
}

const randomLane = biasedRandomBooleanFactory();

export default class MainScene extends Phaser.Scene {
  private gameStatus: GameStatus = GameStatus.MAIN_MENU;

  private cars: Phaser.Physics.Arcade.Group | null = null;
  private ground: Phaser.GameObjects.Group | null = null;
  private labels: Phaser.GameObjects.Layer | null = null;
  private player: Phaser.Physics.Arcade.Sprite | null = null
  private vegetation: Phaser.GameObjects.Layer | null = null;

  private addCarTimer: Phaser.Time.TimerEvent | null = null;
  
  private score = 0;
  private speedMultiplier = 1;

  private leftLane = 0;
  private rightLane = 0;

  private titleLabel: Phaser.GameObjects.Text | null = null;
  private scoreLabel: Phaser.GameObjects.Text | null = null;
  private mainMessage: Phaser.GameObjects.Text | null = null;

  constructor() {
    super();
  }
  
  preload() {
    // Load cars.
    this.load.spritesheet('truck', 'assets/sprites/truck-blue.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });
    this.load.spritesheet('car-red', 'assets/sprites/car-red.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });
    this.load.spritesheet('car-orange', 'assets/sprites/car-orange.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });
    this.load.spritesheet('car-yellow', 'assets/sprites/car-yellow.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });

    // Load ground and vegetation.
    this.load.image('grass', 'assets/images/grass.jpg');
    this.load.image('soil', 'assets/images/soil.jpg');
    this.load.spritesheet('vegetation', 'assets/sprites/vegetation.png', { frameWidth: VEGETATION_WIDTH, frameHeight: VEGETATION_HEIGHT });

    // Load road.
    this.load.image('road-center', 'assets/images/road-center.jpg');
    this.load.image('road-left', 'assets/images/road-left.jpg');
    this.load.image('road-right', 'assets/images/road-right.jpg');

    // TODO: Load sounds.
  }
  
  create() {
    // Add soil and grass.
    this.ground = this.add.group();
    this.ground.add(this.add.tileSprite(0, 0, this.game.canvas.width, this.game.canvas.height, 'soil').setOrigin(0, 0));
    this.ground.add(this.add.tileSprite(Math.floor(this.game.canvas.width/4), 0, Math.floor(this.game.canvas.width/2), this.game.canvas.height, 'grass').setOrigin(0, 0));

    // Add road.
    this.ground.add(this.add.tileSprite(Math.floor(this.game.canvas.width/2) + FLOOR_SIZE - 2, 0, FLOOR_SIZE, this.game.canvas.height, 'road-right').setOrigin(0.5, 0));
    this.ground.add(this.add.tileSprite(Math.floor(this.game.canvas.width/2) - FLOOR_SIZE + 2, 0, FLOOR_SIZE, this.game.canvas.height, 'road-left').setOrigin(0.5, 0));
    this.ground.add(this.add.tileSprite(Math.floor(this.game.canvas.width/2), 0, FLOOR_SIZE, this.game.canvas.height, 'road-center').setOrigin(0.5, 0));
    this.leftLane = Math.floor(this.game.canvas.width/2) - FLOOR_SIZE/2;
    this.rightLane = Math.floor(this.game.canvas.width/2) + FLOOR_SIZE/2;

    // Add player.
    this.player = this.physics.add.sprite(this.game.canvas.width / 2, this.game.canvas.height - CAR_SIZE, 'truck');
    this.player.anims.create({ key: 'rotate', frames: this.anims.generateFrameNumbers('truck', { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setAllowGravity(false);
    playerBody.setSize(CAR_BODY_WIDTH, CAR_BODY_HEIGHT);

    // Define cars and vegetation groups.
    this.cars = this.physics.add.group();
    this.vegetation = this.add.layer();

    // Add controls.
    this.input.keyboard?.on('keydown-SPACE', this.onTap.bind(this));
    this.input.keyboard?.on('keydown-ENTER', this.onTap.bind(this));
    this.input.on('pointerdown', this.onTap.bind(this));

    // Add texts.
    this.labels = this.add.layer();

    this.titleLabel = this.add.text(
      0.5 * this.game.canvas.width,
      0.2 * this.game.canvas.height,
      "Road Brawler"
    );
    this.titleLabel.setFontSize(36);
    this.titleLabel.setColor('#fff');
    this.titleLabel.setAlign('center');
    this.titleLabel.setShadow(1, 1, '#000', 1);
    this.titleLabel.setOrigin(0.5, 0.5);
    this.titleLabel.setVisible(false);
    this.labels.add(this.titleLabel)

    this.mainMessage = this.add.text(
      0.5 * this.game.canvas.width,
      0.8 * this.game.canvas.height,
      ""
    );
    this.mainMessage.setFontSize(24);
    this.mainMessage.setColor('#fff');
    this.mainMessage.setAlign('center');
    this.mainMessage.setShadow(1, 1, '#000', 1);
    this.mainMessage.setOrigin(0.5, 0.5);
    this.mainMessage.setVisible(false);
    this.labels.add(this.mainMessage)

    this.scoreLabel = this.add.text(
      this.game.canvas.width - 20,
      10,
      ""
    );
    this.scoreLabel.setFontSize(16);
    this.scoreLabel.setColor('#fff');
    this.scoreLabel.setAlign('center');
    this.scoreLabel.setShadow(1, 1, '#000', 1);
    this.scoreLabel.setOrigin(1, 0);
    this.scoreLabel.setVisible(false);
    this.labels.add(this.scoreLabel)

    // Pre-propulate screen with vegetation.
    const vegetationRows = Math.ceil((this.game.canvas.height / BASE_CAR_SPEED) * 1000 / BASE_VEGETATION_RATE);
    for(let i=0; i<vegetationRows; i++) {
      this.addVegetation(i * this.game.canvas.height / vegetationRows, true);
    }
    this.addVegetation();

    // Set initial status.
    this.showMainMenu();
  }

  update(_time: number, delta: number) {
    if(this.gameStatus === GameStatus.PLAYING) {
      // Stop player when it reaches the lane.
      if(this.player && this.player.body) {
        if(this.player.body.velocity.x > 0 && this.player.x >= this.rightLane) {
          this.player.setVelocityX(0);
          this.player.x = this.rightLane;
        }
        if(this.player.body.velocity.x < 0 && this.player.x <= this.leftLane) {
          this.player.setVelocityX(0);
          this.player.x = this.leftLane;
        }
      }

      // Check for collisions.
      if(this.player && this.cars) {
        this.physics.overlap(this.player, this.cars, this.endGame.bind(this));
      }

      // Remove cars when they are out of the screen.
      this.cars?.getChildren().forEach((car: Phaser.GameObjects.GameObject) => {
        const towerBody = car.body as Phaser.Physics.Arcade.Body;
        if (towerBody.y - towerBody.height > this.game.canvas.height) {
          this.cars?.remove(car, true, true);

          // Increase score.
          this.updateScore(this.score + 1);
        }
      });
    }

    if(this.gameStatus !== GameStatus.GAME_OVER) {
      // Move ground.
      if(this.ground != null) {
        const tiles = this.ground.getChildren();
        for(let i=0; i<tiles.length; i++) {
          const tile = tiles[i] as Phaser.GameObjects.TileSprite;
          tile.tilePositionY -= delta * (BASE_TRUCK_SPEED * this.speedMultiplier) / 1000;
        }
      }

      // Move vegetation.
      if(this.vegetation != null) {
        const brushes = this.vegetation.getChildren();
        for(let i=0; i<brushes.length; i++) {
          const tile = brushes[i] as Phaser.GameObjects.Sprite;
          tile.y += delta * (BASE_TRUCK_SPEED * this.speedMultiplier) / 1000;
        }
      }
    }
  }

  // --- Status change --- //

  showMainMenu() {
    this.gameStatus = GameStatus.MAIN_MENU;

    this.titleLabel?.setVisible(true);
    this.mainMessage?.setText("Tap to start");
    this.mainMessage?.setVisible(true);
    this.updateScore(0);
    this.scoreLabel?.setVisible(false);

    this.player?.stop();
    this.player?.setFrame(0);

    this.cars?.clear(true, true);
  }

  startGame() {
    this.gameStatus = GameStatus.PLAYING;

    this.titleLabel?.setVisible(false);
    this.mainMessage?.setVisible(false);
    this.scoreLabel?.setVisible(true);

    this.updateScore(0);
    this.initCarTimer();

    // TODO: Play a engine sound (loop).
  }

  endGame(player: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile, car: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile) {
    // TODO: Should temporarly set the status to FINISHING to reproduce the crash animation.
    this.gameStatus = GameStatus.GAME_OVER;

    this.mainMessage?.setText("Game over");
    this.mainMessage?.setVisible(true);

    this.addCarTimer?.destroy();

    // TODO: Stop engine sound.

    // TODO: Play a crash sound.
    // TODO: The animation should depend on the collision angle
    if(player instanceof Phaser.Physics.Arcade.Sprite) {
      player.play('rotate');
    }
    if(car instanceof Phaser.Physics.Arcade.Sprite) {
      car.play('rotate');
    }
  }

  // --- Miscellaneous --- //

  addCar() {
    // Randomly choose a sprint and a lane.
    const sprite = randomItem<string>(['car-red', 'car-orange', 'car-yellow']);
    const useLeft = randomLane();
    
    // Instantiate car.
    const car = this.cars?.create(
      useLeft ? this.leftLane : this.rightLane,
      -CAR_SIZE/2,
      sprite,
      7
    ) as Phaser.GameObjects.Sprite;
    car.anims.create({ key: 'rotate', frames: this.anims.generateFrameNumbers(sprite, { start: 7, end: 0 }), frameRate: 10, repeat: -1 });

    const carBody = car.body as Phaser.Physics.Arcade.Body;
    carBody.setAllowGravity(false)
    carBody.setVelocityY((BASE_CAR_SPEED * this.speedMultiplier));
    carBody.setSize(CAR_BODY_WIDTH, CAR_BODY_HEIGHT);

    // Restart timer.
    this.initCarTimer();
  }

  addVegetation(positionY = -VEGETATION_HEIGHT, omitTimer = false) {
    const itemsToAdd = Math.ceil(this.game.canvas.width / (2 * VEGETATION_SPACING)) * 2;
    const itemsSpacing = this.game.canvas.width / itemsToAdd;

    const laneStart = this.leftLane - FLOOR_SIZE;
    const laneEnd = this.rightLane + FLOOR_SIZE

    for(let i=0; i<itemsToAdd; i++) {
      // REQ: vegetation should be positioned outside the the lanes space.
      let minX = i * itemsSpacing;
      let maxX = minX + itemsSpacing;
      if(minX >= laneStart && minX <= laneEnd) {
        minX = laneEnd;
      }
      if(maxX >= laneStart && maxX <= laneEnd) {
        maxX = laneStart;
      }

      const randomPositionX = randomFromInternal(minX, maxX);
      const randomSprite = Math.floor(Math.random() * VEGETATION_COUNT);

      const sprite = this.add.sprite(
        randomPositionX,
        positionY,
        'vegetation',
        randomSprite
      )
      this.vegetation?.add(sprite);
      this.vegetation?.sendToBack(sprite);
    }

    if(!omitTimer) {
      this.time.addEvent({
        delay: (BASE_VEGETATION_RATE / this.speedMultiplier),
        callback: this.addVegetation,
        callbackScope: this
      });  
    }
  }

  initCarTimer() {
    this.addCarTimer = this.time.addEvent({
      delay: (BASE_CAR_RATE / this.speedMultiplier),
      callback: this.addCar,
      callbackScope: this
    });
  }

  onTap() {
    if(this.gameStatus === GameStatus.MAIN_MENU) {
      this.startGame();
    }

    if(this.gameStatus === GameStatus.PLAYING) {
      // TODO: Play a dodge sound.

      if(this.player?.body?.velocity.x === 0) {
        // If not moving (on the X axis) then switch lane.
        const isLeft = this.player.x < this.game.canvas.width/2;
        this.player.setVelocityX((isLeft ? 1 : -1) * (BASE_TRUCK_SPEED * 4 * this.speedMultiplier));
      } else {
        // If already moving then invert direction.
        this.player?.setVelocityX(-(this.player?.body?.velocity.x || 0));
      }
    }

    if(this.gameStatus === GameStatus.GAME_OVER) {
      this.showMainMenu();
    }
  }

  updateScore(newScore: number) {
    this.score = newScore;
    this.scoreLabel?.setText(`Score: ${this.score}`);

    this.speedMultiplier = this.score < DIFFICULTY_MIN_SCORE 
      ? 1 
      : this.score < DIFFICULTY_MAX_SCORE 
      ? (1 + (MAX_SPEED_MULTIPLIER - 1) * (this.score - DIFFICULTY_MIN_SCORE) / (DIFFICULTY_MAX_SCORE - DIFFICULTY_MIN_SCORE)) 
      : MAX_SPEED_MULTIPLIER;
  }
}
