import * as THREE from 'three'
import { MorphTargetMesh, MorphTargetGeometry } from './types'

/**
 * Add a morph target to a mesh by procedurally deforming vertex positions.
 */
export function addMorphTarget(
  mesh: THREE.Mesh,
  name: string,
  deformer: (target: Float32Array, index: number, position: THREE.Vector3) => void
): void {
  const geometry = mesh.geometry as THREE.BufferGeometry
  const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute
  if (!positionAttr) return

  const vertexCount = positionAttr.count
  const baseArray = positionAttr.array as Float32Array

  // Clone base positions
  const targetArray = new Float32Array(baseArray)
  const temp = new THREE.Vector3()

  for (let i = 0; i < vertexCount; i++) {
    temp.fromBufferAttribute(positionAttr, i)
    deformer(targetArray, i, temp)
  }

  // Ensure morph attributes container exists
  if (!geometry.morphAttributes.position) geometry.morphAttributes.position = []
  const morphAttr = new THREE.Float32BufferAttribute(targetArray, 3)
  ;(morphAttr as any).name = name
  geometry.morphAttributes.position.push(morphAttr)

  // Ensure material supports morphs
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  for (const m of materials) {
    const mat = m as THREE.MeshStandardMaterial
    ;(mat as any).morphTargets = true
  }

  // No updateMorphTargets in newer three; dictionary will be rebuilt by caller
}

/**
 * Create simple, robust procedural morphs suitable for a variety of stylized heads.
 */
export function createBasicMorphs(mesh: MorphTargetMesh): void {
  const geometry = mesh.geometry as MorphTargetGeometry
  if (!geometry || !(geometry.getAttribute('position') as any)) return

  // Ensure necessary containers
  geometry.morphAttributes = geometry.morphAttributes || {}

  // Heuristic measurements from bounding box
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const height = bb.max.y - bb.min.y
  const width = bb.max.x - bb.min.x

  // Determine forward direction (+Z or -Z) by extremity
  const forwardSign = (-bb.min.z > bb.max.z) ? -1 : 1

  // Jaw open deformer: move vertices below mouth band downward slightly
  const mouthBandY = bb.min.y + 0.58 * height
  const jawStrength = 0.02 * height
  addMorphTarget(mesh, 'jawOpen', (arr, i, v) => {
    const influence = v.y < mouthBandY ? (mouthBandY - v.y) / height : 0
    if (influence <= 0) return
    const iy = i * 3 + 1
    arr[iy] -= jawStrength * influence
  })

  // Smile deformers: pull lip corners outwards and up
  const smileUp = 0.01 * height
  const smileOut = 0.015 * width
  const mouthBandWidth = 0.05 * height
  const makeSmile = (side: 'L' | 'R') => (arr: Float32Array, i: number, v: THREE.Vector3) => {
    const isBand = Math.abs(v.y - mouthBandY) < mouthBandWidth
    if (!isBand) return
    const sign = side === 'L' ? -1 : 1
    if (sign * v.x < 0.15 * width) return
    const ix = i * 3
    const iy = ix + 1
    arr[ix] += smileOut * sign
    arr[iy] += smileUp
  }
  addMorphTarget(mesh, 'mouthSmileLeft', makeSmile('L'))
  addMorphTarget(mesh, 'mouthSmileRight', makeSmile('R'))

  // Pucker deformer: pull vertices near mouth center forward and inward
  const puckIn = 0.012 * width
  const puckFwd = 0.012 * height
  const mouthCenterX = (bb.min.x + bb.max.x) * 0.5
  const mouthRadius = 0.25 * Math.min(width, height)
  addMorphTarget(mesh, 'mouthPucker', (arr, i, v) => {
    const dy = v.y - mouthBandY
    const dx = v.x - mouthCenterX
    const dist = Math.sqrt(dx * dx + dy * dy)
    const t = Math.max(0, 1 - dist / mouthRadius)
    if (t <= 0) return
    const ix = i * 3
    const iy = ix + 1
    const iz = ix + 2
    // Inward towards mouth center
    arr[ix] -= dx * (puckIn / (Math.max(1e-5, mouthRadius))) * t
    arr[iy] -= dy * (puckIn / (Math.max(1e-5, mouthRadius))) * t
    // Forward along the face normal direction
    arr[iz] += forwardSign * puckFwd * t
  })
}

/** User-adjustable anchor points for localized morphs */
export interface MorphAnchors {
  mouthLeft: THREE.Vector3
  mouthRight: THREE.Vector3
  mouthCenter: THREE.Vector3
  chin: THREE.Vector3
  noseTip: THREE.Vector3
}

export interface AnchorMorphParams {
  mouthRadius?: number // region around mouth center controlling pucker/stretch
  bandHalfHeight?: number // vertical band around mouth line for smiles
  jawStrength?: number // absolute downward offset scale for jaw
  smileUp?: number
  smileOut?: number
  puckerIn?: number
  puckerFwd?: number
}

/**
 * Rebuilds basic morphs using explicit anchors and tunable parameters.
 * This clears existing position morph targets and recreates: jawOpen, mouthSmileLeft/Right, mouthPucker
 */
