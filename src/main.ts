import Phaser from "phaser";
import MainScene from "./scenes/MainScene";

const width = window.innerWidth * window.devicePixelRatio;
const height = window.innerHeight * window.devicePixelRatio;

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