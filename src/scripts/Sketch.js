/* eslint-disable class-methods-use-this, no-lone-blocks, no-underscore-dangle */

import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three/build/three.module';

import { CopyShader } from 'three/examples/jsm/shaders/CopyShader';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer';
import { LuminosityHighPassShader } from 'three/examples/jsm/shaders/LuminosityHighPassShader';
import { LUTCubeLoader } from 'three/examples/jsm/loaders/LUTCubeLoader';
import { LUTPass } from 'three/examples/jsm/postprocessing/LUTPass';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

import createRandom from 'seed-random';
import glslify from 'glslify';
import * as mathf from '@bieb/math';

import CameraAnimationController from './CameraAnimationController';
import createParticleUpdate from './createParticleUpdate';

export default class Sketch {
  constructor(context, settings = {}) {
    this.frame = 0;

    const getRandomValue = createRandom(settings.seed);

    const renderer = this._createRenderer({
      canvas: context.canvas,
      height: window.innerHeight,
      width: window.innerWidth,
    });

    const camera = new PerspectiveCamera(50, 1, 0.01, 1024);

    this.cameraAnimationController = new CameraAnimationController(camera, {
      distanceMax: 5,
      distanceMin: 1,
      endDistanceOffset: 0.125,
      endPositionOffset: 1 / 32,
      seed: settings.seed,
      target: new Vector3(),
    });

    this.cameraAnimationController.switch();

    const scene = new Scene();

    this.renderPipeline = this._createRenderPipeline(renderer, scene, camera, {
      chromaticAberrationIntensity:
        settings.effects.chromaticAberrationIntensity,
      lutIntensity: settings.effects.lutIntensity,
      lutMap: settings.effects.lutMap,
    });

    const { compute: particleCompute, particlePosition } = createParticleUpdate(
      settings.particleCount,
      renderer,
      { getRandomValue },
    );

    this.particleCompute = particleCompute;
    this.particlePosition = particlePosition;

    this.particleMesh = this._createParticleMesh({
      height: window.innerHeight,
      particleColorMap: settings.particleColorMap,
      particleCount: settings.particleCount,
      size: settings.particleSize,
      getRandomValue,
    });

    scene.add(this.particleMesh);

    // Warmup
    // {
    //   particlePosition.material.uniforms.uStep.value = settings.particleStepWarmup;

    //   for (let i = 0; i < 60; i++) {
    //     particleCompute.compute();
    //     this.particleMesh.material.uniforms.uParticlePositionMap.value = particleCompute.getCurrentRenderTarget(particlePosition).texture;
    //   }

    //   particlePosition.material.uniforms.uStep.value = settings.particleStep;

    //   for (let i = 0; i < settings.particleWarmupCount * 60; i++) {
    //     particleCompute.compute();
    //     this.particleMesh.material.uniforms.uParticlePositionMap.value = particleCompute.getCurrentRenderTarget(particlePosition).texture;
    //   }
    // }

    this.animationFrameCount = 60 * settings.recordingDuration;

    window.addEventListener('keypress', (event) => {
      // eslint-disable-next-line default-case
      switch (event.key) {
        case 'c':
          this.cameraAnimationController.switch();
          break;
      }
    });
  }

  render() {
    if (this.frame % this.animationFrameCount === 0) {
      this.cameraAnimationController.switch();
    }

    const t = (this.frame / this.animationFrameCount) % 1;

    this.cameraAnimationController.update(t);

    this.particleCompute.compute();
    this.particleMesh.material.uniforms.uParticlePositionMap.value = this.particleCompute.getCurrentRenderTarget(this.particlePosition).texture;

    this.renderPipeline.render();

    this.frame++;
  }

  _createParticleMesh({
    getRandomValue,
    height,
    particleColorMap,
    particleCount,
    size,
  }) {
    const intensity = new Float32Array(particleCount).fill(0);
    const texCoords = new Float32Array(2 * particleCount).fill(0);
    const vertices = new Float32Array(3 * particleCount).fill(0);
    const textureSize = Math.sqrt(particleCount);

    for (let i = 0; i < particleCount; i++) {
      intensity[i] = getRandomValue();

      {
        const index = 2 * i;

        texCoords[index + 0] = (i % textureSize) / textureSize;
        texCoords[index + 1] = Math.floor(i / textureSize) / textureSize;
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('intensity', new Float32BufferAttribute(intensity, 1));
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('texCoord', new Float32BufferAttribute(texCoords, 2));

    return new Points(
      geometry,
      new ShaderMaterial({
        blending: AdditiveBlending,
        depthTest: false,
        depthWrite: false,

        vertexShader: `
          attribute float intensity;
          attribute vec2 texCoord;
  
          uniform float uScale;
          uniform float uSize;
          uniform sampler2D uParticlePositionMap;
  
          varying float vIntensity;
  
          void main() {
            vIntensity = intensity;
  
            vec3 position = texture2D(uParticlePositionMap, texCoord).xyz;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  
            gl_PointSize = uSize * (uScale / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,

        fragmentShader: `
          uniform sampler2D uParticlePositionMap;
          uniform sampler2D uParticleColorMap;
          uniform float uParticleAlphaMultiplier;
  
          varying float vIntensity;
  
          void main() {
            vec4 color = texture2D(uParticleColorMap, vec2(vIntensity, 0.5))
              * vec4(1, 1, 1, uParticleAlphaMultiplier);
  
            gl_FragColor = color;
          }
        `,

        uniforms: {
          uParticleAlphaMultiplier: { value: 1 },
          uParticleColorMap: { value: particleColorMap },
          uParticlePositionMap: { value: null },
          uScale: { value: height / 2 },
          uSize: { value: size },
        },
      }),
    );
  }

  _createRenderer({ canvas, height, width }) {
    const renderer = new WebGLRenderer({
      depth: true,
      stencil: true,
    });

    renderer.setClearColor('#000', 1);
    renderer.setSize(width, height, false);

    return renderer;
  }

  _createRenderPipeline(renderer, scene, camera, {
    chromaticAberrationIntensity,
    lutIntensity,
    lutMap,
  }) {
    const composer = new EffectComposer(renderer);
    const resolution = renderer.getSize(new Vector2());

    composer.addPass(new RenderPass(scene, camera));

    composer.addPass(new LUTPass({
      intensity: lutIntensity,
      lut: lutMap.texture,
    }));

    composer.addPass(new ShaderPass({
      vertexShader: `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: glslify(`
        #pragma glslify: ca = require('glsl-chromatic-aberration')

        uniform vec2 resolution;
        uniform float uIntensity;
        uniform sampler2D tDiffuse;

        void main() {
          vec2 uv = gl_FragCoord.xy / resolution;
          vec2 direction = (uv - 0.5) * uIntensity;

          gl_FragColor = ca(tDiffuse, uv, resolution.xy, direction);
        }
      `),
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: resolution },
        uIntensity: { value: chromaticAberrationIntensity },
      },
    }));

    composer.addPass(new UnrealBloomPass(resolution, 1, 0.5, 0.75));

    return composer;
  }
}
