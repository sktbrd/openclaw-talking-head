# Liveness Implementation Code Reference

## Working Audio-Driven Viseme Component

This component was successfully created and tested in `MorphingFaceLiveness.tsx`:

### Key Features Implemented

1. **Audio Analysis System**
   - WebAudio API integration for real-time analysis
   - RMS calculation for volume/energy
   - Spectral centroid for vowel detection
   - Upper-band frequency analysis for fricatives

2. **Viseme Mapping**
   - 9 viseme categories with ARKit blendshape mappings
   - Automatic normalization to prevent over-extension
   - Rest position blending for natural closure

3. **Smoothing System**
   - Critically-damped spring physics
   - 50-120ms half-life for natural transitions
   - Per-viseme velocity tracking
   - Coarticulation support

4. **Micro-Motion System**
   - Natural eye blinks (2-5 second intervals)
   - Eye saccades (0.5-2 second intervals)
   - Head micro-jitter (0.0004-0.0008 radians)
   - Cheek movement responding to speech

### Integration Points

#### For Hume AI Audio
```javascript
// Connect Hume audio element to viseme analyzer
function startAudioFromElement(audioElement: HTMLAudioElement) {
  audioCtx = new AudioContext()
  const src = audioCtx.createMediaElementSource(audioElement)
  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0.7
  src.connect(analyser)
  src.connect(audioCtx.destination) // Pass through audio
  // ... continue with analysis
}
```

#### For Microphone Input
```javascript
async function startAudioFromMic() {
  audioCtx = new AudioContext()
  const stream = await navigator.mediaDevices.getUserMedia({ 
    audio: { 
      echoCancellation: true, 
      noiseSuppression: true 
    } 
  })
  const src = audioCtx.createMediaStreamSource(stream)
  // ... connect to analyser
}
```

### Critical Algorithms

#### Viseme Weight Calculation
```javascript
// Analyze audio spectrum
const rms = Math.sqrt(sum / data.length)
const loud = clamp((rms - 0.01) * (1/0.12), 0, 1)

// Spectral centroid for vowel bias
const centroid = den > 0 ? (num/den)/spectrum.length : 0.3
const hi = clamp((centroid - 0.45)*4, 0, 1) // E/I bias
const lo = clamp((0.45 - centroid)*3, 0, 1) // A/O/U bias

// Map to viseme weights
target.A = loud * lo
target.E = loud * hi * 0.8
target.I = loud * hi * 0.7
// ... etc
```

#### Smoothing Function
```javascript
const smooth = (v, x, dt, vdot, halflife = 0.06) => {
  const omega = Math.log(2) / halflife
  const iw = 1 / (1 + omega*dt + (omega*omega)*(dt*dt))
  const yNext = (v + dt*(vdot + omega*(x - v))) * iw
  const vNext = (vdot + omega*(x - v)) * iw
  return [yNext, vNext]
}
```

### Morph Target Naming Compatibility

The system supports multiple naming conventions:
- Standard: `jawOpen`, `mouthOpen`, `eyeBlinkLeft`
- ARKit prefixed: `blendShape1.jawOpen`, `blendShape1.mouthOpen`
- Alternative: `JawOpen`, `MouthOpen`, `eyeBlink_L`

### Performance Optimizations

1. **Batch morph updates**: All morphs updated once per frame
2. **Cached calculations**: Reuse audio analysis across visemes
3. **RequestAnimationFrame**: Smooth 60 FPS animations
4. **Conditional updates**: Only update changed values

## Integration with Existing TalkingHead Component

### Required Modifications

1. **Add to sceneRef**:
```javascript
isSpeaking: boolean
headTargetRotation: { x: number, y: number, z: number }
headCurrentRotation: { x: number, y: number, z: number }
microJitterTimer: number
nextBlinkTime: number
nextSaccadeTime: number
```

2. **Update head rotation logic**:
- Replace direct rotation setting with target/current system
- Add interpolation for smooth movements
- Preserve speech-triggered movements

3. **Improve blink/saccade timing**:
- Use variable intervals instead of fixed
- Natural blink curve (fast close, slow open)
- Smooth saccade returns

### Known Issues to Address

1. **Head rotation conflicts**: Direct setting vs. interpolated targets
2. **Morph target naming**: Need to detect actual names from model
3. **Audio source switching**: Mic vs. Hume AI audio element
4. **Performance monitoring**: Need FPS tracking with all features

## Testing Checklist

- [ ] Mouth moves naturally with speech (not just flapping)
- [ ] Smooth transitions between visemes
- [ ] Regular natural eye blinks
- [ ] Subtle eye movements (saccades)
- [ ] Head micro-jitter visible but not distracting
- [ ] Head moves during speech emphasis
- [ ] Cheeks respond to speech volume
- [ ] No "frozen" or "dead" appearance
- [ ] 60 FPS maintained with all features
- [ ] Works with both mic and Hume AI audio

## Next Steps

1. **Integrate audio analysis into existing TalkingHead**
2. **Fix head rotation conflict issues**
3. **Add audio source switching logic**
4. **Implement performance monitoring**
5. **Add UI controls for feature toggles**
6. **Test with various speech patterns**
7. **Fine-tune timing parameters**
8. **Add emotion-driven expressions**