export function createMorphsFromAnchors(
  mesh: MorphTargetMesh,
  anchors: MorphAnchors,
  params: AnchorMorphParams = {}
): void {
  const geometry = mesh.geometry as MorphTargetGeometry
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  if (!pos) return

  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const height = bb.max.y - bb.min.y
  const width = bb.max.x - bb.min.x
  const forwardSign = (-bb.min.z > bb.max.z) ? -1 : 1

  const mouthCenter = anchors.mouthCenter
  const mouthLineY = mouthCenter.y

  const mouthRadius = params.mouthRadius ?? 0.25 * Math.min(width, height)
  const bandHalf = params.bandHalfHeight ?? 0.05 * height
  const jawStrength = params.jawStrength ?? 0.02 * height
  const smileUp = params.smileUp ?? 0.01 * height
  const smileOut = params.smileOut ?? 0.015 * width
  const puckerIn = params.puckerIn ?? 0.012 * width
  const puckerFwd = params.puckerFwd ?? 0.012 * height

  // Clear existing position morph targets to avoid accumulation
  geometry.morphAttributes = geometry.morphAttributes || {}
  geometry.morphAttributes.position = []

  // jawOpen - restrict to mouthRadius around mouth center to avoid ears
  addMorphTarget(mesh, 'jawOpen', (arr, i, v) => {
    const dx = v.x - mouthCenter.x
    const dy = v.y - mouthLineY
    const r = Math.sqrt(dx * dx + dy * dy)
    if (r > mouthRadius) return
    const radialFalloff = Math.max(0, 1 - r / mouthRadius)
    const influence = v.y < mouthLineY ? (mouthLineY - v.y) / height : 0
    if (influence <= 0) return
    const iy = i * 3 + 1
    arr[iy] -= jawStrength * influence * radialFalloff
  })

  // smiles
  const makeSmile = (side: 'L' | 'R') => (arr: Float32Array, i: number, v: THREE.Vector3) => {
    if (Math.abs(v.y - mouthLineY) > bandHalf) return
    const dx = v.x - mouthCenter.x
    const dy = v.y - mouthLineY
    const r = Math.sqrt(dx * dx + dy * dy)
    if (r > mouthRadius) return
    const radialFalloff = Math.max(0, 1 - r / mouthRadius)
    const sign = side === 'L' ? -1 : 1
    if (sign * dx < 0.04 * width) return
    const ix = i * 3
    const iy = ix + 1
    arr[ix] += smileOut * sign * radialFalloff
    arr[iy] += smileUp * radialFalloff
  }
  addMorphTarget(mesh, 'mouthSmileLeft', makeSmile('L'))
  addMorphTarget(mesh, 'mouthSmileRight', makeSmile('R'))

  // pucker localized around mouthCenter
  addMorphTarget(mesh, 'mouthPucker', (arr, i, v) => {
    const dx = v.x - mouthCenter.x
    const dy = v.y - mouthLineY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const t = Math.max(0, 1 - dist / mouthRadius)
    if (t <= 0) return
    const ix = i * 3
    const iy = ix + 1
    const iz = ix + 2
    arr[ix] -= dx * (puckerIn / (Math.max(1e-5, mouthRadius))) * t
    arr[iy] -= dy * (puckerIn / (Math.max(1e-5, mouthRadius))) * t
    arr[iz] += forwardSign * puckerFwd * t
  })
}

/**
 * Generate simple facial reference points from geometry.
 * Returns nose tip, chin, mouth corners, and mouth center based on heuristics.
 */
export function generateMeshPoints(mesh: THREE.Mesh): Record<string, THREE.Vector3> {
  const geometry = mesh.geometry as THREE.BufferGeometry
  const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute
  const result: Record<string, THREE.Vector3> = {}
  if (!positionAttr) return result

  geometry.computeBoundingBox()
  const bb = geometry.boundingBox!
  const height = bb.max.y - bb.min.y
  const width = bb.max.x - bb.min.x

  const forwardSign = (-bb.min.z > bb.max.z) ? -1 : 1

  const count = positionAttr.count
  let noseTip = new THREE.Vector3(0, 0, -Infinity)
  let chin = new THREE.Vector3(0, Infinity, 0)

  const temp = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    temp.fromBufferAttribute(positionAttr, i)
    // Nose tip: most forward near center X
    const forward = forwardSign * temp.z
    if (Math.abs(temp.x) < 0.25 * width && forward > forwardSign * noseTip.z) {
      noseTip.copy(temp)
    }
    // Chin: lowest Y near center X
    if (Math.abs(temp.x) < 0.25 * width && temp.y < chin.y) {
      chin.copy(temp)
    }
  }

  const mouthBandY = bb.min.y + 0.58 * height
  const bandHalf = 0.05 * height
  let mouthLeft = new THREE.Vector3(-Infinity, mouthBandY, 0)
  let mouthRight = new THREE.Vector3(Infinity, mouthBandY, 0)

  for (let i = 0; i < count; i++) {
    temp.fromBufferAttribute(positionAttr, i)
    if (Math.abs(temp.y - mouthBandY) > bandHalf) continue
    // Prefer vertices that are somewhat forward
    const forward = forwardSign * temp.z
    const noseForward = forwardSign * noseTip.z
    if (forward < noseForward - 0.05 * height) continue

    if (temp.x > mouthLeft.x) mouthLeft.copy(temp)
    if (temp.x < mouthRight.x) mouthRight.copy(temp)
  }

  const mouthCenter = new THREE.Vector3().addVectors(mouthLeft, mouthRight).multiplyScalar(0.5)

  result['noseTip'] = noseTip
  result['chin'] = chin
  result['mouthLeft'] = mouthLeft
  result['mouthRight'] = mouthRight
  result['mouthCenter'] = mouthCenter

  return result
}


