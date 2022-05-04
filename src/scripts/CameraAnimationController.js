/* eslint-disable no-underscore-dangle */

import { Vector3 } from 'three/build/three.module';
import * as mathf from '@bieb/math';

import createRandom from 'seed-random';

export default class CameraAnimationController {
  constructor(camera, {
    distanceMax,
    distanceMin,
    endDistanceOffset,
    endPositionOffset,
    seed,
  }) {
    this.animationEnd = new Vector3();
    this.animationStart = new Vector3();
    this.camera = camera;
    this.distanceMax = distanceMax;
    this.distanceMin = distanceMin;
    this.endDistanceOffset = endDistanceOffset;
    this.endPositionOffset = endPositionOffset;

    this.getRandomValue = createRandom(seed + 1337);
  }

  switch() {
    const phi = mathf.TAU * this.getRandomValue();
    const theta = mathf.PI * this.getRandomValue();
    const r = mathf.mix(this.distanceMin, this.distanceMax, this.getRandomValue());

    this.animationStart.setFromSphericalCoords(r, phi, theta);

    this.animationEnd.setFromSphericalCoords(
      r + this.endDistanceOffset * this.getRandomValue(),
      phi + mathf.mix(0, mathf.TAU * this.endPositionOffset, this.getRandomValue()),
      theta + mathf.mix(0, mathf.PI * this.endPositionOffset, this.getRandomValue()),
    );

    this.camera.position.copy(this.animationStart);
    this._updateTarget();
  }

  update(t) {
    this.camera.position.copy(this.animationStart.clone().lerp(this.animationEnd, t));
  }

  _updateTarget() {
    this.camera.position.copy(this.animationStart.clone().lerp(this.animationEnd, 0.5));
    this.camera.lookAt(new Vector3());
  }
}
