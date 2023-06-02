import Box from './box';
import Dim from './dim';

export default class Fit {
  fit = 'cover';

  constructor(...args) {
    if (typeof args.slice(-1)[0] == 'string') {
      this.fit = args.pop() == 'cover' ? 'cover' : 'contain';
    }
    const [pw, ph, cw, ch] = args;

    console.log(pw, ph, cw, ch);
    this.child = Box.fitOffset(pw, ph, cw, ch, this.fit);
    this.parent = Box.fitOffset(cw, ch, pw, ph, this.fit == 'cover' ? 'contain' : 'cover');
  }
}