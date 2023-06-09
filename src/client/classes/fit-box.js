import Box from './box';
import Dim from './dim';

const { max, min } = Math;

export default class FitBox {
  static set() {

  }

  fit = 'contain';

  constructor(...args) {
    if (typeof args.slice(-1)[0] == 'string') {
      this.fit = args.pop() == 'cover' ? 'cover' : 'contain';
    }

    const [opw, oph, ocw, och] = args;
    const pr = opw / oph;
    const cr = ocw / och;
    const cond = (this.fit == 'contain') == (cr > pr);
    let px, py, pw, ph, cx, cy, cw, ch;
    
    if (cond) {
      cw = opw;
      ch = och * opw / ocw;
      pw = ocw;
      ph = oph * ocw / opw;
    }
    else {
      ch = oph;
      cw = ocw * oph / och;
      ph = och;
      pw = opw * och / oph;
    }

    cx = (opw - cw) / 2;
    cy = (oph - ch) / 2;
    px = (ocw - pw) / 2;
    py = (och - ph) / 2;
  
    this.originalDims = [opw, oph, ocw, och];
    this.child = new Box(cx, cy, cw, ch);
    this.parent = new Box(px, py, pw, ph);

    this.childCrop = new Box(
      max(-cx, 0) * ocw / cw,
      max(-cy, 0) * och / ch,
      (cw + min(cx * 2, 0)) * ocw / cw,
      (ch + min(cy * 2, 0)) * och / ch,
    );

    this.childScale = new Dim(
      cw + min(cx * 2, 0),
      ch + min(cy * 2, 0),
    );
  }

  get inset() {
    return `${this.child.y}px ${this.child.x}px`
  }
}