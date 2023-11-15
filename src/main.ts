import Phaser from "phaser";
import MainScene from "./scenes/MainScene";

const MAX_HEIGHT = 320;
const height = window.innerHeight > MAX_HEIGHT ? MAX_HEIGHT : window.innerHeight;
const width = window.innerHeight > MAX_HEIGHT ? Math.floor(window.innerWidth * MAX_HEIGHT / window.innerHeight) : window.innerWidth;

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