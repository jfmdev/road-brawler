import {
  BASE_CAR_SPEED,
  BASE_CAR_RATE,
  BASE_CRASH_SPEED,
  BASE_TRUCK_SPEED,
  MAX_SPEED_MULTIPLIER,
  MULTIPLE_CARS_THRESHOLD,
  DIFFICULTY_MIN_SCORE,
  DIFFICULTY_MAX_SCORE,
  CAR_SIZE,
  CAR_BODY_WIDTH,
  CAR_BODY_HEIGHT,
  FINISHING_TIME 
} from "../misc/constants";
import {
  Direction,
  randomItem,
  randomItemsBiasedFactory
} from "../misc/util";
import GroundController from "../misc/ground";
import VegetationController from "../misc/vegetation";

enum GameStatus {
  MAIN_MENU,
  PLAYING,
  FINISHING,
  GAME_OVER
}

const randomItemsBiased = randomItemsBiasedFactory<number>();

export default class MainScene extends Phaser.Scene {
  private gameStatus: GameStatus = GameStatus.MAIN_MENU;

  private ground: GroundController;
  private vegetation: VegetationController;

  private cars: Phaser.Physics.Arcade.Group | null = null;
  private labels: Phaser.GameObjects.Layer | null = null;
  private milestones: Phaser.Physics.Arcade.Group | null = null;
  private player: Phaser.Physics.Arcade.Sprite | null = null

  private addCarTimer: Phaser.Time.TimerEvent | null = null;

  private score = 0;
  private speedMultiplier = 1;

  private titleLabel: Phaser.GameObjects.Text | null = null;
  private scoreLabel: Phaser.GameObjects.Text | null = null;
  private statusLabel: Phaser.GameObjects.Text | null = null;
  private twoLanesLabel: Phaser.GameObjects.Text | null = null;
  private threeLanesLabel: Phaser.GameObjects.Text | null = null;

  private crashSound: Phaser.Sound.BaseSound | null = null;
  private engineSound: Phaser.Sound.BaseSound | null = null;
  private hornSound: Phaser.Sound.BaseSound | null = null;
  private whooshSound: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super();

