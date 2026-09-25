import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react"

const shaderProps = {
  animate: "on",
  axesHelper: "off",
  brightness: 1.2,
  cAzimuthAngle: 178,
  cDistance: 3.62,
  cPolarAngle: 90,
  cameraZoom: 1,
  color1: "#001aff",
  color2: "#dbba95",
  color3: "#d0bce1",
  destination: "onCanvas",
  embedMode: "off",
  envPreset: "city",
  fov: 45,
  grain: "on",
  lightType: "3d",
  positionX: -1.4,
  positionY: 0,
  positionZ: 0,
  reflection: 0.1,
  rotationX: 0,
  rotationY: 10,
  rotationZ: 50,
  shader: "defaults",
  type: "plane",
  uAmplitude: 6.3,
  uDensity: 6.1,
  uFrequency: 5.5,
  uSpeed: 0.2,
  uStrength: 4.2,
  wireframe: false,
} as const

export function AuthBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 bg-[#001aff]"
      aria-hidden="true"
    >
      <ShaderGradientCanvas
        fov={45}
        pointerEvents="none"
        pixelDensity={1.5}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <ShaderGradient {...shaderProps} />
      </ShaderGradientCanvas>
    </div>
  )
}
