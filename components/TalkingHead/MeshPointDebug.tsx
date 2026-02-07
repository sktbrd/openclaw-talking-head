'use client'

import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { MorphTargetMesh } from './types'

interface Props {
  scene: THREE.Scene
  headMesh?: MorphTargetMesh
}

export default function MeshPointDebug({ scene, headMesh }: Props) {
  const groupRef = useRef<THREE.Group | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!headMesh) return
    const group = new THREE.Group()
    group.name = 'MeshPointDebug'
    group.renderOrder = 999
    // Parent to head so local positions line up
    headMesh.add(group)
    groupRef.current = group

    // Size markers relative to head
    const worldBox = new THREE.Box3().setFromObject(headMesh)
    const worldSize = new THREE.Vector3()
    worldBox.getSize(worldSize)
    const s = Math.max(0.01, worldSize.x * 0.03)

    const makeMarker = (p: THREE.Vector3, color: number, name: string) => {
      const geom = new THREE.BoxGeometry(s, s, s)
      const mat = new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false })
      const m = new THREE.Mesh(geom, mat)
      m.position.copy(p)
      m.name = name
      m.renderOrder = 1000
      m.frustumCulled = false
      group.add(m)
    }

    const refresh = () => {
      if (!groupRef.current || !headMesh) return
      const grp = groupRef.current
      // clear
      for (let i = grp.children.length - 1; i >= 0; i--) grp.remove(grp.children[i])
      const points = (headMesh as any).userData?.meshPoints || {}
      const entries: Array<[string, THREE.Vector3]> = Object.entries(points).map(([k, v]: any) => {
        if (v && typeof v.x === 'number') return [k, new THREE.Vector3(v.x, v.y, v.z)]
        return [k, v as THREE.Vector3]
      })
      const colors: Record<string, number> = {
        mouthLeft: 0xff0000,
        mouthRight: 0x00ff00,
        mouthCenter: 0x0000ff,
        mouthTop: 0xffff00,
        mouthBottom: 0xff00ff,
        chin: 0x00ffff,
        noseTip: 0xffffff,
      }
      for (const [name, vec] of entries) {
        if (vec) makeMarker(vec, colors[name] ?? 0xffffff, name)
      }
    }

    refresh()

    const onRefresh = () => refresh()
    window.addEventListener('meshPoints:refresh', onRefresh)

    return () => {
      window.removeEventListener('meshPoints:refresh', onRefresh)
      if (groupRef.current) {
        headMesh.remove(groupRef.current)
        groupRef.current.traverse((c: any) => c?.geometry?.dispose?.())
        groupRef.current = null
      }
    }
  }, [scene, headMesh])

  // HUD panel with live XYZ readout
  useEffect(() => {
    const div = document.createElement('div')
    div.style.position = 'absolute'
    div.style.right = '8px'
    div.style.bottom = '8px'
    div.style.background = 'rgba(0,0,0,0.6)'
    div.style.color = '#fff'
    div.style.fontSize = '11px'
    div.style.padding = '8px'
    div.style.borderRadius = '6px'
    div.style.pointerEvents = 'none'
    document.body.appendChild(div)
    panelRef.current = div

    const update = () => {
      if (!panelRef.current) return
      const points = (headMesh as any)?.userData?.meshPoints || {}
      const fmt = (v: any) => v ? `${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)}` : '—'
      panelRef.current.innerHTML = `
        <div style="font-weight:600;margin-bottom:4px">Mesh Points (local)</div>
        <div>Mouth L: ${fmt(points.mouthLeft)}</div>
        <div>Mouth R: ${fmt(points.mouthRight)}</div>
        <div>Mouth C: ${fmt(points.mouthCenter)}</div>
        <div>Mouth Top: ${fmt(points.mouthTop)}</div>
        <div>Mouth Bottom: ${fmt(points.mouthBottom)}</div>
        <div>Chin: ${fmt(points.chin)}</div>
        <div>Nose: ${fmt(points.noseTip)}</div>
      `
    }

    const i = window.setInterval(update, 250)
    update()

    const onRefresh = () => update()
    window.addEventListener('meshPoints:refresh', onRefresh)

    return () => {
      window.removeEventListener('meshPoints:refresh', onRefresh)
      window.clearInterval(i)
      if (panelRef.current) {
        document.body.removeChild(panelRef.current)
        panelRef.current = null
      }
    }
  }, [headMesh])

  return null
}


