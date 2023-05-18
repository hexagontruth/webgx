import * as dat from 'dat.gui';
import merge from '../common/util';

import Wgx from './classes/wgx';

const config =  navigator.gpu.requestAdapter();

window.addEventListener('load', async () => {
  window.player = new Wgx();
});