
// TODO: Define constants for minimum and maximum speeds for the cars.
const BASE_SPEED = 18;
const FLOOR_SIZE = 16;

export default class HelloScene extends Phaser.Scene {
  private floor: Phaser.GameObjects.Group | null = null;
  private speed: number = BASE_SPEED;

  constructor() {
    super('hello');
  }
  
  preload() {
    // Load static from our public dir.
    this.load.image('vite-phaser-logo', 'assets/images/vite-phaser.png');
  
    // Load static assets from url.
    this.load.image('sky', 'https://labs.phaser.io/assets/skies/space3.png');
    this.load.image('red', 'https://labs.phaser.io/assets/particles/red.png');

    // TODO: Load cars (player and enemies).

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

    this.floor.add(this.add.tileSprite(Math.floor(this.game.canvas.width/2), 0, FLOOR_SIZE, this.game.canvas.height, 'road-center').setOrigin(0, 0));
    this.floor.add(this.add.tileSprite(Math.floor(this.game.canvas.width/2)+FLOOR_SIZE, 0, FLOOR_SIZE, this.game.canvas.height, 'road-right').setOrigin(0, 0));
    this.floor.add(this.add.tileSprite(Math.floor(this.game.canvas.width/2)-FLOOR_SIZE, 0, FLOOR_SIZE, this.game.canvas.height, 'road-left').setOrigin(0, 0));
  
    const particles = this.add.particles(0, 0, 'red', {
      speed: 100,
      scale: { start: 1, end: 0 },
      blendMode: 'ADD'
    });
  
    // TODO: Replace logo by a car.
    const logo = this.physics.add.image(400, 100, 'vite-phaser-logo');
    logo.setVelocity(100, 200);
    logo.setBounce(1, 1);
    logo.setCollideWorldBounds(true)
  
    particles.startFollow(logo);

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