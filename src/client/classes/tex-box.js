import Dim from './dim';
import FitBox from './fit-box';

const { max, min } = Math;

export default class TexBox {
  static async awaitLoad(device, texture, media, fit='contain', idx=undefined) {
    return new Promise((resolve) => {
      const isVideo = media instanceof HTMLVideoElement;
      const eventKey = isVideo ? 'loadeddata' : 'load';
      const fn = () => {
        media.removeEventListener(eventKey, fn);
        if (isVideo) {
          media.muted = true;
          media.setAttribute('loop', true);
          media.setAttribute('autoplay', true);
          media.play();
        }
        resolve(new TexBox(device, texture, media, fit, idx));
      };
      media.addEventListener(eventKey, fn);
    });
  }

  constructor(device, texture, media, fit='contain', idx=undefined) {
    this.device = device;
    this.texture = texture;
    this.media = media;
    this.idx = idx;
    this.isVideo = media instanceof HTMLVideoElement;
    this.setFitBox(fit);
    // this.isVideo || this.update();
  }

  setFitBox(fit) {
    this.fit = fit ?? this.fit;
    this.textureDim = new Dim(this.texture);
    this.mediaDim = new Dim(this.media);
    this.fitBox = new FitBox(
      ...this.textureDim,
      ...this.mediaDim,
      this.fit,
    );
    this.textureOrigin = {
      x: 0,
      y: 0,
      z: this.idx,
    }
    this.textureCopyOrigin = {
      x: max(this.fitBox.child.x, 0),
      y: max(this.fitBox.child.y, 0),
      z: this.idx,
    }
  }

  clearTexture() {
    this.device.queue.writeTexture(
      {
        texture: this.texture,
        origin: this.textureOrigin,
      },
      new Uint8Array(this.texture.width * this.texture.height * 4),
      {
        bytesPerRow: 4 * this.texture.width,
      },
      {
        width: this.texture.width,
        height: this.texture.height,
      },
    );
  }

  async update() {
    const bitmap = await createImageBitmap(
      this.media,
      ...this.fitBox.childCrop,
      {
        resizeWidth: this.fitBox.childScale.width,
        resizeHeight: this.fitBox.childScale.height,
      },
    );

    this.device.queue.copyExternalImageToTexture(
      {
        source: bitmap,
        // flipY: true,
      },
      {
        texture: this.texture,
        origin: this.textureCopyOrigin,
      },
      [bitmap.width, bitmap.height],
    );
  }
}
