import {
  BASE_TRUCK_SPEED,
  FLOOR_SIZE,
  VEGETATION_WIDTH,
  VEGETATION_HEIGHT
} from "./constants";

export default class GroundController {
  private scene: Phaser.Scene;

  public mainGroup: Phaser.GameObjects.Group | null = null;

  public firstLaneStart = 0;
  public lastLaneEnd = 0;
  public laneCenters: Array<number> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  preload() {
    // Load ground.
    this.scene.load.image('grass', 'assets/images/grass.jpg');
    this.scene.load.image('soil', 'assets/images/soil.jpg');
    this.scene.load.spritesheet('vegetation', 'assets/sprites/vegetation.png', { frameWidth: VEGETATION_WIDTH, frameHeight: VEGETATION_HEIGHT });

    // Load road.
    this.scene.load.image('road-center', 'assets/images/road-center.jpg');
    this.scene.load.image('road-left', 'assets/images/road-left.jpg');
    this.scene.load.image('road-right', 'assets/images/road-right.jpg');
  }

  create() {
    const canvasWidth = this.scene.game.canvas.width;
    const canvasHeight = this.scene.game.canvas.height;
    const centerX = Math.floor(canvasWidth/2);

    // Add soil and grass.
    this.mainGroup = this.scene.add.group();
    this.mainGroup.add(this.scene.add.tileSprite(0, 0, canvasWidth, this.scene.game.canvas.height, 'soil').setOrigin(0, 0));
    this.mainGroup.add(this.scene.add.tileSprite(Math.floor(canvasWidth/4), 0, Math.floor(canvasWidth/2), canvasHeight, 'grass').setOrigin(0, 0));

    // Add road.
    this.mainGroup?.add(this.scene.add.tileSprite(centerX + FLOOR_SIZE - 2, 0, FLOOR_SIZE, canvasHeight, 'road-right').setOrigin(0.5, 0));
    this.mainGroup?.add(this.scene.add.tileSprite(centerX - FLOOR_SIZE + 2, 0, FLOOR_SIZE, canvasHeight, 'road-left').setOrigin(0.5, 0));
    this.mainGroup?.add(this.scene.add.tileSprite(centerX, 0, FLOOR_SIZE, canvasHeight, 'road-center').setOrigin(0.5, 0));

    this.laneCenters = [centerX - FLOOR_SIZE/2, centerX + FLOOR_SIZE/2];
    this.firstLaneStart = centerX - FLOOR_SIZE;
    this.lastLaneEnd = centerX + FLOOR_SIZE;
  }

  update(delta: number, speedMultiplier: number) {
    const tiles = this.mainGroup?.getChildren() ?? [];
    for(let i=0; i<tiles.length; i++) {
      const tile = tiles[i] as Phaser.GameObjects.TileSprite;
      tile.tilePositionY -= delta * (BASE_TRUCK_SPEED * speedMultiplier) / 1000;
    }  
  }
}
