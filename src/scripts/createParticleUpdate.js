import { RepeatWrapping } from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer';

import glslify from 'glslify';
import * as mathf from '@bieb/math';

export default function createParticleUpdate(particleCount, renderer, { getRandomValue }) {
  const textureSize = Math.sqrt(particleCount);
  const compute = new GPUComputationRenderer(textureSize, textureSize, renderer);

  const particleVelocityTexture = compute.createTexture();
  const particlePositionTexture = compute.createTexture();
  const trailTexture = compute.createTexture();

  const particleVelocityShader = glslify(`
      #pragma glslify: curlNoise = require('glsl-curl-noise')
  
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
  
        vec3 position = texture2D(tPosition, uv).xyz;
        vec3 velocity = curlNoise(position) - 0.25 * position;
  
        gl_FragColor = vec4(velocity, 1);
      }
    `);

  const particlePositionShader = glslify(`
      uniform float uStep;
  
      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
  
        vec3 position = texture2D(tPosition, uv).xyz;
        vec3 velocity = uStep * texture2D(tVelocity, uv).xyz;
  
        gl_FragColor = vec4(position + velocity, 1);
      }
    `);

  for (let i = 0; i < particleCount; i++) {
    const channelIndex = 4 * i;
    const r = Math.sqrt(getRandomValue());
    const inclination = mathf.TAU * getRandomValue();
    const azimuth = Math.acos(1 - 2 * getRandomValue());

    particlePositionTexture.image.data[channelIndex + 0] = r * Math.cos(inclination) * Math.sin(azimuth);
    particlePositionTexture.image.data[channelIndex + 1] = r * Math.sin(inclination) * Math.sin(azimuth);
    particlePositionTexture.image.data[channelIndex + 2] = r * Math.cos(azimuth);
    particlePositionTexture.image.data[channelIndex + 3] = 1;

    particleVelocityTexture.image.data[channelIndex + 0] = 0;
    particleVelocityTexture.image.data[channelIndex + 1] = 0;
    particleVelocityTexture.image.data[channelIndex + 2] = 0;
    particleVelocityTexture.image.data[channelIndex + 3] = 1;
  }

  const particleVelocity = compute.addVariable('tVelocity', particleVelocityShader, particleVelocityTexture);
  const particlePosition = compute.addVariable('tPosition', particlePositionShader, particlePositionTexture);

  particlePosition.material.uniforms.uStep = { value: 0 };

  compute.setVariableDependencies(particlePosition, [particlePosition, particleVelocity]);
  compute.setVariableDependencies(particleVelocity, [particlePosition, particleVelocity]);

  trailTexture.wrapS = RepeatWrapping;
  trailTexture.wrapT = RepeatWrapping;

  compute.init();

  return {
    compute,
    particleVelocity,
    particlePosition,
  };
}
