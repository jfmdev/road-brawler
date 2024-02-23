import {
  BASE_CAR_SPEED,
  BASE_CAR_RATE,
  BASE_CRASH_SPEED,
  BASE_TRUCK_SPEED,
  BASE_VEGETATION_RATE,
  MAX_SPEED_MULTIPLIER,
  DIFFICULTY_MIN_SCORE,
  DIFFICULTY_MAX_SCORE,
  CAR_SIZE,
  CAR_BODY_WIDTH,
  CAR_BODY_HEIGHT,
  VEGETATION_WIDTH,
  VEGETATION_HEIGHT,
  VEGETATION_COUNT,
  VEGETATION_SPACING,
  FINISHING_TIME 
} from "../misc/constants";
import {
  biasedRandomBooleanFactory,
  randomFromInternal,
  randomItem
} from "../misc/util";
import GroundController from "../misc/ground";

enum GameStatus {
  MAIN_MENU,
  PLAYING,
  FINISHING,
  GAME_OVER
}

const randomLane = biasedRandomBooleanFactory();

export default class MainScene extends Phaser.Scene {
  private gameStatus: GameStatus = GameStatus.MAIN_MENU;

  private ground: GroundController;

  private cars: Phaser.Physics.Arcade.Group | null = null;
  private labels: Phaser.GameObjects.Layer | null = null;
  private milestones: Phaser.Physics.Arcade.Group | null = null;
  private player: Phaser.Physics.Arcade.Sprite | null = null
  private vegetation: Phaser.GameObjects.Layer | null = null;

  private addCarTimer: Phaser.Time.TimerEvent | null = null;
  private addVegetationTimer: Phaser.Time.TimerEvent | null = null;
  
  private score = 0;
  private speedMultiplier = 1;

  private titleLabel: Phaser.GameObjects.Text | null = null;
  private scoreLabel: Phaser.GameObjects.Text | null = null;
  private statusLabel: Phaser.GameObjects.Text | null = null;

  private crashSound: Phaser.Sound.BaseSound | null = null;
  private engineSound: Phaser.Sound.BaseSound | null = null;
  private hornSound: Phaser.Sound.BaseSound | null = null;
  private whooshSound: Phaser.Sound.BaseSound | null = null;

  constructor() {
    super();
    this.ground = new GroundController(this);
  }

