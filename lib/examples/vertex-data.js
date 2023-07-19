export default (p) => {
  const shader = 'vertex-data.wgsl';
  const { abs, random, cos, sin, sign } = Math;
  const tau = Math.PI * 2;
  const maxShapeCount = 36;

  let shapes = [];
  let radii = [];
  const vertexCoords = new Float32Array(maxShapeCount * 14);
  const vertexColors = new Float32Array(maxShapeCount * 21);
  const indexData = new Uint16Array(maxShapeCount * 18);

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

  function setIndexData() {
    const indexPattern = [
      0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 1,
    ];
    for (let i = 0; i < maxShapeCount; i++) {
      const data = indexPattern.map((n) => n + i * 7);
      indexData.set(data, i * 18);
    }
    p.dataBuffers[3].write();
  }

  function generateShapes() {
    const shapeCount = p.controlData.shapeCount;
    shapes = [];
    radii = randomLengths(shapeCount, 0.25, 0.3);
    for (let i = 0; i < shapeCount; i++) {
      const shape = new Shape(vertexCoords, vertexColors, radii[i], i);
      shapes.push(shape);
    }
    p.dataBuffers[2].write();
  }

  return {
    settings: {
      dim: 2048,
      // dim: [1080, 1920],
      period: 300,
    },
    controls: {
      shapeCount: [12, 0, maxShapeCount, 1],
      opacity: [1, 0, 1, 0.05],
      invert: true,
      background: true,
      filter: true,
    },
    uniforms: {
      opacity: 1,
      invert: 1,
      background: 1,
    },
    dataBuffers: [
      p.createVertexBuffer(2, new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1,
      ])),
      p.createVertexBuffer(2, vertexCoords),
      p.createVertexBuffer(3, vertexColors),
      p.createIndexBuffer(indexData),
    ],
    actions: {
      setup: () => {
        setIndexData();
      },
      reset: () => {
        generateShapes();
      },
      draw: async () => {
        shapes.forEach((e) => e.move());
        p.dataBuffers[1].write();
        p.controlData.background ? p.draw('test') : p.clearTexture(p.drawTexture);
        p.drawIndexed('main', 3, 0, 0, p.controlData.shapeCount * 18);
        p.controlData.filter && p.draw('filter');
        p.render();
      },
      onControlChange: (key, val) => {
        if (key == 'shapeCount') {
          generateShapes();
        }
        else if (p.programUniforms.has(key)) {
          p.programUniforms.write(key, val);
        }
        p.refresh();
      },
    },
    pipelines: {
      test: p.createRenderPipeline(shader, {
        vertexMain: 'fullVertexMain',
        fragmentMain: 'testMain',
        vertexBuffers: [0],
      }),
      filter: p.createRenderPipeline(shader, {
        vertexMain: 'fullVertexMain',
        fragmentMain: 'dogFilterMain',
        vertexBuffers: [0],
      }),
      main: p.createRenderPipeline(shader, {
        vertexBuffers: [1, 2],
        topology: 'triangle-list',
      }),
    },
  };
};
