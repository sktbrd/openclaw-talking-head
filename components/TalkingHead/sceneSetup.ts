import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { MorphTargetMesh, MorphTargetGeometry, SceneState } from './types'
import { createBasicMorphs, generateMeshPoints } from './morphAuthoring'

/**
 * Initialize the Three.js scene, camera, renderer, and controls
 */
export function initializeScene(container: HTMLElement): SceneState {
  const clock = new THREE.Clock()

  // Camera setup
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20)
  camera.position.set(-1.8, 0.8, 3)

  // Scene setup
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x333333)

  // Renderer setup
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  container.appendChild(renderer.domElement)

  // Environment setup
  const environment = new RoomEnvironment()
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  scene.environment = pmremGenerator.fromScene(environment).texture

  // Add additional lighting for more natural appearance
  setupNaturalLighting(scene)

  // Controls setup
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.minDistance = 2.5
  controls.maxDistance = 5
  controls.minAzimuthAngle = -Math.PI / 2
  controls.maxAzimuthAngle = Math.PI / 2
  controls.maxPolarAngle = Math.PI / 1.8
  controls.target.set(0, 0.15, -0.2)

  return {
    scene,
    camera,
    renderer,
    controls,
    clock,
    headMesh: undefined,
    modelGroup: undefined,
    bones: undefined,
    currentViseme: {},
    targetViseme: {},
    currentExpression: {},
    targetExpression: {},
    blinkTimer: 0,
    blinkThreshold: undefined,
    eyeMovementTimer: 0,
    headIdleTimer: 0,
    microExpressionTimer: 0,
    speechTimeouts: [],
    isSpeaking: false,
    boneAnimationValue: 0,
    targetBoneAnimationValue: 0
  }
}

/**
 * Load the 3D model with morph targets
 */
