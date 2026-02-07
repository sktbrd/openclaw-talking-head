import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { VisemeWeights } from '@/utils/visemeMapping'
import { ExpressionWeights } from '@/utils/expressionMapping'

type EmotionWeights = ExpressionWeights

// Extended mesh type with morph target support
export interface MorphTargetMesh extends THREE.Mesh {
  morphTargetInfluences?: number[]
  morphTargetDictionary?: { [key: string]: number }
}

// Extended geometry type with morph target support
export interface MorphTargetGeometry extends THREE.BufferGeometry {
  morphTargets?: any[]
  morphTargetInfluences?: number[]
  morphTargetDictionary?: { [key: string]: number }
}

// Main scene state interface
export interface SceneState {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  clock: THREE.Clock
  headMesh?: MorphTargetMesh
  modelGroup?: THREE.Object3D // Track the GLTF group added to scene
  bones?: {
    root?: THREE.Bone
    jawBone?: THREE.Bone
    neutralBone?: THREE.Bone
  }
  currentViseme: VisemeWeights
  targetViseme: VisemeWeights
  currentExpression: EmotionWeights
  targetExpression: EmotionWeights
  blinkTimer: number
  blinkThreshold?: number // Current blink threshold (randomized)
  eyeMovementTimer: number
  headIdleTimer: number
  microExpressionTimer: number
  speechTimeouts: number[] // Track active speech timeouts
  isSpeaking: boolean
  boneAnimationValue: number
  targetBoneAnimationValue: number
}

// Animation configuration
export interface AnimationConfig {
  visemeSpeed: number        // Speed of viseme interpolation (default: 20.0)
  expressionSpeed: number     // Speed of expression interpolation (default: 8.0)
  blinkSpeed: number         // Speed of blink animation (default: 25.0)
  blinkIntervalMin: number   // Minimum time between blinks (default: 3)
  blinkIntervalMax: number   // Maximum additional random time (default: 2)
  eyeMovementMin: number     // Minimum time between eye movements (default: 2)
  eyeMovementMax: number     // Maximum additional random time (default: 3)
  headIdleAmplitude: number  // Amplitude of idle head movement (default: 0.02)
  headIdleFrequency: number  // Frequency of idle head movement (default: 0.5)
  eyeContactFrequency: number // Chance of looking at camera (default: 0.4)
  idleMovementsEnabled: boolean // Whether to enable idle movements (default: true)
}

// Speech simulation configuration
export interface SpeechConfig {
  syllableTime: number       // Time per syllable/viseme (default: 200ms)
  defaultSyllables: number   // Default number of syllables (default: 15)
  jawOpenMin: number        // Minimum jaw opening (default: 0.1)
  jawOpenMax: number        // Maximum jaw opening (default: 0.7)
  headMovementRange: number // Range of head movement during speech (default: 0.1)
}