  preload() {
    // Load cars.
    this.load.spritesheet('truck', 'assets/sprites/truck-blue.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });
    this.load.spritesheet('car-red', 'assets/sprites/car-red.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });
    this.load.spritesheet('car-orange', 'assets/sprites/car-orange.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });
    this.load.spritesheet('car-yellow', 'assets/sprites/car-yellow.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });

    // Load vegetation.
    this.load.spritesheet('vegetation', 'assets/sprites/vegetation.png', { frameWidth: VEGETATION_WIDTH, frameHeight: VEGETATION_HEIGHT });

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

    // Define groups and layer.
    this.vegetation = this.add.layer();
    this.cars = this.physics.add.group();
    this.milestones = this.physics.add.group();

    // Add controls.
    this.input.keyboard?.on('keydown-SPACE', this.onTap.bind(this));
    this.input.keyboard?.on('keydown-ENTER', this.onTap.bind(this));
    this.input.on('pointerdown', this.onTap.bind(this));

    // Add texts.
    this.labels = this.add.layer();
    this.titleLabel = this.addLabel(0.5 * this.game.canvas.width, 0.2 * this.game.canvas.height, "Road Brawler", 36);
    this.statusLabel = this.addLabel(0.5 * this.game.canvas.width, 0.8 * this.game.canvas.height, "", 24);
    this.scoreLabel = this.addLabel(this.game.canvas.width - 20, 10, "", 16, 1, 0);

    // Pre-propulate screen with vegetation.
    const vegetationRows = Math.ceil((this.game.canvas.height / BASE_CAR_SPEED) * 1000 / BASE_VEGETATION_RATE);
    for(let i=0; i<vegetationRows; i++) {
      this.addVegetation(i * this.game.canvas.height / vegetationRows, true);
    }

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
      // Stop player when it reaches the lane.
      if(this.player && this.player.body) {
        // FIXME: This logic will need to be updated when we support more than 2 lanes.
        if(this.player.body.velocity.x < 0 && this.player.x <= this.ground.laneCenters[0]) {
          this.player.setVelocityX(0);
          this.player.x = this.ground.laneCenters[0];
        }
        if(this.player.body.velocity.x > 0 && this.player.x >= this.ground.laneCenters[1]) {
          this.player.setVelocityX(0);
          this.player.x = this.ground.laneCenters[1];
        }
      }

      // Check for collisions.
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
      this.ground.update(delta, this.speedMultiplier);

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
    this.statusLabel?.setText("Tap to start");
    this.statusLabel?.setVisible(true);
    this.updateScore(0);
    this.scoreLabel?.setVisible(false);

    this.player?.stop();
    this.player?.setFrame(0);
    this.player?.setPosition(this.game.canvas.width / 2, this.game.canvas.height - CAR_SIZE);
    this.player?.setVelocityX(0);

    this.cars?.clear(true, true);

    this.initVegetationTimer()
  }

  startGame() {
    this.gameStatus = GameStatus.PLAYING;

    this.titleLabel?.setVisible(false);
    this.statusLabel?.setVisible(false);
    this.scoreLabel?.setVisible(true);

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

        this.addVegetationTimer?.destroy();
      },
      callbackScope: this
    });
  }

  // --- Miscellaneous --- //

  // FIXME: This function will add more than one care  when we support more than 2 lanes.
  addCar() {
    // Randomly choose a sprint and a lane.
    const sprite = randomItem<string>(['car-red', 'car-orange', 'car-yellow']);
    const useLeft = randomLane();

    // Instantiate car.
    const car = this.cars?.create(
      useLeft ? this.ground.laneCenters[0] : this.ground.laneCenters[1],
      -CAR_SIZE/2,
      sprite,
      7
    ) as Phaser.GameObjects.Sprite;
    car.anims.create({ key: 'rotate', frames: this.anims.generateFrameNumbers(sprite, { start: 7, end: 0 }), frameRate: 10, repeat: -1 });

    const carBody = car.body as Phaser.Physics.Arcade.Body;
    carBody.setAllowGravity(false)
    carBody.setVelocityY((BASE_CAR_SPEED * this.speedMultiplier));
    carBody.setSize(CAR_BODY_WIDTH, CAR_BODY_HEIGHT);

    // Add an invisible rectanble as milestone.
    const milestone = this.add.rectangle(this.game.canvas.width/2, -CAR_SIZE, this.game.canvas.width, 2);
    this.milestones?.add(milestone);
    const milestoneBody = milestone.body as Phaser.Physics.Arcade.Body;
    milestoneBody.setAllowGravity(false)
    milestoneBody.setVelocityY((BASE_CAR_SPEED * this.speedMultiplier));

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
    label.setFontSize(fontSize);
    label.setColor('#fff');
    label.setAlign('center');
    label.setShadow(1, 1, '#000', 1);
    label.setOrigin(originX, originY);
    label.setVisible(false);
    this.labels?.add(label)
    return label
  }
  
  addVegetation(positionY = -VEGETATION_HEIGHT, omitTimer = false) {
    const itemsToAdd = Math.ceil(this.game.canvas.width / (2 * VEGETATION_SPACING)) * 2;
    const itemsSpacing = this.game.canvas.width / itemsToAdd;

    const lanesEnd = this.ground.lastLaneEnd + VEGETATION_WIDTH;
    const lanesStart = this.ground.firstLaneStart - VEGETATION_WIDTH;

    for(let i=0; i<itemsToAdd; i++) {
      // REQ: vegetation should be positioned outside the the lanes space.
      let minX = i * itemsSpacing;
      let maxX = minX + itemsSpacing;
      if(minX >= lanesStart && minX <= lanesEnd) {
        minX = lanesEnd;
      }
      if(maxX >= lanesStart && maxX <= lanesEnd) {
        maxX = lanesStart;
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
      this.initVegetationTimer();
    }
  }

  initCarTimer() {
    this.addCarTimer = this.time.addEvent({
      delay: (BASE_CAR_RATE / this.speedMultiplier),
      callback: this.addCar,
      callbackScope: this
    });
  }

  initVegetationTimer() {
    this.addVegetationTimer = this.time.addEvent({
      delay: (BASE_VEGETATION_RATE / this.speedMultiplier),
      callback: this.addVegetation,
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

  onTap() {
    if(this.gameStatus === GameStatus.MAIN_MENU) {
      this.hornSound?.play();
      this.startGame();
    }

    if(this.gameStatus === GameStatus.PLAYING) {
      this.whooshSound?.play();

      // FIXME: This logic will need to be updated when we support more than 2 lanes.
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