export async function loadModel(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  modelName: string = 'Facecap.glb',
  onProgress?: (progress: number) => void
): Promise<{ headMesh: MorphTargetMesh | null, modelGroup: THREE.Object3D, bones?: { root?: THREE.Bone, jawBone?: THREE.Bone, neutralBone?: THREE.Bone } }> {
  return new Promise((resolve, reject) => {
    // KTX2 Loader for texture compression
    const ktx2Loader = new KTX2Loader()
      .setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/libs/basis/')
      .detectSupport(renderer)

    // Load GLTF model
    new GLTFLoader()
      .setKTX2Loader(ktx2Loader)
      .setMeshoptDecoder(MeshoptDecoder)
      .load(
        `/${modelName}`,
        (gltf) => {
          const mesh = gltf.scene.children[0]
          scene.add(mesh)

          // Find bones in the model - search the entire scene
          let bones: { root?: THREE.Bone, jawBone?: THREE.Bone, neutralBone?: THREE.Bone } = {}
          let allBones: THREE.Bone[] = []

          // Search through entire GLTF scene, not just first child
          gltf.scene.traverse((child) => {
            if ((child as any).isBone) {
              const bone = child as THREE.Bone
              console.log('🦴 Found bone:', bone.name, 'type:', bone.type, 'isBone:', (bone as any).isBone)
              allBones.push(bone)

              // Store bones by name - based on testing:
              // Bone = jaw (up/down movement)
              // Bone001 = rotation (subtle)
              // neutral_bone = whole head (don't use for talking)
              if (bone.name === 'Bone') {
                bones.jawBone = bone  // Main jaw bone for up/down movement
                console.log('  → Set as jaw bone (main up/down movement)')
              } else if (bone.name === 'Bone001' || bone.name === 'Bone.001') {
                bones.root = bone  // Secondary bone for subtle rotation
                console.log('  → Set as rotation bone (subtle movement)')
              } else if (bone.name === 'neutral_bone') {
                bones.neutralBone = bone  // Whole head - not used for talking
                console.log('  → Set as neutral bone (whole head - not used)')
              }
            }
          })

          console.log('🦴 Total bones found:', allBones.length)
          console.log('🦴 All bone names:', allBones.map(b => b.name))
          console.log('🦴 Assigned bones:', {
            root: bones.root?.name,
            jawBone: bones.jawBone?.name,
            neutralBone: bones.neutralBone?.name
          })
          console.log('🦴 Final bones object being returned:', bones)

          // Check bone hierarchy
          if (bones.jawBone) {
            console.log('🦴 Jaw bone parent:', bones.jawBone.parent?.name)
            console.log('🦴 Jaw bone children:', bones.jawBone.children.map(c => c.name))
          }

          // Also look for SkinnedMesh and its skeleton
          gltf.scene.traverse((child) => {
            if ((child as any).isSkinnedMesh) {
              const skinnedMesh = child as THREE.SkinnedMesh
              console.log('💀 Found SkinnedMesh:', skinnedMesh.name)
              if (skinnedMesh.skeleton) {
                console.log('💀 Skeleton bones:', skinnedMesh.skeleton.bones.map(b => b.name))
                console.log('💀 Skeleton root:', skinnedMesh.skeleton.bones[0]?.name)

                // Update bones reference if we find them through skeleton
                skinnedMesh.skeleton.bones.forEach(bone => {
                  if ((bone.name === 'Bone001' || bone.name === 'Bone.001') && !bones.jawBone) {
                    bones.jawBone = bone
                    console.log('💀 Found jaw bone through skeleton!')
                  }
                })
              }
            }
          })

          // Find the head mesh with morph targets
          let headMesh = mesh.getObjectByName('mesh_2') as MorphTargetMesh

          if (headMesh && headMesh.morphTargetInfluences && headMesh.morphTargetDictionary) {
            console.log('✅ Model loaded successfully with morph targets!')
            console.log('Available morph targets:', Object.keys(headMesh.morphTargetDictionary))
            console.log('Total morph targets:', Object.keys(headMesh.morphTargetDictionary).length)

            // Check for key mouth-related targets
            const mouthTargets = Object.keys(headMesh.morphTargetDictionary).filter(name =>
              name.toLowerCase().includes('mouth') ||
              name.toLowerCase().includes('jaw') ||
              name.toLowerCase().includes('lip')
            )
            console.log('🎭 Mouth-related morph targets found:', mouthTargets)

            // CRITICAL FIX: Ensure morph targets are properly set up on geometry
            const geometry = headMesh.geometry as MorphTargetGeometry
            if (!geometry.morphTargets || geometry.morphTargets.length === 0) {
              console.log('🔧 Setting up morph targets on geometry...')

              // Initialize geometry morph target properties
              geometry.morphTargets = geometry.morphTargets || []
              geometry.morphTargetInfluences = headMesh.morphTargetInfluences || []

              // Ensure geometry has morph target dictionary
              if (!geometry.morphTargetDictionary) {
                geometry.morphTargetDictionary = { ...headMesh.morphTargetDictionary }
              }

              console.log('✅ Morph targets set up on geometry')
              console.log('Geometry morph targets:', geometry.morphTargets?.length || 0)
              console.log('Geometry morph dictionary:', Object.keys(geometry.morphTargetDictionary || {}))
            }

            // Log detailed morph target info for debugging
            console.log('All available morph targets:')
            Object.entries(headMesh.morphTargetDictionary).forEach(([name, index]) => {
              console.log(`  ${name}: index ${index}`)
            })

            resolve({ headMesh, modelGroup: mesh, bones })
          } else {
            console.warn('⚠️ No morph targets found on mesh_2, searching all meshes...')

            // Search all meshes for morph targets
            let morphTargetMesh: MorphTargetMesh | null = null

            mesh.traverse((child) => {
              if (child instanceof THREE.Mesh &&
                  child.morphTargetInfluences &&
                  child.morphTargetDictionary &&
                  !morphTargetMesh) {
                console.log(`Found morph targets on ${child.name}:`, Object.keys(child.morphTargetDictionary))
                morphTargetMesh = child as MorphTargetMesh

                // CRITICAL FIX: Ensure morph targets are properly set up on geometry
                if (morphTargetMesh) {
                  const altGeometry = morphTargetMesh.geometry as MorphTargetGeometry
                  if (!altGeometry.morphTargets || altGeometry.morphTargets.length === 0) {
                    console.log('🔧 Setting up morph targets on geometry for alternative mesh...')

                    // Initialize geometry morph target properties
                    altGeometry.morphTargets = altGeometry.morphTargets || []
                    altGeometry.morphTargetInfluences = morphTargetMesh.morphTargetInfluences || []

                    // Ensure geometry has morph target dictionary
                    if (!altGeometry.morphTargetDictionary) {
                      altGeometry.morphTargetDictionary = { ...morphTargetMesh.morphTargetDictionary }
                    }

                    console.log('✅ Morph targets set up on geometry for alternative mesh')
                    console.log('Alt geometry morph targets:', altGeometry.morphTargets?.length || 0)
                    console.log('Alt geometry morph dictionary:', Object.keys(altGeometry.morphTargetDictionary || {}))
                  }
                }
              }
            })

            if (morphTargetMesh) {
              resolve({ headMesh: morphTargetMesh, modelGroup: mesh, bones })
            } else {
              // If no morph targets found at all, procedurally create a small set on a likely head mesh
              console.warn('⚠️ No morph targets found in model - creating basic procedural morphs')
              let candidate: MorphTargetMesh | null = null
              mesh.traverse((child) => {
                if (candidate) return
                if (child instanceof THREE.Mesh) {
                  // Prefer the largest mesh by vertex count as a head candidate
                  const g = child.geometry as THREE.BufferGeometry
                  const pos = g.getAttribute('position') as THREE.BufferAttribute
                  if (pos && pos.count > 1000) candidate = child as MorphTargetMesh
                }
              })

              if (candidate) {
                try {
                  const head = candidate as MorphTargetMesh
                  createBasicMorphs(head)
                  console.log('✅ Procedural morphs created: jawOpen, mouthSmileLeft/Right, mouthPucker')

                  // Ensure dictionary exists after creation
                  const geom = head.geometry as MorphTargetGeometry
                  if (!head.morphTargetDictionary && geom.morphAttributes?.position) {
                    // Build a dictionary by attribute order
                    const dict: Record<string, number> = {}
                    const attrs = geom.morphAttributes.position as any[]
                    attrs.forEach((attr, idx) => {
                      const n = (attr && attr.name) || `morph_${idx}`
                      dict[n] = idx
                    })
                    head.morphTargetDictionary = dict
                    head.morphTargetInfluences = new Array(attrs.length).fill(0)
                  }

                  // Generate reference mesh points for later use
                  const points = generateMeshPoints(head)
                  ;(head as any).userData = (head as any).userData || {}
                  ;(head as any).userData.meshPoints = points
                  console.log('🧭 Generated mesh points:', Object.keys(points))

                  resolve({ headMesh: head, modelGroup: mesh, bones })
                } catch (e) {
                  console.warn('❌ Failed to create procedural morphs:', e)
                  resolve({ headMesh: null, modelGroup: mesh, bones })
                }
              } else {
                console.warn('⚠️ No suitable mesh found for procedural morphs')
                resolve({ headMesh: null, modelGroup: mesh, bones })
              }
            }
          }
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100
          console.log('Loading:', percent.toFixed(2), '%')
          if (onProgress) {
            onProgress(percent)
          }
        },
        (error) => {
          console.error('Error loading model:', error)
          reject(error)
        }
      )
  })
}

