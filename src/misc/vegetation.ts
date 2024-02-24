import {
  BASE_CAR_SPEED,
  BASE_TRUCK_SPEED,
  BASE_VEGETATION_RATE,
  VEGETATION_COUNT,
  VEGETATION_HEIGHT,
  VEGETATION_SPACING,
  VEGETATION_WIDTH
} from "./constants";
import GroundController from "./ground";
import { NumberGetter, randomFromInternal } from "./util";

export default class VegetationController {
  private scene: Phaser.Scene;
  private ground: GroundController;
  private getSpeedMultiplier: NumberGetter;

  public mainLayer: Phaser.GameObjects.Layer | null = null;

  private addTimer: Phaser.Time.TimerEvent | null = null;

  public firstLaneStart = 0;
  public lastLaneEnd = 0;
  public laneCenters: Array<number> = [];

  constructor(scene: Phaser.Scene, ground: GroundController, getSpeedMultipier: NumberGetter) {
    this.scene = scene;
    this.ground = ground;
    this.getSpeedMultiplier = getSpeedMultipier;
  }

  preload() {
    this.scene.load.spritesheet('vegetation', 'assets/sprites/vegetation.png', { frameWidth: VEGETATION_WIDTH, frameHeight: VEGETATION_HEIGHT });
  }

  create() {
    // Define layer so all sprites have the same depth.
    this.mainLayer = this.scene.add.layer();

    // Pre-propulate screen with vegetation.
    const vegetationRows = Math.ceil((this.scene.game.canvas.height / BASE_CAR_SPEED) * 1000 / BASE_VEGETATION_RATE);
    for(let i=0; i<vegetationRows; i++) {
      this.addVegetation(i * this.scene.game.canvas.height / vegetationRows, true);
    }
  }

  update(delta: number) {
    const brushes = this.mainLayer?.getChildren() ?? [];
    for(let i=0; i<brushes.length; i++) {
      const tile = brushes[i] as Phaser.GameObjects.Sprite;
      tile.y += delta * (BASE_TRUCK_SPEED * this.getSpeedMultiplier()) / 1000;
    }
  }

  addVegetation(positionY = -VEGETATION_HEIGHT, omitTimer = false) {
    const itemsToAdd = Math.ceil(this.scene.game.canvas.width / (2 * VEGETATION_SPACING)) * 2;
    const itemsSpacing = this.scene.game.canvas.width / itemsToAdd;

    const lanesEnd = this.ground.lastLaneEnd + VEGETATION_WIDTH/2;
    const lanesStart = this.ground.firstLaneStart - VEGETATION_WIDTH/2;

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

      const sprite = this.scene.add.sprite(
        randomPositionX,
        positionY,
        'vegetation',
        randomSprite
      )
      this.mainLayer?.add(sprite);
      this.mainLayer?.sendToBack(sprite);
    }

    if(!omitTimer) {
      this.initTimer();
    }
  }

  initTimer() {
    this.addTimer = this.scene.time.addEvent({
      delay: (BASE_VEGETATION_RATE / this.getSpeedMultiplier()),
      callback: this.addVegetation,
      callbackScope: this
    });
  }

  stopTimer() {
    this.addTimer?.destroy();
  }
}
