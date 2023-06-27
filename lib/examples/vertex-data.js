export default (p) => {
  const { abs, max, min, random, cos, sin, sign } = Math;
  const tau = Math.PI * 2;
  const numShapes = 12;

  function randomInterval() {
    return random() * 2 - 1;
  }

  function randomLengths(n, e, scale=1) {
    const edges = Array(n + 1).fill().map((_, idx) => idx);
    for (let i = 1; i < n; i++ ) {
      edges[i] += randomInterval() * e;
    }
    return Array(n).fill().map((_, idx) => (edges[idx + 1] - edges[idx]) * scale);
  }
  window.test = randomLengths;

  class Shape {
    constructor(coordData, colorData, radius, offset) {
      this.coordData = coordData;
      this.colorData = colorData;
      this.coordOffset = offset * 18 * 2;
      this.colorOffset = offset * 18 * 3;
      this.radius = radius;
      this.pos = Array(2).fill().map(() => randomInterval() * 0.75);
      this.vel = Array(2).fill().map(() => {
        let v = random() * 2 - 1;
        v = v + Math.sign(v);
        v /= 50;
        return v;
      });
      this.randomizeColors();
      this.setVerts();
    }

    randomizeColors() {
      const colors = [];
      for (let i = 0; i < 18; i++) {
        colors.push(random());
        colors.push(0.75);
        colors.push(0.5 + random() * 0.5);
      }
      this.colorData.set(colors, this.colorOffset);
    }

    setVerts() {
      let verts = [];
      for (let i = 0; i < 6; i++) {
        const x = this.pos[0] + this.radius * cos(i / 6 * tau);
        const y = this.pos[1] + this.radius * sin(i / 6 * tau);
        verts.push([x, y]);
      }
      for (let i = 0; i < 6; i++) {
        const v1 = verts[i];
        const v2 = verts[(i + 1) % 6];
        const values = [].concat(v2, v1, this.pos);
        this.coordData.set(values, this.coordOffset + i * 6);
      }
    }

    move() {
      this.pos[0] += this.vel[0];
      this.pos[1] += this.vel[1];

      let dim = [1, 0.866];
      this.pos = this.pos.map((p, idx) => {
        const oob = abs(p) - 1 + this.radius * dim[idx];
        if (oob > 0) {
          this.vel[idx] *= -1;
          return p - oob * sign(p);
        }
        return p;
      });

      this.setVerts();
    }
  }

  let shapes = [];
  let radii = [];
  const vertexCoords = new Float32Array(numShapes * 36);
  const vertexColors = new Float32Array(numShapes * 54);

  return {
    name: 'default',
    settings: {
      // dim: [1080, 1920],
      dim: 2048,
      interval: 25,
      start: 0,
      stop: true,
      period: 300,
      renderPairs: 2,
      output: {
        fps: 30,
        crf: 15,
        width: 1024,
      },
    },
    controls: {
    },
    uniforms: {
    },
    vertexData: [
      p.createVertexSet(2, vertexCoords),
      p.createVertexSet(3, vertexColors),
    ],
    actions: {
      reset: () => {
        shapes = [];
        radii = randomLengths(numShapes, 0.25, 0.3);
        for (let i = 0; i < numShapes; i++) {
          const shape = new Shape(vertexCoords, vertexColors, radii[i], i);
          shapes.push(shape);
        }
        p.vertexBuffers[1].update();
      },
      draw: async () => {
        shapes.forEach((e) => e.move());
        p.vertexBuffers[0].update();
        p.clearTexture(p.drawTexture);
        p.draw('main', 0);
        p.render();
      },
      onControlChange: (key, val) => {
        p.programUniforms.update(key, val);
      }
    },
    pipelines: {
      main: {
        shader: 'vertex-data.wgsl',
        vertexSets: [0, 1],
        topology: 'triangle-list',
      },
    },
  };
};