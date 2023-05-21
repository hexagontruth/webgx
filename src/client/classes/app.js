import { merge, importObject } from '../util';
import Config from './config';
import Player from './player';

export default class App {
  constructor() {
    window.addEventListener('load', () => this.handleLoad());
    window.addEventListener('resize', () => this.handleResize());
  }

  handleLoad() {
    this.config = new Config();
    this.player = new Player(document.body, this.config);
    this.handleResize();
  }

  handleResize() {
    this.player?.handleResize();
  }
}