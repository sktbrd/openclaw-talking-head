'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { SceneState } from './types'
import { initializeScene, loadModel, handleResize, cleanupScene } from './sceneSetup'
import { updateAnimations, DEFAULT_ANIMATION_CONFIG } from './animations'
import { ConversationState } from '@/lib/voice/conversation-state'
import { LipSyncEngine, VisemeWeights } from '@/lib/audio/lipSyncEngine'

interface TalkingHeadProps {
  conversationState?: ConversationState;
  lipSyncEngine?: LipSyncEngine | null;
}

/**
 * TalkingHead Component - Voice-Integrated Version
 *
 * This component displays a 3D animated head that responds to voice input
 * with real-time lip-sync and state-driven facial expressions.
 */
export default function TalkingHead({ conversationState = 'IDLE', lipSyncEngine }: TalkingHeadProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SceneState | null>(null)
  const animationFrameRef = useRef<number>()

  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [showDebug, setShowDebug] = useState(false)
  const currentModel = 'Facecap.glb'

  // Initialize Three.js scene and load model
  useEffect(() => {
    if (!containerRef.current) return

    // Initialize scene
    const sceneState = initializeScene(containerRef.current)
    sceneRef.current = sceneState

    // Load 3D model
    loadModel(sceneState.scene, sceneState.renderer, currentModel, setLoadingProgress)
      .then((result) => {
        if (sceneRef.current) {
          sceneRef.current.modelGroup = result.modelGroup
          sceneRef.current.bones = result.bones

          if (result.headMesh) {
            sceneRef.current.headMesh = result.headMesh
            console.log(`✅ Successfully loaded model with morph targets: ${currentModel}`)
          } else {
            sceneRef.current.headMesh = undefined // No morph targets available
            console.log(`⚠️ Model loaded without morph targets: ${currentModel} - animations will be limited`)
          }

          console.log('🦴 Bones received from loadModel:', result.bones)
          console.log('🦴 Bones details:', {
            hasRoot: !!result.bones?.root,
            rootName: result.bones?.root?.name,
            hasJawBone: !!result.bones?.jawBone,
            jawBoneName: result.bones?.jawBone?.name,
            hasNeutralBone: !!result.bones?.neutralBone,
            neutralBoneName: result.bones?.neutralBone?.name
          })
          if (result.bones?.jawBone) {
            console.log(`🦴 Jaw bone found and ready for animation!`)
          } else {
            console.log('⚠️ No jaw bone found in bones object')
          }

          setIsModelLoaded(true)
        }
      })
      .catch((error) => {
        console.error('Failed to load model:', error)
      })

    // Animation loop using Three.js recommended approach
    const animate = () => {
      if (!sceneRef.current) return

      const { clock, renderer, scene, camera, controls } = sceneRef.current
      const delta = clock.getDelta()

      // Update controls
      controls.update()

      // Update animations if model is loaded
      if (sceneRef.current.headMesh || sceneRef.current.bones?.jawBone) {
        updateAnimations(sceneRef.current, delta, DEFAULT_ANIMATION_CONFIG)

        // Update skeleton if we have bones
        if (sceneRef.current.modelGroup) {
          sceneRef.current.modelGroup.traverse((child: THREE.Object3D) => {
            if ((child as any).isSkinnedMesh && (child as THREE.SkinnedMesh).skeleton) {
              (child as THREE.SkinnedMesh).skeleton.update()
            }
          })
        }
      } else {
        // Debug: Log when model is not ready
        if (Math.random() < 0.01) { // Log occasionally to avoid spam
          console.log('⏳ Waiting for model to load...')
        }
      }

      // Render scene
      renderer.render(scene, camera)
    }

    // Use Three.js setAnimationLoop (recommended approach)
    sceneState.renderer.setAnimationLoop(animate)

    // Handle window resize
    const onResize = () => {
      if (sceneRef.current) {
        handleResize(sceneRef.current.camera, sceneRef.current.renderer)
      }
    }
    window.addEventListener('resize', onResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', onResize)
      if (sceneRef.current) {
        // Stop animation loop
        sceneRef.current.renderer.setAnimationLoop(null)
        cleanupScene(sceneRef.current.renderer, containerRef.current)
      }
    }
  }, [])


  // Real-time lip sync from audio
  useEffect(() => {
    if (!lipSyncEngine || !sceneRef.current?.headMesh || !isModelLoaded) return

    const animate = () => {
      if (!sceneRef.current?.headMesh) return

      const visemeWeights = lipSyncEngine.getCurrentViseme()
      applyVisemeWeights(sceneRef.current.headMesh, visemeWeights)
      requestAnimationFrame(animate)
    }

    const animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [lipSyncEngine, isModelLoaded])

  // State-driven facial expressions
  useEffect(() => {
    if (!sceneRef.current || !isModelLoaded) return

    switch (conversationState) {
      case 'LISTENING':
        sceneRef.current.targetExpression = {
          eyeWideLeft: 0.2,
          eyeWideRight: 0.2,
          browInnerUp: 0.1
        }
        break
      case 'THINKING':
        sceneRef.current.targetExpression = {
          browInnerUp: 0.3,
          eyeSquintLeft: 0.2,
          eyeSquintRight: 0.2
        }
        break
      case 'SPEAKING':
        sceneRef.current.targetExpression = {
          mouthSmileLeft: 0.2,
          mouthSmileRight: 0.2
        }
        break
      case 'BARGE_IN':
        sceneRef.current.targetExpression = {
          browDownLeft: 0.3,
          browDownRight: 0.3
        }
        break
      default:
        sceneRef.current.targetExpression = {}
    }
  }, [conversationState, isModelLoaded])


  return (
    <div className="relative w-full h-full">
      {/* Three.js container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading indicator */}
      {!isModelLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
          <div className="text-white text-center">
            <div className="text-xl mb-2">Loading 3D Model...</div>
            <div className="text-sm">{loadingProgress.toFixed(0)}%</div>
          </div>
        </div>
      )}

      {/* Conversation state indicator */}
      {conversationState !== 'IDLE' && (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
          {conversationState}
        </div>
      )}

      {/* Debug toggle */}
      {isModelLoaded && (
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="absolute top-4 left-4 bg-gray-700/80 hover:bg-gray-600/80 text-white px-3 py-2 rounded text-sm"
        >
          {showDebug ? '🔍 Debug: ON' : '🔍 Debug: OFF'}
        </button>
      )}

      {/* Debug info */}
      {showDebug && isModelLoaded && (
        <div className="absolute top-16 left-4 bg-gray-900/90 backdrop-blur-sm text-white p-3 rounded text-xs space-y-1 max-w-xs">
          <div><strong>Model:</strong> {currentModel}</div>
          <div><strong>State:</strong> {conversationState}</div>
          <div><strong>Morph Targets:</strong> {sceneRef.current?.headMesh ? 'Available' : 'None'}</div>
          <div><strong>Lip Sync:</strong> {lipSyncEngine ? 'Active' : 'Inactive'}</div>
        </div>
      )}
    </div>
  )
}

/**
 * Apply viseme weights from lip sync engine to mesh morph targets
 */
function applyVisemeWeights(mesh: THREE.Mesh, weights: VisemeWeights) {
  if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return

  Object.entries(weights).forEach(([targetName, weight]) => {
    const index = mesh.morphTargetDictionary?.[targetName]
    if (index !== undefined && mesh.morphTargetInfluences) {
      // Smooth transition using linear interpolation
      mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(
        mesh.morphTargetInfluences[index],
        weight,
        0.3 // Smoothing factor
      )
    }
  })
}
