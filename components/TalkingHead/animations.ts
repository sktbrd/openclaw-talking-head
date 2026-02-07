import { SceneState, AnimationConfig, MorphTargetMesh } from './types'

/**
 * Default animation configuration for natural movements
 */
export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  visemeSpeed: 25.0,         // Faster transitions for quick phoneme changes
  expressionSpeed: 8.0,      // Smooth emotion transitions
  blinkSpeed: 30.0,          // Fast blink speed for quick transitions
  blinkIntervalMin: 1.5,     // More frequent blinking for engagement
  blinkIntervalMax: 3.5,     // Natural variation
  eyeMovementMin: 0.8,       // Very frequent eye movements for eye contact
  eyeMovementMax: 2.5,       // Natural variation
  headIdleAmplitude: 0.01,   // Very subtle head movement
  headIdleFrequency: 0.2,    // Slow, breathing-like motion
  eyeContactFrequency: 0.4,  // 40% chance of looking at camera during eye movements
  idleMovementsEnabled: true  // Enable idle movements by default
}

/**
 * Update all animations for the talking head
 * This is the main animation loop that runs every frame
 */
export function updateAnimations(
  state: SceneState,
  delta: number,
  config: AnimationConfig = DEFAULT_ANIMATION_CONFIG
): void {
  if (!state.bones?.jawBone) {
    return
  }

  const { bones } = state

  // Bone animation for jaw movement is now handled directly in speechSimulation.ts
  // using a continuous sine wave animation that matches the test animation
  // This provides more consistent and natural movement

  // Handle idle head movement with bones if available
  // Don't apply idle movement during speech to avoid interference
  if (config.idleMovementsEnabled && bones.neutralBone && !state.isSpeaking) {
    state.headIdleTimer += delta
    const idleY = Math.sin(state.headIdleTimer * config.headIdleFrequency) * config.headIdleAmplitude
    const idleX = Math.sin(state.headIdleTimer * config.headIdleFrequency * 0.6) * config.headIdleAmplitude * 0.5

    // Apply subtle idle motion to neutral bone (whole head) only when not speaking
    bones.neutralBone.rotation.y = idleY
    bones.neutralBone.rotation.x = idleX
  }
}

/**
 * Trigger a blink animation using bones (if eye bones available)
 * Otherwise this is a no-op since we're not using morph targets
 */
export function triggerBlink(headMesh: MorphTargetMesh): void {
  // No-op - blink animation would require eye bones or morph targets
  return
}

/**
 * Trigger an eye movement (placeholder for bone-based implementation)
 */
export function triggerEyeMovement(headMesh: MorphTargetMesh): void {
  // No-op - eye movement would require eye bones or morph targets
  return
}

/**
 * Reset all animations to neutral state
 */
export function resetAnimations(state: SceneState): void {
  // Reset bone animation values
  state.boneAnimationValue = 0
  state.targetBoneAnimationValue = 0

  // Reset bone positions if available
  if (state.bones) {
    if (state.bones.jawBone) {
      state.bones.jawBone.rotation.x = 0
      // Keep Y and Z as they were initially
    }
    if (state.bones.root) {
      state.bones.root.rotation.set(0, 0, 0)
    }
  }

  // Reset timers
  state.blinkTimer = 0
  state.eyeMovementTimer = 0
  state.headIdleTimer = 0
  state.microExpressionTimer = 0

  // Cancel any ongoing speech
  if (state.speechTimeouts) {
    state.speechTimeouts.forEach(timeoutId => clearTimeout(timeoutId))
    state.speechTimeouts = []
    state.isSpeaking = false
  }

  // Reset viseme and expression states (kept for compatibility)
  state.targetViseme = {}
  state.currentViseme = {}
  state.targetExpression = {}
  state.currentExpression = {}
}