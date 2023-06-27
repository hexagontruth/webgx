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

  class Shape {
    constructor(coordData, colorData, radius, offset) {
      this.coordData = coordData;
      this.colorData = colorData;
      this.coordOffset = offset * 14;
      this.colorOffset = offset * 21;
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
      for (let i = 0; i < 7; i++) {
        colors.push(
          random(),
          0.75,
          0.5 + random() * 0.5
        );
      }
      this.colorData.set(colors, this.colorOffset);
    }

    setVerts() {
      let verts = this.pos.slice();
      for (let i = 0; i < 6; i++) {
        const x = this.pos[0] + this.radius * cos(i / 6 * tau);
        const y = this.pos[1] + this.radius * sin(i / 6 * tau);
        verts.push(x, y);
      }
      this.coordData.set(verts, this.coordOffset);
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
  const vertexCoords = new Float32Array(numShapes * 14);
  const vertexColors = new Float32Array(numShapes * 21);
  const indexData = new Uint16Array(numShapes * 18);

  function setIndexData() {
    const indexPattern = [
      0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 1,
    ];
    for (let i = 0; i < numShapes; i++) {
      const data = indexPattern.map((n) => n + i * 7);
      indexData.set(data, i * 18);
    }
    p.indexBuffer.update();
  }

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
    indexData,
    vertexData: [
      p.createVertexSet(2, vertexCoords),
      p.createVertexSet(3, vertexColors),
    ],
    actions: {
      setup: () => {
        setIndexData();
      },
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
        p.drawIndexed('main', 0);
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