/**
 * Handle window resize events
 */
export function handleResize(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer): void {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

/**
 * Setup natural lighting for more realistic appearance
 */
function setupNaturalLighting(scene: THREE.Scene): void {
  // Key light (main light source, slightly from above)
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2)
  keyLight.position.set(2, 3, 2)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.width = 2048
  keyLight.shadow.mapSize.height = 2048
  keyLight.shadow.camera.near = 0.5
  keyLight.shadow.camera.far = 50
  keyLight.shadow.camera.left = -5
  keyLight.shadow.camera.right = 5
  keyLight.shadow.camera.top = 5
  keyLight.shadow.camera.bottom = -5
  scene.add(keyLight)

  // Fill light (softer light from the opposite side)
  const fillLight = new THREE.DirectionalLight(0x87CEEB, 0.4)
  fillLight.position.set(-2, 1, -1)
  scene.add(fillLight)

  // Rim light (subtle highlight from behind)
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.3)
  rimLight.position.set(0, 2, -3)
  scene.add(rimLight)

  // Ambient light for overall illumination
  const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
  scene.add(ambientLight)

  // Subtle point light for facial highlights
  const pointLight = new THREE.PointLight(0xffffff, 0.5, 10)
  pointLight.position.set(0, 1.5, 2)
  scene.add(pointLight)

  console.log('🎭 Natural lighting setup complete')
}

/**
 * Cleanup Three.js resources
 */
export function cleanupScene(renderer: THREE.WebGLRenderer, container: HTMLElement | null): void {
  if (container && renderer.domElement && container.contains(renderer.domElement)) {
    container.removeChild(renderer.domElement)
  }
  renderer.dispose()
}
