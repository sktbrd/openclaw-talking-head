# Talking Head Liveness Improvements Plan

## Problem Statement

The current talking head implementation suffers from the "uncanny valley" effect due to three main issues:

1. **Volume-only mouth animation** - The mouth only opens/closes based on audio volume (jaw flapping)
2. **No coarticulation** - Transitions between mouth shapes snap instead of blending smoothly
3. **"Dead" face** - No micro-motions in cheeks, eyes, or head that humans naturally exhibit

## Solution Overview

Implement a comprehensive liveness system with:
- Audio-driven viseme mapping
- Smooth coarticulation between phonemes
- Natural micro-motions and subtle animations
- Proper head movement during speech

## Technical Implementation

### 1. Audio-Driven Viseme System

#### Viseme Categories
Map audio to 9 basic viseme shapes:
- **A** - Open vowel (ah, father)
- **E** - Mid-front vowel (bed, head)
- **I** - Close front vowel (see, me)
- **O** - Mid-back vowel (go, show)
- **U** - Close back vowel (blue, who)
- **Fv** - Fricatives (f, v)
- **L** - Liquid consonant
- **WQ** - Rounded consonants (w, qu)
- **Rest** - Neutral/silence position

#### Audio Analysis Pipeline
```javascript
// Real-time audio analysis
1. Get audio stream from microphone or Hume AI
2. Analyze with WebAudio API:
   - RMS for volume/energy
   - Spectral centroid for vowel detection
   - Upper-band energy for fricatives
3. Map to viseme weights
4. Apply smoothing and coarticulation
```

#### ARKit Blendshape Mapping
```javascript
const arkitMap = {
  A: ['jawOpen', 'mouthOpen'],
  E: ['mouthSmileLeft', 'mouthSmileRight', 'mouthStretchLeft', 'mouthStretchRight'],
  I: ['mouthNarrowLeft', 'mouthNarrowRight'],
  O: ['mouthFunnel', 'mouthPucker'],
  U: ['mouthPucker', 'mouthNarrowLeft', 'mouthNarrowRight'],
  Fv: ['mouthClose', 'mouthLowerDownLeft', 'mouthLowerDownRight'],
  L: ['tongueOut'],
  WQ: ['cheekPuff', 'mouthFunnel'],
  Rest: ['jawForward']
}
```

### 2. Smooth Coarticulation

#### Critically-Damped Spring System
- Use physics-based smoothing for natural transitions
- Half-life: 50-120ms for visemes
- Prevents snapping between mouth shapes
- Maintains speech clarity while looking natural

```javascript
const smooth = (current, target, dt, velocity, halflife = 0.06) => {
  // Critically-damped spring equation
  const omega = Math.log(2) / halflife
  // ... smooth interpolation logic
  return [newValue, newVelocity]
}
```

#### Coarticulation Rules
- Don't snap to zero when phoneme ends
- Overlap viseme weights for natural blending
- Keep max mouth openness < 90% (humans rarely hit 100%)
- Maintain subtle rest position even during speech

### 3. Micro-Motion System

#### Eye Animations
- **Blinks**: Every 2-5 seconds, fast close (50ms), slower open (100ms)
- **Saccades**: Micro eye movements every 0.5-2 seconds
- **Gaze shifts**: Occasional look direction changes

#### Head Movements
- **Micro-jitter**: 0.0004-0.0008 radians random movement
- **Speech emphasis**: Subtle head nods/tilts during speech
- **Idle motion**: Slow sine wave breathing-like movement
- **Smooth transitions**: All movements use interpolation

#### Facial Expressions
- **Cheek movement**: Responds to speech volume
- **Eyebrow micro-motion**: Subtle raises during emphasis
- **Asymmetric expressions**: Occasional one-sided movements

### 4. Integration Architecture

```
Audio Input (Mic/Hume) 
    ↓
Audio Analyzer (WebAudio API)
    ↓
Viseme Mapper (Frequency → Phoneme)
    ↓
Smoothing Engine (Spring Physics)
    ↓
Blendshape Controller (ARKit Morphs)
    ↓
Micro-Motion Layer (Overlaid animations)
    ↓
Three.js Renderer
```

### 5. Implementation Phases

#### Phase 1: Core Viseme System
- Set up audio analysis pipeline
- Implement basic viseme mapping
- Add smoothing/coarticulation

#### Phase 2: Micro-Motions
- Add blink system with natural timing
- Implement eye saccades
- Add head micro-jitter

#### Phase 3: Speech Coordination
- Sync head movements with speech
- Add emphasis gestures
- Implement cheek/expression responses

#### Phase 4: Advanced Features
- Precomputed phoneme timing (Rhubarb Lip Sync)
- Emotion-driven expressions
- Breathing simulation

## Performance Considerations

- Target 60 FPS with all features enabled
- Audio analysis at 60Hz (every animation frame)
- Smoothing calculations optimized with caching
- Morph target updates batched per frame

## Testing Strategy

1. **Unit Tests**: Audio analysis accuracy
2. **Visual Tests**: Record videos of different phonemes
3. **Performance Tests**: FPS monitoring with full features
4. **User Testing**: Uncanny valley perception surveys

## Future Enhancements

### Better Phoneme Detection
- Integrate Rhubarb Lip Sync for precomputed timing
- Use ML models for real-time phoneme classification
- Support for multiple languages

### Advanced Expressions
- Emotion blending from Hume AI prosody
- Micro-expressions for subtle emotions
- Asymmetric facial movements

### Breathing System
- Chest/shoulder movement simulation
- Nostril flare on deep breaths
- Synchronized with speech pauses

## References

- [Three.js Morph Targets](https://threejs.org/docs/#manual/en/introduction/Animation-system)
- [WebAudio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [ARKit Blendshapes](https://developer.apple.com/documentation/arkit/arfaceanchor/blendshapelocation)
- [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync)
- [Viseme Reference](https://en.wikipedia.org/wiki/Viseme)

## Success Metrics

- Reduced uncanny valley perception (user surveys)
- Natural-looking speech (A/B testing)
- Smooth transitions (< 100ms latency)
- Lifelike idle behavior (continuous micro-motion)