import Phaser from "phaser";
import MainScene from "./scenes/MainScene";

// TODO: Should define a maximum size to prevent cars from being to small.
const height = window.innerHeight > 640 ? 640 : window.innerHeight;
const width = window.innerHeight > 640 ? Math.floor(window.innerWidth * 640 / window.innerHeight) : window.innerWidth;

const config: Phaser.Types.Core.GameConfig = {
  parent: "app",
  type: Phaser.AUTO,
  width,
  height,
  scale: {
    mode: Phaser.Scale.ScaleModes.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 200 }
    }
  },
  scene: [
    MainScene,
  ]
};

export default new Phaser.Game(config);