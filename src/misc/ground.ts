import {
  BASE_TRUCK_SPEED,
  FLOOR_SIZE,
  VEGETATION_WIDTH,
  VEGETATION_HEIGHT
} from "./constants";
import { Direction, NumberGetter } from "./util";

export default class GroundController {
  private scene: Phaser.Scene;
  private getSpeedMultiplier: NumberGetter;

  public mainLayer: Phaser.GameObjects.Layer | null = null;

  private laneSprites: Array<Phaser.GameObjects.TileSprite> = [];
  public firstLaneStart = 0;
  public lastLaneEnd = 0;
  public laneCenters: Array<number> = [];

  constructor(scene: Phaser.Scene, getSpeedMultiplier: NumberGetter) {
    this.scene = scene;
    this.getSpeedMultiplier = getSpeedMultiplier;
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

    // Add soil and grass.
    this.mainLayer = this.scene.add.layer();
    this.mainLayer.add(this.scene.add.tileSprite(0, 0, canvasWidth, canvasHeight, 'soil').setOrigin(0, 0));
    this.mainLayer.add(this.scene.add.tileSprite(Math.floor(canvasWidth/4), 0, Math.floor(canvasWidth/2), canvasHeight, 'grass').setOrigin(0, 0));

    // Add road.
    this.buildLanes()
  }

  buildLanes(count = 2) {
    const canvasWidth = this.scene.game.canvas.width;
    const canvasHeight = this.scene.game.canvas.height;
    const centerX = Math.floor(canvasWidth/2);

    this.firstLaneStart = centerX - (count + 1)*FLOOR_SIZE/2; // + 2
    this.lastLaneEnd = centerX + (count + 1)*FLOOR_SIZE/2; // - 2;

    // Remove previous sprites.
    this.laneSprites.forEach(sprite => sprite.destroy(true))

    // Add new sprites.
    this.laneSprites = [];
    for(let i=0; i<=count; i++) {
      let positionX = this.firstLaneStart + i*FLOOR_SIZE;
      if(i === 0) {
        positionX += 1;
      } else if(i === count) {
        positionX -= 1;
      }

      const spritesheet = i === 0 ? 'road-left' : i === count ? 'road-right' : 'road-center';
      const sprite = this.scene.add.tileSprite(positionX, 0, FLOOR_SIZE, canvasHeight, spritesheet).setOrigin(0, 0);

      this.mainLayer?.add(sprite);
      this.laneSprites.push(sprite);
    }

    this.laneCenters = [];
    const laneSpace = (this.lastLaneEnd - this.firstLaneStart)/(count+1);
    for(let i=1; i<=count; i++) {
      this.laneCenters.push(this.firstLaneStart + i*laneSpace);
    }

    // CAVEAT: This is required to avoid some overlapping issues between 'left' and 'right' sprites.
    for(let i=1; i<count; i++) {
      this.mainLayer?.bringToTop(this.laneSprites[i]);
    }      
  }

  update(delta: number) {
    const tiles = this.mainLayer?.getChildren() ?? [];
    for(let i=0; i<tiles.length; i++) {
      const tile = tiles[i] as Phaser.GameObjects.TileSprite;
      tile.tilePositionY -= delta * (BASE_TRUCK_SPEED * this.getSpeedMultiplier()) / 1000;
    }  
  }

  // --- Utilities --- //

  closestLane(positionX: number) {
    const closest = this.laneCenters.reduce<number>(
      (bestCenter, center) => bestCenter < 0 || Math.abs(center - positionX) < Math.abs(bestCenter - positionX)
      ? center 
      : bestCenter
    , -1);
    
    return this.laneCenters.indexOf(closest);
  }

  lanesCount() {
    return this.laneCenters.length;
  }

  nextLane(positionX: number, direction: Direction) {
    const currLane = this.closestLane(positionX);
    if(direction === Direction.NONE || (direction === Direction.LEFT && currLane === 0) || (direction === Direction.RIGHT && currLane === (this.laneCenters.length - 1))) {
      return currLane;
    } else {
      return direction === Direction.LEFT ? currLane - 1 : currLane + 1;
    }
  }
}
