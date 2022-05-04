import {
  ClampToEdgeWrapping,
  LinearFilter,
  UnsignedByteType,
  UVMapping,
  DataTexture,
  RGBAFormat,
} from 'three';

export default function createColorMap(colors) {
  const width = colors.length / 4;

  return new DataTexture(
    new Uint8Array(colors.map((v) => 255 * v)),
    width,
    1,
    RGBAFormat,
    UnsignedByteType,
    UVMapping,
    ClampToEdgeWrapping,
    ClampToEdgeWrapping,
    LinearFilter,
    LinearFilter,
  );
}
