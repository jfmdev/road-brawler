
// TODO: Define constants for minimum and maximum speeds for the cars.
const BASE_SPEED = 18;
const FLOOR_SIZE = 16;
const CAR_SIZE = 32;

export default class HelloScene extends Phaser.Scene {
  private floor: Phaser.GameObjects.Group | null = null;
  private player: Phaser.Physics.Arcade.Sprite | null = null
  private speed: number = BASE_SPEED;

  constructor() {
    super();
  }
  
  preload() {
    // Load cars (player and NPC).
    this.load.spritesheet('truck', 'assets/sprites/truck-blue.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });
    this.load.spritesheet('car-red', 'assets/sprites/car-red.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });
    this.load.spritesheet('car-orange', 'assets/sprites/car-orange.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });
    this.load.spritesheet('car-yellow', 'assets/sprites/car-yellow.png', { frameWidth: CAR_SIZE, frameHeight: CAR_SIZE });

    // Load floors.
    this.load.image('grass', 'assets/images/grass.jpg');
    this.load.image('soil', 'assets/images/soil.jpg');
    this.load.image('grass-soil-left', 'assets/images/grass-soil-left.jpg');
    this.load.image('grass-soil-right', 'assets/images/grass-soil-right.jpg');

    // Load road.
    this.load.image('road-center', 'assets/images/road-center.jpg');
    this.load.image('road-left', 'assets/images/road-left.jpg');
    this.load.image('road-right', 'assets/images/road-right.jpg');

    // TODO: Load vegetation (trees and bushes).
  }
  
  create() {
    this.floor = this.add.group();
    this.floor.add(this.add.tileSprite(0, 0, this.game.canvas.width, this.game.canvas.height, 'grass').setOrigin(0, 0));

    this.floor.add(this.add.tileSprite(0, 0, Math.floor(this.game.canvas.width/4), this.game.canvas.height, 'soil').setOrigin(0, 0));
    this.floor.add(this.add.tileSprite(Math.floor(this.game.canvas.width/4), 0, FLOOR_SIZE, this.game.canvas.height, 'grass-soil-left').setOrigin(0, 0));
    this.floor.add(this.add.tileSprite(Math.floor(this.game.canvas.width*3/4), 0, Math.floor(this.game.canvas.width/4), this.game.canvas.height, 'soil').setOrigin(0, 0));
    this.floor.add(this.add.tileSprite(Math.floor(this.game.canvas.width*3/4) - FLOOR_SIZE, 0, FLOOR_SIZE, this.game.canvas.height, 'grass-soil-right').setOrigin(0, 0));

    // TODO: The position of the road should be stored on some variable, so later we can use it to place the cars.
    this.floor.add(this.add.tileSprite(Math.floor(this.game.canvas.width/2), 0, FLOOR_SIZE, this.game.canvas.height, 'road-center').setOrigin(0.5, 0));
    this.floor.add(this.add.tileSprite(Math.floor(this.game.canvas.width/2) + FLOOR_SIZE, 0, FLOOR_SIZE, this.game.canvas.height, 'road-right').setOrigin(0.5, 0));
    this.floor.add(this.add.tileSprite(Math.floor(this.game.canvas.width/2) - FLOOR_SIZE, 0, FLOOR_SIZE, this.game.canvas.height, 'road-left').setOrigin(0.5, 0));
  
    this.player = this.physics.add.sprite(this.game.canvas.width / 2, this.game.canvas.height - CAR_SIZE, 'truck');
    this.player.anims.create({ key: 'rotate', frames: this.anims.generateFrameNumbers('truck', { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
    // this.player.anims.play('rotate');
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setAllowGravity(false);

    const test1 = this.physics.add.sprite(this.game.canvas.width / 2 - 0.75*FLOOR_SIZE, this.game.canvas.height/2 - CAR_SIZE, 'car-red');
    const test2 = this.physics.add.sprite(this.game.canvas.width / 2 + 0.75*FLOOR_SIZE, this.game.canvas.height/2 + CAR_SIZE, 'car-orange');
    test1.setFrame(7);
    test2.setFrame(7);
    (test1.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (test2.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // TODO: Should support different difficulty levels according to the number of lanes (2, 3 or 5).
  }

  update(_time: number, delta: number) {
    if(this.floor != null) {
      const tiles = this.floor.getChildren();
      for(let i=0; i<tiles.length; i++) {
        const tile = tiles[i] as Phaser.GameObjects.TileSprite;
        tile.tilePositionY -= delta * this.speed / 1000;
      }
    }
  }
}