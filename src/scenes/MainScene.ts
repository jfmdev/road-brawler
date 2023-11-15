
// Speeds and rates.
const BASE_CARS_SPEED = 54; // pixels per second.
const BASE_TRUCK_SPEED = 18; // pixels per second.
const CARS_TIMER = 1000; // milliseconds.

// Sprites sizes.
const FLOOR_SIZE = 16;
const CAR_SIZE = 32;
const CAR_BODY_WIDTH = 12;
const CAR_BODY_HEIGHT = 18;

enum GameStatus {
  MENU,
  PLAYING,
  GAME_OVER
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pickRandom = (array: any[]) => array[Math.floor(Math.random() * array.length)];

export default class HelloScene extends Phaser.Scene {
  private cars: Phaser.Physics.Arcade.Group | null = null;
  private carsSpeed: number = BASE_CARS_SPEED;
  private ground: Phaser.GameObjects.Group | null = null;
  private player: Phaser.Physics.Arcade.Sprite | null = null
  private truckSpeed: number = BASE_TRUCK_SPEED;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private status: GameStatus = GameStatus.MENU;

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
  
    // Add player.
    this.player = this.physics.add.sprite(this.game.canvas.width / 2, this.game.canvas.height - CAR_SIZE, 'truck');
    this.player.anims.create({ key: 'rotate', frames: this.anims.generateFrameNumbers('truck', { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setAllowGravity(false);
    playerBody.setSize(CAR_BODY_WIDTH, CAR_BODY_HEIGHT);

    // Initialize timer to add cars.
    this.spawnTimer = this.time.addEvent({
      delay: CARS_TIMER,
      callback: this.spawnCar,
      callbackScope: this,
      loop: true
    });
    this.cars = this.physics.add.group();

    // Set initial status.
    this.status = GameStatus.PLAYING;
  }

  update(_time: number, delta: number) {
    if(this.status === GameStatus.PLAYING) {
      // Check for collisions.
      if(this.player && this.cars) {
        this.physics.overlap(this.player, this.cars, this.endGame.bind(this));
      }

      // Remove cars when they are out of the screen.
      this.cars?.getChildren().forEach((car: Phaser.GameObjects.GameObject) => {
        const towerBody = car.body as Phaser.Physics.Arcade.Body;
        if (towerBody.y - towerBody.height > this.game.canvas.height) {
          this.cars?.remove(car, true, true);
        }
      });

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

  spawnCar() {
    const sprite = pickRandom(['car-red', 'car-orange', 'car-yellow'])
    const car = this.cars?.create(
      this.game.canvas.width/2 + pickRandom([CAR_SIZE/2, 0, -CAR_SIZE/2]),
      -CAR_SIZE/2,
      sprite
    ) as Phaser.GameObjects.Sprite;
    car.setFrame(7);
    car.anims.create({ key: 'rotate', frames: this.anims.generateFrameNumbers(sprite, { start: 7, end: 0 }), frameRate: 10, repeat: -1 });

    const carBody = car.body as Phaser.Physics.Arcade.Body;
    carBody.setAllowGravity(false)
    carBody.setVelocityY(this.carsSpeed);
    carBody.setSize(CAR_BODY_WIDTH, CAR_BODY_HEIGHT);

    return carBody;
  }

  endGame(player: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile, car: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile) {
    this.status = GameStatus.GAME_OVER;
    this.spawnTimer?.destroy();
    if(player instanceof Phaser.Physics.Arcade.Sprite) {
      player.play('rotate');
    }
    if(car instanceof Phaser.Physics.Arcade.Sprite) {
      car.play('rotate');
    }
  }
}