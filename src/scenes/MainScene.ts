import { borderRandomBooleanFactory, pickRandomItem } from "../misc/util";

// Speeds (pixels per second) and rates (milliseconds).
const CAR_MIN_SPEED = 54;
const CAR_MAX_SPEED = CAR_MIN_SPEED * 4;
const CAR_MIN_RATE = 1500;
const CAR_MAX_RATE = CAR_MIN_RATE / 3;
const TRUCK_MIN_SPEED = 18;
const TRUCK_MAX_SPEED = TRUCK_MIN_SPEED * 4;

// Difficulty thresholds.
const DIFFICULTY_MIN_SCORE = 5;
const DIFFICULTY_MAX_SCORE = 50;

// Sprites sizes.
const FLOOR_SIZE = 16;
const CAR_SIZE = 32;
const CAR_BODY_WIDTH = 12;
const CAR_BODY_HEIGHT = 18;

enum GameStatus {
  MAIN_MENU,
  PLAYING,
  FINISHING,
  GAME_OVER
}

const randomLane = borderRandomBooleanFactory();

export default class MainScene extends Phaser.Scene {
  private gameStatus: GameStatus = GameStatus.MAIN_MENU;

  private cars: Phaser.Physics.Arcade.Group | null = null;
  private ground: Phaser.GameObjects.Group | null = null;
  private player: Phaser.Physics.Arcade.Sprite | null = null

  private addCarTimer: Phaser.Time.TimerEvent | null = null;
  private score = 0;

  private carsRate: number = CAR_MIN_RATE;
  private carsSpeed: number = CAR_MIN_SPEED;
  private truckSpeed: number = TRUCK_MIN_SPEED;

  private leftLane = 0;
  private rightLane = 0;

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

    // Load ground.
    this.load.image('grass', 'assets/images/grass.jpg');
    this.load.image('soil', 'assets/images/soil.jpg');

    // Load road.
    this.load.image('road-center', 'assets/images/road-center.jpg');
    this.load.image('road-left', 'assets/images/road-left.jpg');
    this.load.image('road-right', 'assets/images/road-right.jpg');

    // TODO: Load vegetation (trees and bushes).

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

    // Define cars group
    this.cars = this.physics.add.group();

    // Add controls.
    this.input.keyboard?.on('keydown-SPACE', this.onTap.bind(this));
    this.input.keyboard?.on('keydown-ENTER', this.onTap.bind(this));
    this.input.on('pointerdown', this.onTap.bind(this));

    // Add texts.
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
          tile.tilePositionY -= delta * this.truckSpeed / 1000;
        }
      }
    }
  }

  // --- Status change --- //

  showMainMenu() {
    this.gameStatus = GameStatus.MAIN_MENU;

    this.mainMessage?.setText("Tap to start");
    this.mainMessage?.setVisible(true);
    this.scoreLabel?.setVisible(false);

    this.player?.stop();
    this.player?.setFrame(0);
  }

  startGame() {
    this.gameStatus = GameStatus.PLAYING;

    this.mainMessage?.setVisible(false);
    this.scoreLabel?.setVisible(true);

    this.updateScore(0);
    this.setAddCarTimer();
  }

  endGame(player: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile, car: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile) {
    // TODO: Should temporarly set the status to FINISHING to reproduce the crash animation.
    this.gameStatus = GameStatus.GAME_OVER;

    this.mainMessage?.setText("Game over");
    this.mainMessage?.setVisible(true);

    this.addCarTimer?.destroy();

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
    const sprite = pickRandomItem(['car-red', 'car-orange', 'car-yellow']);
    const useLeft = randomLane();
    
    // Instantiate car.
    const car = this.cars?.create(
      useLeft ? this.leftLane : this.rightLane,
      -CAR_SIZE/2,
      sprite
    ) as Phaser.GameObjects.Sprite;
    car.setFrame(7);
    car.anims.create({ key: 'rotate', frames: this.anims.generateFrameNumbers(sprite, { start: 7, end: 0 }), frameRate: 10, repeat: -1 });

    const carBody = car.body as Phaser.Physics.Arcade.Body;
    carBody.setAllowGravity(false)
    carBody.setVelocityY(this.carsSpeed);
    carBody.setSize(CAR_BODY_WIDTH, CAR_BODY_HEIGHT);

    // Restart timer.
    this.setAddCarTimer();

    return carBody;
  }

  setAddCarTimer() {
    this.addCarTimer = this.time.addEvent({
      delay: this.carsRate,
      callback: this.addCar,
      callbackScope: this
    });
  }

  onTap() {
    if(this.gameStatus === GameStatus.MAIN_MENU) {
      this.startGame();
    }

    if(this.gameStatus === GameStatus.PLAYING) {
      if(this.player?.body?.velocity.x === 0) {
        // If not moving (on the X axis) then switch lane.
        const isLeft = this.player.x < this.game.canvas.width/2;
        this.player.setVelocityX((isLeft ? 1 : -1) * this.truckSpeed * 4);
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

    if(this.score < DIFFICULTY_MIN_SCORE) {
      // Minimum difficulty.
      this.carsRate = CAR_MIN_RATE;
      this.carsSpeed = CAR_MIN_SPEED;
      this.truckSpeed = TRUCK_MIN_SPEED;
    } else if(this.score < DIFFICULTY_MAX_SCORE) {
      // Medium difficulty.
      const alpha = (this.score - DIFFICULTY_MIN_SCORE) / (DIFFICULTY_MAX_SCORE - DIFFICULTY_MIN_SCORE);
      this.carsRate = (CAR_MAX_RATE - CAR_MIN_RATE) * alpha + CAR_MIN_RATE;
      this.carsSpeed = (CAR_MAX_SPEED - CAR_MIN_SPEED) * alpha + CAR_MIN_SPEED;
      this.truckSpeed = (TRUCK_MAX_SPEED - TRUCK_MIN_SPEED) * alpha + TRUCK_MIN_SPEED;
    } else {
      // Maximum difficulty.
      this.carsRate = CAR_MAX_RATE;
      this.carsSpeed = CAR_MAX_SPEED;
      this.truckSpeed = TRUCK_MAX_SPEED;
    }
  }
}
