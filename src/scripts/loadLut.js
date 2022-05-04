import { LUTCubeLoader } from 'three/examples/jsm/loaders/LUTCubeLoader';

export default function loadLut(path) {
  return new Promise((resolve, reject) => {
    new LUTCubeLoader().load(
      path,
      (lut) => resolve(lut),
      undefined,
      (error) => reject(error),
    );
  });
}