    const getSpeedMultiplier = () => this.speedMultiplier;
    this.ground = new GroundController(this, getSpeedMultiplier);
    this.vegetation = new VegetationController(this, this.ground, getSpeedMultiplier);
  }

  preload() {
    // Load cars.
    this.load.spritesheet('truck', 'assets/sprites/truck-blue.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });
    this.load.spritesheet('car-red', 'assets/sprites/car-red.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });
    this.load.spritesheet('car-orange', 'assets/sprites/car-orange.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });
    this.load.spritesheet('car-yellow', 'assets/sprites/car-yellow.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });

    // Load vegetation.
    this.vegetation.preload();

    // Load ground and road.
    this.ground.preload()

    // Load sounds.
    this.load.audio('crash', 'assets/sounds/metal-crash.wav');
    this.load.audio('engine', 'assets/sounds/engine.wav');
    this.load.audio('horn', 'assets/sounds/car-horn.wav');
    this.load.audio('whoosh', 'assets/sounds/sword-whoosh.wav');
  }

  create() {
    // Add soil, grass and road.
    this.ground.create();

    // Add player.
    this.player = this.physics.add.sprite(this.game.canvas.width / 2, this.game.canvas.height - CAR_SIZE, 'truck');
    this.player.anims.create({ key: 'rotate', frames: this.anims.generateFrameNumbers('truck', { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setAllowGravity(false);
    playerBody.setSize(CAR_BODY_WIDTH, CAR_BODY_HEIGHT);

    // Add brushes and trees.
    this.vegetation.create();

    // Define groups and layer.
    this.cars = this.physics.add.group();
    this.milestones = this.physics.add.group();

    // Add controls.
    this.input.keyboard?.on('keydown', this.onUserInput.bind(this));
    this.input.keyboard?.on('keydown', this.onUserInput.bind(this));
    this.input.on('pointerdown', this.onUserInput.bind(this));

    // Add texts.
    this.labels = this.add.layer();
    this.titleLabel = this.addLabel(0.5 * this.game.canvas.width, 0.2 * this.game.canvas.height, "Road Brawler", 36);
    this.statusLabel = this.addLabel(0.5 * this.game.canvas.width, 0.65 * this.game.canvas.height, "", 18);
    this.twoLanesLabel = this.addLabel(0.3 * this.game.canvas.width, 0.8 * this.game.canvas.height, "", 14);
    this.threeLanesLabel = this.addLabel(0.7 * this.game.canvas.width, 0.8 * this.game.canvas.height, "", 14);
    this.scoreLabel = this.addLabel(this.game.canvas.width - 20, 10, "", 16, 1, 0);

    // Add sounds.
    this.crashSound = this.sound.add('crash');
    this.engineSound = this.sound.add('engine');
    this.hornSound = this.sound.add('horn');
    this.whooshSound = this.sound.add('whoosh');

    // Set initial status.
    this.showMainMenu();
  }

  update(_time: number, delta: number) {
    if(this.gameStatus === GameStatus.PLAYING) {
      // Check for cars collisions.
      if(this.player && this.cars) {
        this.physics.overlap(this.player, this.cars, this.endGame.bind(this));
      }

      // Check if score must be increased.
      if(this.player && this.milestones) {
        this.physics.overlap(this.player, this.milestones, this.milestoneReached.bind(this));
      }

      // Remove cars when they are out of the screen.
      this.cars?.getChildren().forEach((car: Phaser.GameObjects.GameObject) => {
        const carBody = car.body as Phaser.Physics.Arcade.Body;
        if (carBody.y - carBody.height > this.game.canvas.height) {
          this.cars?.remove(car, true, true);
        }
      });
    }

    if(this.gameStatus !== GameStatus.GAME_OVER) {
      // Move ground.
      this.ground.update(delta);

      // Move brushes and trees.
      this.vegetation.update(delta);
    }
  }

  // --- Status change --- //

  showMainMenu() {
    this.gameStatus = GameStatus.MAIN_MENU;

    this.titleLabel?.setVisible(true);
    this.statusLabel?.setText("Select difficulty\nto start");
    this.statusLabel?.setVisible(true);
    this.threeLanesLabel?.setText("Hard\n(three lanes)");
    this.threeLanesLabel?.setVisible(true);
    this.twoLanesLabel?.setText("Easy\n(two lanes)");
    this.twoLanesLabel?.setVisible(true);
    this.updateScore(0);
    this.scoreLabel?.setVisible(false);

    this.player?.stop();
    this.player?.setFrame(0);
    this.player?.setPosition(this.game.canvas.width / 2, this.game.canvas.height - CAR_SIZE);
    this.player?.setVelocityX(0);

    this.cars?.clear(true, true);

    this.vegetation.initTimer()
  }

  startGame() {
    this.gameStatus = GameStatus.PLAYING;

    this.titleLabel?.setVisible(false);
    this.statusLabel?.setVisible(false);
    this.scoreLabel?.setVisible(true);
    this.threeLanesLabel?.setVisible(false);
    this.twoLanesLabel?.setVisible(false);

    this.updateScore(0);
    this.initCarTimer();

    this.engineSound?.play({ loop: true })
  }

  endGame(_player: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile, car: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile) {
    this.gameStatus = GameStatus.FINISHING;

    this.crashSound?.play();

    if(car instanceof Phaser.Physics.Arcade.Sprite) {
      const crashSpeed = (BASE_CRASH_SPEED * this.speedMultiplier)
      const playerIsLeft = (this.player?.body?.position.x ?? 0) < (car.body?.position.x ?? 0);

      this.player?.play('rotate');
      this.player?.setVelocityX((playerIsLeft ? -1 : 1) * crashSpeed);
      this.player?.setAccelerationX(crashSpeed/FINISHING_TIME);
    
      car.play('rotate');
      car.setVelocityX((playerIsLeft ? 1 : -1) * crashSpeed)
    }

    this.addCarTimer?.destroy();
    this.milestones?.clear(true);

    this.time.addEvent({
      delay: FINISHING_TIME,
      callback: () => {
        this.gameStatus = GameStatus.GAME_OVER;
        this.engineSound?.stop();

        this.player?.stop();
        this.player?.setVelocity(0, 0);
        this.player?.setAcceleration(0, 0);

        this.statusLabel?.setText("Game over");
        this.statusLabel?.setVisible(true);

        this.vegetation.stopTimer();
      },
      callbackScope: this
    });
  }

  // --- Miscellaneous --- //

  addCar() {
    // Randomly choose a sprint and a lane.
    const carCount = this.ground.lanesCount() > 2 && this.score >= MULTIPLE_CARS_THRESHOLD ? this.ground.lanesCount() - 1 : 1;
    const laneIndexes = randomItemsBiased(Array.from(Array(this.ground.lanesCount()).keys()), carCount);

    // Instantiate car.
    for(let i=0; i<carCount; i++) {
      const laneIndex = laneIndexes[i];
      const sprite = randomItem<string>(['car-red', 'car-orange', 'car-yellow']);

      const car = this.cars?.create(
        this.ground.laneCenters[laneIndex],
        -CAR_SIZE/2,
        sprite,
        7
      ) as Phaser.GameObjects.Sprite;
      car.anims.create({ key: 'rotate', frames: this.anims.generateFrameNumbers(sprite, { start: 7, end: 0 }), frameRate: 10, repeat: -1 });

      const carBody = car.body as Phaser.Physics.Arcade.Body;
      carBody.setAllowGravity(false)
      carBody.setVelocityY((BASE_CAR_SPEED * this.speedMultiplier));
      carBody.setSize(CAR_BODY_WIDTH, CAR_BODY_HEIGHT);

      // Add an invisible rectangle as milestone.
      const milestone = this.add.rectangle(this.game.canvas.width/2, -CAR_SIZE, this.game.canvas.width, 2);
      this.milestones?.add(milestone);
      const milestoneBody = milestone.body as Phaser.Physics.Arcade.Body;
      milestoneBody.setAllowGravity(false)
      milestoneBody.setVelocityY((BASE_CAR_SPEED * this.speedMultiplier));
    }

    // Restart timer.
    this.initCarTimer();
  }

  addLabel(
    positionX: number,
    positionY: number,
    text: string,
    fontSize: number,
    originX = 0.5,
    originY = 0.5
  ): Phaser.GameObjects.Text {
    const label = this.add.text(positionX, positionY, text);
    const sizeMultiplier = this.game.canvas.width < 300 ? 0.8 : 1;
    label.setFontSize(sizeMultiplier * fontSize);
    label.setColor('#fff');
    label.setAlign('center');
    label.setShadow(1, 1, '#000', 1);
    label.setOrigin(originX, originY);
    label.setVisible(false);
    this.labels?.add(label)
    return label
  }

  getInputDirection(inputEvent: KeyboardEvent | Phaser.Input.Pointer) {
    if(inputEvent instanceof KeyboardEvent) {
      if(inputEvent.code === 'Space' || inputEvent.code === 'Enter') {
        const isLeft = (this.player?.x ?? 0) < this.game.canvas.width/2;
        return isLeft ? Direction.RIGHT : Direction.LEFT;
      }

      if(inputEvent.code === 'ArrowLeft' || inputEvent.code === 'Numpad4') {
        return Direction.LEFT;
      }

      if(inputEvent.code === 'ArrowRight' || inputEvent.code === 'Numpad6') {
        return Direction.RIGHT;
      }
    }

    if(inputEvent instanceof Phaser.Input.Pointer) {
      return inputEvent.x > this.game.canvas.width/2 ? Direction.RIGHT : Direction.LEFT;
    }

    return Direction.NONE
  }

  initCarTimer() {
    this.addCarTimer = this.time.addEvent({
      delay: (BASE_CAR_RATE / this.speedMultiplier),
      callback: this.addCar,
      callbackScope: this
    });
  }

  milestoneReached(
    _objectA: Phaser.Tilemaps.Tile | Phaser.Types.Physics.Arcade.GameObjectWithBody,
    objectB: Phaser.Tilemaps.Tile | Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const milestone = objectB as Phaser.GameObjects.Rectangle;
    this.milestones?.remove(milestone, true, true);
    this.updateScore(this.score + 1);
  }

  onUserInput(inputEvent: KeyboardEvent | Phaser.Input.Pointer) {
    if(this.gameStatus === GameStatus.MAIN_MENU) {
      const newLaneCount = this.getInputDirection(inputEvent) === Direction.RIGHT ? 3 : 2;
      if(newLaneCount !== this.ground.lanesCount()) {
        this.ground.buildLanes(newLaneCount);
      }

      this.hornSound?.play();
      this.startGame();
    }

    if(this.gameStatus === GameStatus.PLAYING) {
      this.whooshSound?.play();

      if(this.player !== null) {
        const nextLane = this.ground.nextLane(this.player.x, this.getInputDirection(inputEvent));
        const newPositionX = this.ground.laneCenters[nextLane];
        const speed = BASE_TRUCK_SPEED * 4 * this.speedMultiplier;
        const duration = 1000 * Math.abs(this.player.x - newPositionX) / speed;
        this.tweens.add({
          targets: this.player,
          x: newPositionX,
          flipY: true,
          duration
        });
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
