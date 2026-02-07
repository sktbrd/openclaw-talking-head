'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'

// Enhanced types for natural animation
interface MorphTargetMesh extends THREE.Mesh {
  morphTargetInfluences?: number[]
  morphTargetDictionary?: { [key: string]: number }
}

interface VisemeWeights {
  [morphTarget: string]: number
}

interface EmotionWeights {
  [morphTarget: string]: number
}

interface AnimationState {
  currentViseme: VisemeWeights
  targetViseme: VisemeWeights
  currentEmotion: EmotionWeights
  targetEmotion: EmotionWeights
  blinkTimer: number
  eyeMovementTimer: number
  headIdleTimer: number
  microExpressionTimer: number
}

export default function MorphingFace() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let camera: THREE.PerspectiveCamera
    let scene: THREE.Scene
    let renderer: THREE.WebGLRenderer
    let mixer: THREE.AnimationMixer | null = null
    let clock: THREE.Clock
    let controls: OrbitControls
    let gui: GUI | null = null

    const init = () => {
      clock = new THREE.Clock()

      // Camera
      camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20)
      camera.position.set(-1.8, 0.8, 3)

      // Scene
      scene = new THREE.Scene()

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setAnimationLoop(animate)
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      containerRef.current!.appendChild(renderer.domElement)

      // KTX2 Loader
      const ktx2Loader = new KTX2Loader()
        .setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/libs/basis/')
        .detectSupport(renderer)

      // Load model
      new GLTFLoader()
        .setKTX2Loader(ktx2Loader)
        .setMeshoptDecoder(MeshoptDecoder)
        .load(
          '/facecap.glb',
          (gltf) => {
            const mesh = gltf.scene.children[0]
            scene.add(mesh)

            mixer = new THREE.AnimationMixer(mesh)
            mixer.clipAction(gltf.animations[0]).play()

            // GUI
            const head = mesh.getObjectByName('mesh_2') as THREE.Mesh
            if (head && head.morphTargetInfluences && head.morphTargetDictionary) {
              const influences = head.morphTargetInfluences

              gui = new GUI()
              gui.close()

              for (const [key, value] of Object.entries(head.morphTargetDictionary)) {
                gui.add(influences, value, 0, 1, 0.01)
                  .name(key.replace('blendShape1.', ''))
                  .listen()
              }
            }
          },
          (progress) => {
            console.log('Loading:', (progress.loaded / progress.total) * 100, '%')
          },
          (error) => {
            console.error('Error loading model:', error)
            // Fallback: try alternative path
            loadAlternativeModel()
          }
        )

      // Environment
      const environment = new RoomEnvironment()
      const pmremGenerator = new THREE.PMREMGenerator(renderer)
      scene.background = new THREE.Color(0x666666)
      scene.environment = pmremGenerator.fromScene(environment).texture

      // Controls
      controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.minDistance = 2.5
      controls.maxDistance = 5
      controls.minAzimuthAngle = -Math.PI / 2
      controls.maxAzimuthAngle = Math.PI / 2
      controls.maxPolarAngle = Math.PI / 1.8
      controls.target.set(0, 0.15, -0.2)
    }

    const loadAlternativeModel = () => {
      // Try loading from CDN as fallback
      new GLTFLoader()
        .load(
          'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r167/examples/models/gltf/facecap.glb',
          (gltf) => {
            const mesh = gltf.scene.children[0]
            scene.add(mesh)

            // Try to find animation mixer
            if (gltf.animations && gltf.animations.length > 0) {
              mixer = new THREE.AnimationMixer(mesh)
              mixer.clipAction(gltf.animations[0]).play()
            }

            // GUI for morph targets
            const head = mesh.getObjectByName('mesh_2') as THREE.Mesh
            if (head && head.morphTargetInfluences && head.morphTargetDictionary) {
              const influences = head.morphTargetInfluences

              gui = new GUI()
              
              for (const [key, value] of Object.entries(head.morphTargetDictionary)) {
                gui.add(influences, value, 0, 1, 0.01)
                  .name(key.replace('blendShape1.', ''))
                  .listen()
              }
            }
          },
          undefined,
          (error) => {
            console.error('Failed to load alternative model:', error)
            createFallbackGeometry()
          }
        )
    }

    const createFallbackGeometry = () => {
      // Create a simple sphere with morph targets as final fallback
      const geometry = new THREE.SphereGeometry(1, 32, 32)
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.y = 0.5
      scene.add(mesh)
      
      console.log('Using fallback sphere geometry')
    }

    const animate = () => {
      const delta = clock.getDelta()

      if (mixer) {
        mixer.update(delta)
      }

      renderer.render(scene, camera)
      controls.update()
    }

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    // Initialize
    init()

    // Event listeners
    window.addEventListener('resize', onWindowResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', onWindowResize)
      
      if (gui) {
        gui.destroy()
      }
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
      
      renderer.dispose()
    }
  }, [])

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />
}