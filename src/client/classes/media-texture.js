import Dim from './dim';
import Fit from './fit';

const { max, min } = Math;

export default class MediaTexture {
  static async awaitLoad(device, texture, media, fit='contain', idx=undefined) {
    return new Promise((resolve) => {
      const eventKey = media instanceof HTMLVideoElement ? 'onloadeddata' : 'onload';
      media[eventKey] = () => {
        resolve(new MediaTexture(device, texture, media, fit, idx));
      };
    });
  }
  constructor(device, texture, media, fit='contain', idx=undefined) {
    this.device = device;
    this.texture = texture;
    this.media = media;
    this.idx = idx;
    this.isVideo = media instanceof HTMLVideoElement;
    this.textureDim = new Dim(texture);
    this.mediaDim = new Dim(media);
    this.fit = new Fit(
      ...this.textureDim,
      ...this.mediaDim,
      fit,
    );
    this.textureOrigin = {
      x: max(this.fit.child.x, 0),
      y: max(this.fit.child.y, 0),
      z: idx,
    }
    if (!this.isVideo) {
      this.update();
    }
  }

  async update() {
    const bitmap = await createImageBitmap(
      this.media,
      ...this.fit.childCrop,
      {
        resizeWidth: this.fit.childScale.width,
        resizeHeight: this.fit.childScale.height,
      },
    );
    this.device.queue.copyExternalImageToTexture(
      {
        source: bitmap,
        // flipY: true,
      },
      {
        texture: this.texture,
        origin: this.textureOrigin,
      },
      [bitmap.width, bitmap.height],
    );
  }
}