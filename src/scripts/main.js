import createColorMap from './createColorMap';
import loadLut from './loadLut';
import Sketch from './Sketch';

// const IS_DEBUG = true;

const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

(async () => {
  const sketch = new Sketch(context, {
    particleSize: 1 / 512,
    particleColorMap: createColorMap([1, 0, 0, 1, 1, 0.5, 0, 1, 1, 0.75, 0.5, 1]),

    particleAlphaMultiplier: 0.3,
    particleCount: 2 ** 21,
    particleStep: 1 / 2 ** 10,
    particleStepWarmup: 1 / 2 ** 5,
    particleWarmupCount: 10,
    recordingDuration: 10,
    seed: Math.floor(Math.random() * 1024),

    effects: {
      chromaticAberrationIntensity: 8,
      lutMap: await loadLut('/src/luts/Chemical 168.CUBE'),
      lutIntensity: 1,
    },
  });

  sketch.render();
})();
