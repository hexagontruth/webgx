import * as dat from 'dat.gui';

import { merge, importObject } from './util';
import Config from './classes/config';
import Player from './classes/player';

window.addEventListener('load', async () => {
  const config = new Config();
  window.player = new Player(config);
  window.merge = merge;
  window.curd = await importObject('/data/programs/default.js');
});