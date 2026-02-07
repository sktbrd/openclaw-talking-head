'use client'

import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { MorphTargetMesh } from './types'
import { createMorphsFromAnchors, MorphAnchors, AnchorMorphParams, generateMeshPoints } from './morphAuthoring'

interface Props {
  renderer: THREE.WebGLRenderer
  camera: THREE.PerspectiveCamera
  scene: THREE.Scene
  headMesh?: MorphTargetMesh
  onToggle?: (enabled: boolean) => void
  modelKey?: string
}

export default function MorphEditor({ renderer, camera, scene, headMesh, onToggle, modelKey }: Props) {
  const controlsRef = useRef<TransformControls | null>(null)
  const anchorHelpersRef = useRef<THREE.Object3D | null>(null)
  const enabledRef = useRef<boolean>(false)
  const focusNameRef = useRef<string>('all')

  useEffect(() => {
    if (!headMesh) return

    const group = new THREE.Group()
    group.name = 'MorphEditorAnchors'
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xff6699, depthTest: false })

    // Size anchors relative to head dimensions
    const worldBox = new THREE.Box3().setFromObject(headMesh)
    const worldSize = new THREE.Vector3()
    worldBox.getSize(worldSize)
    const radius = Math.max(0.005, worldSize.x * 0.02)
    const sphereGeo = new THREE.SphereGeometry(radius, 16, 16)

    // Start from saved anchors if available, else from detected defaults
    let defaultPoints = (headMesh as any).userData?.meshPoints || {}
    try {
      if (modelKey) {
        const saved = window.localStorage.getItem(`morphAnchors:${modelKey}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          const v3 = (o: any) => new THREE.Vector3(o.x, o.y, o.z)
          defaultPoints = {
            ...defaultPoints,
            ...Object.fromEntries(Object.entries(parsed).map(([k, v]: any) => [k, v3(v)]))
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load saved anchors', e)
    }
    if (!defaultPoints || Object.keys(defaultPoints).length === 0) {
      defaultPoints = generateMeshPoints(headMesh)
    }
    const makeLabelSprite = (text: string) => {
      const padding = 8
      const fontSize = 28
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 128
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // background
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      const w = canvas.width, h = canvas.height
      ctx.fillRect(0, 0, w, h)
      // text
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, w / 2, h / 2)
      const tex = new THREE.CanvasTexture(canvas)
      const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true })
      const sprite = new THREE.Sprite(mat)
      const scaleY = radius * 3
      const scaleX = scaleY * (w / h)
      sprite.scale.set(scaleX, scaleY, 1)
      sprite.renderOrder = 1000
      return sprite
    }

    const makeHandle = (p: THREE.Vector3, name: string, label: string) => {
      const h = new THREE.Mesh(sphereGeo, sphereMat.clone())
      h.position.copy(p)
      h.name = name
      h.renderOrder = 999
      h.frustumCulled = false
      const labelSprite = makeLabelSprite(label)
      labelSprite.position.set(0, radius * 2.5, 0)
      h.add(labelSprite)
      group.add(h)
    }

    const mouthCenter = (defaultPoints.mouthCenter || new THREE.Vector3(0, 0.02, 0.025)).clone()
    const mouthTop = mouthCenter.clone().add(new THREE.Vector3(0, worldSize.y * 0.02, 0))
    const mouthBottom = mouthCenter.clone().add(new THREE.Vector3(0, -worldSize.y * 0.02, 0))

    makeHandle(defaultPoints.mouthLeft || new THREE.Vector3(-0.03, mouthCenter.y, 0.02), 'mouthLeft', 'Mouth Left')
    makeHandle(defaultPoints.mouthRight || new THREE.Vector3(0.03, mouthCenter.y, 0.02), 'mouthRight', 'Mouth Right')
    makeHandle(mouthCenter, 'mouthCenter', 'Mouth Center')
    makeHandle(mouthTop, 'mouthTop', 'Mouth Top')
    makeHandle(mouthBottom, 'mouthBottom', 'Mouth Bottom')
    makeHandle(defaultPoints.chin || new THREE.Vector3(0, -0.02, 0.02), 'chin', 'Chin')
    makeHandle(defaultPoints.noseTip || new THREE.Vector3(0, 0.05, 0.05), 'noseTip', 'Nose')

    headMesh.add(group)
    anchorHelpersRef.current = group

    const controls = new TransformControls(camera, renderer.domElement)
    controls.setMode('translate')
    controls.setSize(0.8)
    controls.addEventListener('dragging-changed', (e: any) => {
      const dragging = e.value
      enabledRef.current = dragging
      if (onToggle) onToggle(dragging)
    })
    // Prevent OrbitControls interference while pointer is over gizmo
    controls.addEventListener('mouseDown', () => {
      renderer.domElement.style.pointerEvents = 'auto'
    })
    controls.addEventListener('mouseUp', () => {
      renderer.domElement.style.pointerEvents = 'auto'
    })

    controlsRef.current = controls
    scene.add(controls)

    // Attach to first anchor by default
    const first = group.children[0] as THREE.Object3D
    if (first) controls.attach(first)

    // Helper to apply focus (show only one anchor or all)
    const applyFocus = (name: string) => {
      focusNameRef.current = name
      group.children.forEach((c) => {
        c.visible = name === 'all' ? true : c.name === name
      })
      if (name !== 'all') {
        const target = group.getObjectByName(name)
        if (target) controls.attach(target)
      }
    }
    applyFocus(focusNameRef.current)

    // Raycast hover/select for anchors
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let hovered: THREE.Object3D | null = null

    const setPointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!anchorHelpersRef.current) return
      setPointer(event)
      raycaster.setFromCamera(pointer, camera)
      const intersects = raycaster.intersectObjects(anchorHelpersRef.current.children, true)
      let hit = intersects[0]?.object || null
      if (hit && hit.parent && hit.parent !== anchorHelpersRef.current && !(hit as any).isMesh) {
        // climb to anchor mesh
        while (hit && hit.parent && hit.parent !== anchorHelpersRef.current && !(hit as any).isMesh) {
          hit = hit.parent
        }
      }
      if (hit !== hovered) {
        // update hover color
        if (hovered && (hovered as any).material && (hovered as any).isMesh) {
          ;((hovered as any).material as THREE.MeshBasicMaterial).color.set(0xff6699)
        }
        hovered = hit
        if (hovered && (hovered as any).material && (hovered as any).isMesh) {
          ;((hovered as any).material as THREE.MeshBasicMaterial).color.set(0xffff66)
        }
        renderer.domElement.style.cursor = hovered ? 'pointer' : 'default'
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!hovered || !controlsRef.current) return
      const target = (hovered as any).isMesh ? hovered : hovered.parent
      if (target) controlsRef.current.attach(target)
    }

    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerdown', onPointerDown)

    const rebuildFromCurrentAnchors = () => {
      if (!anchorHelpersRef.current || !headMesh) return
      const group = anchorHelpersRef.current
      const anchors: MorphAnchors = {
        mouthLeft: (group.getObjectByName('mouthLeft') as THREE.Object3D).position.clone(),
        mouthRight: (group.getObjectByName('mouthRight') as THREE.Object3D).position.clone(),
        mouthCenter: (group.getObjectByName('mouthCenter') as THREE.Object3D).position.clone(),
        chin: (group.getObjectByName('chin') as THREE.Object3D).position.clone(),
        noseTip: (group.getObjectByName('noseTip') as THREE.Object3D).position.clone(),
      }
      const params: AnchorMorphParams = {}
      createMorphsFromAnchors(headMesh, anchors, params)
      // Force rebuild of dictionary and influences from new morphs
      const geo = headMesh.geometry as THREE.BufferGeometry & { morphAttributes: any }
      const attrs = (geo.morphAttributes?.position || []) as any[]
      const dict: Record<string, number> = {}
      attrs.forEach((attr, idx) => {
        const n = (attr && attr.name) || `morph_${idx}`
        dict[n] = idx
      })
      ;(headMesh as any).morphTargetDictionary = dict
      headMesh.morphTargetInfluences = new Array(attrs.length).fill(0)
      // Ensure materials support morphs
      const mats = Array.isArray(headMesh.material) ? headMesh.material : [headMesh.material]
      mats.forEach((m: any) => m && (m.morphTargets = true))
      // Mark for update
      ;(geo as any).morphTargetsNeedUpdate = true
      ;(headMesh as any).userData.meshPoints = anchors
      console.log('✅ Rebuilt morphs from anchors')
      window.dispatchEvent(new Event('meshPoints:refresh'))
    }

    const keyHandler = (ev: KeyboardEvent) => {
      if (!controlsRef.current || !anchorHelpersRef.current) return
      if (ev.key === 'r') controlsRef.current.setMode('rotate')
      if (ev.key === 't') controlsRef.current.setMode('translate')
      if (ev.key === 's') controlsRef.current.setMode('scale')
      if (ev.key === 'Tab') {
        ev.preventDefault()
        // cycle selection
        const group = anchorHelpersRef.current
        const children = group.children
        if (!children.length) return
        const current = controlsRef.current.object as THREE.Object3D
        const idx = Math.max(0, children.indexOf(current))
        const next = children[(idx + 1) % children.length]
        controlsRef.current.attach(next)
      }
      if (ev.key === 'Enter') {
        rebuildFromCurrentAnchors()
      }
    }

    window.addEventListener('keydown', keyHandler)

    // Focus event from UI
    const onFocusEvt = (e: Event) => {
      const ce = e as CustomEvent
      const name = ce.detail?.name || 'all'
      applyFocus(name)
    }
    window.addEventListener('morphEditor:focus', onFocusEvt)

    // Keep meshPoints updated during manipulation
    const syncAnchorsToUserData = () => {
      if (!anchorHelpersRef.current || !headMesh) return
      const grp = anchorHelpersRef.current
      const pick = (n: string) => grp.getObjectByName(n)?.position.clone()
      const anchorsData: any = {
        mouthLeft: pick('mouthLeft'),
        mouthRight: pick('mouthRight'),
        mouthCenter: pick('mouthCenter'),
        mouthTop: pick('mouthTop'),
        mouthBottom: pick('mouthBottom'),
        chin: pick('chin'),
        noseTip: pick('noseTip'),
      }
      ;(headMesh as any).userData = (headMesh as any).userData || {}
      ;(headMesh as any).userData.meshPoints = anchorsData
    }
    controls.addEventListener('objectChange', syncAnchorsToUserData)

    // Save/Reset events
    const onSave = () => {
      try {
        if (!modelKey) return
        if (!anchorHelpersRef.current) return
        const grp = anchorHelpersRef.current
        const toJSON = (v: THREE.Vector3 | undefined) => v ? { x: v.x, y: v.y, z: v.z } : undefined
        const data: any = {
          mouthLeft: toJSON(grp.getObjectByName('mouthLeft')?.position as THREE.Vector3),
          mouthRight: toJSON(grp.getObjectByName('mouthRight')?.position as THREE.Vector3),
          mouthCenter: toJSON(grp.getObjectByName('mouthCenter')?.position as THREE.Vector3),
          mouthTop: toJSON(grp.getObjectByName('mouthTop')?.position as THREE.Vector3),
          mouthBottom: toJSON(grp.getObjectByName('mouthBottom')?.position as THREE.Vector3),
          chin: toJSON(grp.getObjectByName('chin')?.position as THREE.Vector3),
          noseTip: toJSON(grp.getObjectByName('noseTip')?.position as THREE.Vector3),
        }
        window.localStorage.setItem(`morphAnchors:${modelKey}`, JSON.stringify(data))
        console.log('💾 Saved morph anchors for', modelKey)
        // Rebuild to apply immediately
        rebuildFromCurrentAnchors()
        window.dispatchEvent(new Event('meshPoints:refresh'))
      } catch (e) {
        console.warn('Failed to save anchors', e)
      }
    }

    const onReset = () => {
      if (!anchorHelpersRef.current || !headMesh) return
      const grp = anchorHelpersRef.current
      const base = generateMeshPoints(headMesh)
      const mouthCenter = (base.mouthCenter || new THREE.Vector3()).clone()
      const mouthTop = mouthCenter.clone().add(new THREE.Vector3(0, worldSize.y * 0.02, 0))
      const mouthBottom = mouthCenter.clone().add(new THREE.Vector3(0, -worldSize.y * 0.02, 0))
      const setPos = (n: string, v: THREE.Vector3) => {
        const o = grp.getObjectByName(n)
        if (o) o.position.copy(v)
      }
      setPos('mouthLeft', base.mouthLeft || new THREE.Vector3(-0.03, mouthCenter.y, 0.02))
      setPos('mouthRight', base.mouthRight || new THREE.Vector3(0.03, mouthCenter.y, 0.02))
      setPos('mouthCenter', mouthCenter)
      setPos('mouthTop', mouthTop)
      setPos('mouthBottom', mouthBottom)
      setPos('chin', base.chin || new THREE.Vector3(0, -0.02, 0.02))
      setPos('noseTip', base.noseTip || new THREE.Vector3(0, 0.05, 0.05))
      syncAnchorsToUserData()
      console.log('↩️ Reset anchors to defaults')
      window.dispatchEvent(new Event('meshPoints:refresh'))
    }

    const saveListener = () => onSave()
    const resetListener = () => onReset()
    const rebuildListener = () => rebuildFromCurrentAnchors()
    window.addEventListener('morphEditor:save', saveListener)
    window.addEventListener('morphEditor:reset', resetListener)
    window.addEventListener('morphEditor:rebuild', rebuildListener)

    return () => {
      window.removeEventListener('keydown', keyHandler)
      window.removeEventListener('morphEditor:focus', onFocusEvt)
      window.removeEventListener('morphEditor:save', saveListener)
      window.removeEventListener('morphEditor:reset', resetListener)
      window.removeEventListener('morphEditor:rebuild', rebuildListener)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      if (controlsRef.current) {
        scene.remove(controlsRef.current)
        controlsRef.current.dispose()
        controlsRef.current = null
      }
      if (anchorHelpersRef.current) {
        headMesh.remove(anchorHelpersRef.current)
        anchorHelpersRef.current.traverse((c: any) => c?.geometry?.dispose?.())
        anchorHelpersRef.current = null
      }
    }
  }, [headMesh, scene, camera, renderer, onToggle])

  return null
}


