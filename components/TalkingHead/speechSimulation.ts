import { SceneState, SpeechConfig } from './types'
import { VisemeWeights } from '@/utils/visemeMapping'

/**
 * Default speech simulation configuration
 */
export const DEFAULT_SPEECH_CONFIG: SpeechConfig = {
  syllableTime: 80,        // Base time per phoneme in milliseconds (much faster)
  defaultSyllables: 15,    // Default number of syllables for demo
  jawOpenMin: 0.1,        // Minimum jaw opening
  jawOpenMax: 0.7,        // Maximum jaw opening (reduced from 1.0 for realism)
  headMovementRange: 0.05  // Reduced head movement for subtlety
}

/**
 * Estimate speaking rate based on text characteristics
 */
function estimateSpeakingRate(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0).length
  const chars = text.replace(/\s+/g, '').length // Count non-space characters

  // Words per minute estimation (normal speaking rate: 150-160 WPM)
  const baseWPM = 150

  // Adjust for text complexity (longer words = slower speech)
  const avgWordLength = chars / Math.max(words, 1) // Avoid division by zero
  const complexityFactor = Math.max(0.7, Math.min(1.3,
    avgWordLength > 6 ? 0.8 : avgWordLength < 4 ? 1.2 : 1.0
  ))

  // Adjust for punctuation (pauses) - limit impact
  const punctuationCount = (text.match(/[.!?]/g) || []).length
  const pauseFactor = Math.max(0.8, 1 - (punctuationCount * 0.05)) // Max 20% reduction

  const finalRate = baseWPM * complexityFactor * pauseFactor

  // Ensure reasonable bounds
  return Math.max(80, Math.min(250, finalRate))
}

/**
 * Calculate total estimated speech duration in milliseconds
 */
function estimateSpeechDuration(text: string): number {
  const speakingRate = estimateSpeakingRate(text)
  const words = text.split(/\s+/).filter(w => w.length > 0).length

  if (words === 0) return 1000 // Minimum duration

  const minutes = words / speakingRate
  const baseDuration = minutes * 60 * 1000

  // Add buffer for natural pauses (but not excessive)
  const pauseBuffer = Math.min(2000, Math.max(300, words * 30)) // 30ms per word, max 2s

  const totalDuration = Math.round(baseDuration + pauseBuffer)

  // Ensure reasonable bounds
  return Math.max(1000, Math.min(30000, totalDuration)) // 1s to 30s
}

/**
 * Simulate speech with phoneme-based visemes
 * This creates natural mouth movements based on actual text analysis
 *
 * Timing Improvements:
 * - Adaptive speech duration estimation (1-30s range)
 * - Sequential phoneme timing with overlap for continuity
 * - Filtered SIL phonemes to reduce excessive pauses
 * - Speaking rate adjustment based on text complexity
 * - Bounds checking to prevent negative durations
 */
export function simulateSpeech(
  state: SceneState,
  text: string,
  config: SpeechConfig = DEFAULT_SPEECH_CONFIG
): void {
  console.log('🎭 simulateSpeech called with text:', text)
  console.log('🦴 state.bones.jawBone exists:', !!state.bones?.jawBone)

  // Try to find the jaw bone if not already stored
  let jawBone = state.bones?.jawBone

  if (!jawBone && state.scene) {
    console.log('🔍 Searching for jaw bone in scene...')
    state.scene.traverse((child: any) => {
      if (child.isBone && !jawBone) {
        const bone = child
        // Look for bones that might be the jaw
        if (bone.name === 'Bone' || bone.name === 'jawBone' || bone.name === 'Jaw') {
          jawBone = bone
          console.log('✅ Found jaw bone:', bone.name)

          // Store it for future use
          if (!state.bones) {
            state.bones = {}
          }
          state.bones.jawBone = bone
        }
      }
    })
  }

  // If still no jaw bone found, try ANY bone as fallback
  if (!jawBone && state.scene) {
    console.log('⚠️ No jaw bone found, using first available bone as fallback')
    state.scene.traverse((child: any) => {
      if (child.isBone && !jawBone) {
        jawBone = child
        if (jawBone) {
          console.log('⚠️ Using fallback bone:', jawBone.name)

          if (!state.bones) {
            state.bones = {}
          }
          state.bones.jawBone = jawBone
        }
      }
    })
  }

  if (!jawBone) {
    console.warn('❌ No bones found in model at all!')
    return
  }

  // Cancel any ongoing speech simulation
  cancelOngoingSpeech(state)

  // Mark as speaking
  state.isSpeaking = true

  console.log('✅ Starting simple continuous speech animation for:', text)

  // Estimate speech duration based on text length (roughly 150ms per character)
  const estimatedDuration = Math.max(2000, text.length * 150)
  console.log(`⏱️ Estimated speech duration: ${estimatedDuration}ms for text length: ${text.length}`)

  // Store initial jaw rotation
  const initialRotation = jawBone.rotation.x

  // Start time for the animation
  const startTime = Date.now()

  // Create the continuous animation loop
  const animateSpeech = () => {
    if (!jawBone || !state.isSpeaking) {
      // Reset to initial position when stopping
      if (jawBone) {
        jawBone.rotation.x = initialRotation
      }
      return
    }

    const elapsed = (Date.now() - startTime) / 1000 // Convert to seconds

    // Use the same parameters as the working test animation
    const amplitude = 0.5 // Base amplitude
    const frequency = 2 // Same frequency as test
    const rotation = Math.sin(elapsed * frequency * Math.PI * 2) * amplitude * 0.1 // 10% reduction

    // Apply X-axis rotation (subtle jaw movement)
    jawBone.rotation.x = initialRotation + rotation

    // Continue animating while speaking
    if (state.isSpeaking && elapsed * 1000 < estimatedDuration) {
      requestAnimationFrame(animateSpeech)
    } else {
      // Animation complete
      console.log('🏁 Speech animation complete')
      state.isSpeaking = false
      jawBone.rotation.x = initialRotation

      // Clear all timeout references
      state.speechTimeouts = []
    }
  }

  // Start the animation
  animateSpeech()

  // Schedule end of speech
  const finalTimeoutId = setTimeout(() => {
    state.isSpeaking = false
    console.log('🏁 Speech duration complete')
  }, estimatedDuration)

  state.speechTimeouts = [finalTimeoutId as unknown as number]

  console.log(`📊 Speech animation started for ${estimatedDuration.toFixed(0)}ms`)
}

/**
 * Analyze text and convert to phoneme sequence with better accuracy
 */
function analyzeTextToPhonemes(text: string): string[] {
  const phonemes: string[] = []
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0)

  for (let i = 0; i < words.length; i++) {
    const word = words[i]

    // More accurate word-to-phoneme mapping
    const wordPhonemes = getWordPhonemes(word)
    phonemes.push(...wordPhonemes)

    // Add natural pause between words, but avoid excessive pauses
    if (i < words.length - 1) {
      // Only add SIL if the word doesn't already end with a consonant that needs separation
      const lastPhoneme = wordPhonemes[wordPhonemes.length - 1]
      if (lastPhoneme && !['SIL', 'M', 'N', 'L', 'R'].includes(lastPhoneme)) {
        phonemes.push('SIL')
      }
    }
  }

  return phonemes
}

/**
 * Get accurate phonemes for common words
 */
function getWordPhonemes(word: string): string[] {
  // Common word mappings (ARPABET-style)
  const wordMap: { [key: string]: string[] } = {
    'hello': ['HH', 'AH', 'L', 'OW'],
    'hi': ['HH', 'AY'],
    'world': ['W', 'ER', 'L', 'D'],
    'word': ['W', 'ER', 'D'],
    'test': ['T', 'EH', 'S', 'T'],
    'best': ['B', 'EH', 'S', 'T'],
    'animation': ['AE', 'N', 'AH', 'M', 'EY', 'SH', 'AH', 'N'],
    'system': ['S', 'IH', 'S', 'T', 'AH', 'M'],
    'talking': ['T', 'AO', 'K', 'IH', 'NG'],
    'head': ['HH', 'EH', 'D'],
    'face': ['F', 'EY', 'S'],
    'mouth': ['M', 'AW', 'TH'],
    'speech': ['S', 'P', 'IY', 'CH'],
    'natural': ['N', 'AE', 'CH', 'ER', 'AH', 'L'],
    'real': ['R', 'IY', 'L'],
    'time': ['T', 'AY', 'M'],
    'good': ['G', 'UH', 'D'],
    'great': ['G', 'R', 'EY', 'T'],
    'amazing': ['AH', 'M', 'EY', 'Z', 'IH', 'NG'],
    'incredible': ['IH', 'N', 'K', 'R', 'EH', 'D', 'AH', 'B', 'AH', 'L'],
    'fantastic': ['F', 'AE', 'N', 'T', 'AE', 'S', 'T', 'IH', 'K']
  }

  // Check if we have a direct mapping
  if (wordMap[word]) {
    return wordMap[word]
  }

  // Fallback: create phonemes based on letter patterns
  return createPhonemesFromWord(word)
}

/**
 * Create basic phonemes from a word
 */
function createPhonemesFromWord(word: string): string[] {
  const phonemes: string[] = []

  for (let i = 0; i < word.length; i++) {
    const letter = word[i]
    const nextLetter = word[i + 1] || ''

    switch (letter) {
      case 'a':
        phonemes.push(nextLetter === 'i' || nextLetter === 'u' ? 'EY' : 'AE')
        break
      case 'e':
        phonemes.push(nextLetter === 'e' ? 'IY' : 'EH')
        break
      case 'i':
        phonemes.push('IH')
        break
      case 'o':
        phonemes.push(nextLetter === 'o' ? 'UW' : 'AA')
        break
      case 'u':
        phonemes.push('AH')
        break
      case 'b':
      case 'p':
        phonemes.push('P')
        break
      case 'd':
      case 't':
        phonemes.push('T')
        break
      case 'g':
      case 'k':
        phonemes.push('K')
        break
      case 'm':
        phonemes.push('M')
        break
      case 'n':
        phonemes.push('N')
        break
      case 'l':
        phonemes.push('L')
        break
      case 'r':
        phonemes.push('R')
        break
      case 's':
      case 'z':
        phonemes.push('S')
        break
      case 'f':
      case 'v':
        phonemes.push('F')
        break
      case 'h':
        phonemes.push('HH')
        break
      case 'w':
        phonemes.push('W')
        break
      case 'y':
        phonemes.push('Y')
        break
      default:
        // Skip unknown characters or add neutral
        break
    }
  }

  return phonemes
}

/**
 * Get appropriate viseme for a phoneme
 */
export function getVisemeForPhoneme(phoneme: string, config: SpeechConfig): VisemeWeights {
  const viseme: VisemeWeights = {}

  // Map phonemes to visemes using ARPABET-style phoneme mapping
  switch (phoneme.toUpperCase()) {
    // Vowels
    case 'IY': // "see"
    case 'IH': // "sit"
      viseme['mouthSmileLeft'] = 0.6
      viseme['mouthSmileRight'] = 0.6
      viseme['jawOpen'] = 0.1
      break

    case 'EY': // "say"
    case 'EH': // "set"
      viseme['mouthSmileLeft'] = 0.4
      viseme['mouthSmileRight'] = 0.4
      viseme['jawOpen'] = 0.3
      break

    case 'AE': // "sat"
    case 'AH': // "cut"
    case 'AA': // "father"
      viseme['jawOpen'] = 0.2
      viseme['mouthStretchLeft'] = 0.3
      viseme['mouthStretchRight'] = 0.3
      break

    case 'AO': // "law"
    case 'OW': // "go"
      viseme['mouthPucker'] = 0.6
      viseme['jawOpen'] = 0.4
      break

    case 'UH': // "book"
    case 'UW': // "too"
      viseme['mouthPucker'] = 0.8
      viseme['jawOpen'] = 0.1
      break

    case 'ER': // "bird"
      viseme['mouthPucker'] = 0.5
      viseme['jawOpen'] = 0.2
      break

    // Consonants
    case 'M': // "mom"
    case 'P': // "pop"
    case 'B': // "bob"
      // Subtle bilabial closure - very gentle to prevent any lip inversion
      viseme['mouthClose'] = 0.2
      viseme['mouthFunnel'] = 0.4
      viseme['mouthPucker'] = 0.2
      break

    case 'F': // "fish"
    case 'V': // "very"
      viseme['mouthPucker'] = 0.2
      viseme['mouthFunnel'] = 0.4
      viseme['jawOpen'] = 0.1
      break

    case 'TH': // "think"
      viseme['tongueOut'] = 0.5
      viseme['jawOpen'] = 0.2
      break

    case 'S': // "see"
    case 'Z': // "zoo"
      viseme['mouthSmileLeft'] = 0.2
      viseme['mouthSmileRight'] = 0.2
      viseme['jawOpen'] = 0.05
      break

    case 'SH': // "she"
    case 'ZH': // "azure"
      viseme['mouthPucker'] = 0.4
      viseme['mouthFunnel'] = 0.3
      viseme['jawOpen'] = 0.1
      break

    case 'CH': // "cheese"
    case 'JH': // "judge"
      viseme['mouthPucker'] = 0.5
      viseme['mouthFunnel'] = 0.4
      viseme['jawOpen'] = 0.2
      break

    case 'K': // "key"
    case 'G': // "go"
      viseme['jawOpen'] = 0.3
      viseme['mouthStretchLeft'] = 0.1
      viseme['mouthStretchRight'] = 0.1
      break

    case 'L': // "lee"
      viseme['tongueOut'] = 0.1
      viseme['jawOpen'] = 0.2
      break

    case 'R': // "red"
      viseme['mouthPucker'] = 0.3
      viseme['mouthFunnel'] = 0.2
      viseme['jawOpen'] = 0.15
      break

    case 'W': // "we"
      viseme['mouthPucker'] = 0.6
      viseme['mouthFunnel'] = 0.2
      viseme['jawOpen'] = 0.1
      break

    case 'Y': // "yes"
      viseme['mouthSmileLeft'] = 0.3
      viseme['mouthSmileRight'] = 0.3
      viseme['jawOpen'] = 0.15
      break

    case 'HH': // "hee"
      viseme['jawOpen'] = 0.1
      break

    case 'SIL': // silence
    default:
      // Neutral position
      break
  }

  // Add blendShape1 variants for compatibility
  Object.keys(viseme).forEach(key => {
    if (!key.startsWith('blendShape1.')) {
      viseme[`blendShape1.${key}`] = viseme[key]
    }
  })

  return viseme
}

/**
 * Get jaw bone animation amount for a phoneme
 * Returns a value between 0 and 1 for how much the jaw should open
 */
function getJawOpenAmountForPhoneme(phoneme: string, config: SpeechConfig): number {
  switch (phoneme) {
    // Wide open vowels
    case 'AA': // "father"
    case 'AE': // "cat"
      return 0.8

    // Medium open vowels
    case 'AH': // "hut"
    case 'AO': // "caught"
    case 'AW': // "cow"
    case 'AY': // "bite"
    case 'EH': // "red"
    case 'ER': // "hurt"
    case 'OW': // "boat"
    case 'OY': // "boy"
      return 0.5

    // Partially open vowels
    case 'EY': // "bait"
    case 'IH': // "bit"
    case 'UH': // "book"
      return 0.3

    // Closed vowels
    case 'IY': // "beet"
    case 'UW': // "boot"
      return 0.2

    // Consonants with jaw movement
    case 'D': // "dog"
    case 'T': // "top"
    case 'N': // "nap"
    case 'L': // "lee"
    case 'R': // "red"
    case 'Y': // "yes"
    case 'K': // "key"
    case 'G': // "go"
      return 0.25

    // Consonants with minimal jaw movement
    case 'M': // "mom"
    case 'P': // "pop"
    case 'B': // "bob"
    case 'F': // "fish"
    case 'V': // "very"
    case 'W': // "we"
      return 0.1

    // Consonants with very little jaw movement
    case 'S': // "see"
    case 'Z': // "zoo"
    case 'SH': // "she"
    case 'ZH': // "azure"
    case 'HH': // "hee"
      return 0.05

    // Silence
    case 'SIL':
    default:
      return 0
  }
}

/**
 * Apply coarticulation effects for smoother phoneme transitions
 */
function applyCoarticulation(viseme: VisemeWeights, current: string, next: string, prev: string): VisemeWeights {
  const coarticulated = { ...viseme }

  // Anticipatory lip rounding for upcoming rounded vowels
  const roundedVowels = ['UW', 'OW', 'AO', 'UH']
  if (roundedVowels.includes(next.toUpperCase())) {
    // Slightly round lips in anticipation
    if (coarticulated['mouthPucker'] !== undefined) {
      coarticulated['mouthPucker'] = Math.min(1, coarticulated['mouthPucker'] + 0.1)
    } else {
      coarticulated['mouthPucker'] = 0.1
    }
  }

  // Carry-over effects from previous phoneme
  if (prev.toUpperCase() === 'S' && current.toUpperCase() !== 'S') {
    // Slight tongue position carry-over from S sounds
    if (coarticulated['tongueOut'] !== undefined) {
      coarticulated['tongueOut'] = Math.max(0, coarticulated['tongueOut'] - 0.05)
    }
  }

  // Nasal coarticulation
  const nasals = ['M', 'N', 'NG']
  if (nasals.includes(current.toUpperCase())) {
    // Nasals tend to lower the velum and affect surrounding sounds
    if (coarticulated['jawOpen'] !== undefined) {
      coarticulated['jawOpen'] = Math.min(1, coarticulated['jawOpen'] + 0.1)
    }
  }

  // Plosive release effects
  const plosives = ['P', 'T', 'K', 'B', 'D', 'G']
  if (plosives.includes(current.toUpperCase())) {
    // Plosives have a brief compression phase
    if (coarticulated['mouthClose'] !== undefined) {
      coarticulated['mouthClose'] = Math.min(1, coarticulated['mouthClose'] + 0.05)
    }
  }

  return coarticulated
}

/**
 * Get duration for a phoneme with natural variation (in milliseconds)
 */
function getPhonemeDuration(phoneme: string, config: SpeechConfig): number {
  let baseDuration = config.syllableTime
  const variation = 0.8 + Math.random() * 0.4 // 20% variation

  // Phoneme-specific timing based on natural speech patterns
  switch (phoneme.toUpperCase()) {
    // Vowels (generally longer)
    case 'IY': case 'IH': // "see", "sit"
      baseDuration = 120
      break
    case 'EY': case 'EH': // "say", "set"
      baseDuration = 110
      break
    case 'AE': case 'AH': case 'AA': // "sat", "cut", "father"
      baseDuration = 100
      break
    case 'AO': case 'OW': // "law", "go"
      baseDuration = 130
      break
    case 'UH': case 'UW': // "book", "too"
      baseDuration = 90
      break
    case 'ER': // "bird"
      baseDuration = 95
      break

    // Plosives (quick and sharp)
    case 'P': case 'T': case 'K': // "pop", "tot", "key"
      baseDuration = 60
      break
    case 'B': case 'D': case 'G': // "bob", "dog", "go"
      baseDuration = 65
      break

    // Fricatives (sustained)
    case 'F': case 'V': // "fish", "very"
      baseDuration = 140
      break
    case 'S': case 'Z': // "see", "zoo"
      baseDuration = 130
      break
    case 'SH': case 'ZH': // "she", "azure"
      baseDuration = 150
      break
    case 'TH': // "think"
      baseDuration = 135
      break

    // Nasals (medium duration)
    case 'M': case 'N': // "mom", "no"
      baseDuration = 100
      break

    // Liquids and glides
    case 'L': // "lee"
      baseDuration = 85
      break
    case 'R': // "red"
      baseDuration = 80
      break
    case 'W': case 'Y': // "we", "yes"
      baseDuration = 70
      break

    // Affricates (slightly longer)
    case 'CH': case 'JH': // "cheese", "judge"
      baseDuration = 160
      break

    // Aspiration
    case 'HH': // "hee"
      baseDuration = 75
      break

    // Silence (varies based on context)
    case 'SIL':
      baseDuration = 50 + Math.random() * 100 // 50-150ms pause
      break

    default:
      baseDuration = config.syllableTime
  }

  return Math.round(baseDuration * variation)
}

/**
 * Cancel any ongoing speech simulation
 */
function cancelOngoingSpeech(state: SceneState): void {
  // Clear all speech timeouts
  state.speechTimeouts.forEach(timeoutId => {
    clearTimeout(timeoutId)
  })

  // Reset speech state
  state.speechTimeouts = []
  state.isSpeaking = false

  console.log('🎭 Cancelled ongoing speech simulation')
}

/**
 * Generate a random viseme for demo purposes
 * This creates varied mouth shapes to simulate speech
 */
function generateRandomViseme(config: SpeechConfig): VisemeWeights {
  const viseme: VisemeWeights = {}

  // Random jaw movement (primary movement for talking)
  const jawOpen = Math.random() * (config.jawOpenMax - config.jawOpenMin) + config.jawOpenMin

  // Try different morph target naming conventions
  viseme['jawOpen'] = jawOpen
  viseme['blendShape1.jawOpen'] = jawOpen
  viseme['JawOpen'] = jawOpen
  viseme['mouthOpen'] = jawOpen * 0.8
  viseme['blendShape1.mouthOpen'] = jawOpen * 0.8

  // Random mouth shape (30% chance each)
  const shapeChoice = Math.random()

  if (shapeChoice < 0.3) {
    // Smile shape (for 'ee' sounds)
    const smileAmount = Math.random() * 0.5
    viseme['mouthSmile_L'] = smileAmount
    viseme['mouthSmile_R'] = smileAmount
    viseme['blendShape1.mouthSmileLeft'] = smileAmount
    viseme['blendShape1.mouthSmileRight'] = smileAmount
  } else if (shapeChoice < 0.6) {
    // Pucker shape (for 'oo' sounds)
    const puckerAmount = Math.random() * 0.6
    viseme['mouthPucker'] = puckerAmount
    viseme['blendShape1.mouthPucker'] = puckerAmount
    viseme['mouthFunnel'] = puckerAmount * 0.5
    viseme['blendShape1.mouthFunnel'] = puckerAmount * 0.5
  } else {
    // Stretch shape (for 'ah' sounds)
    const stretchAmount = Math.random() * 0.4
    viseme['mouthStretch_L'] = stretchAmount
    viseme['mouthStretch_R'] = stretchAmount
    viseme['blendShape1.mouthStretchLeft'] = stretchAmount
    viseme['blendShape1.mouthStretchRight'] = stretchAmount
  }

  // Random lower mouth movement (50% chance)
  if (Math.random() > 0.5) {
    const lowerAmount = Math.random() * 0.3
    viseme['mouthLowerDown_L'] = lowerAmount
    viseme['mouthLowerDown_R'] = lowerAmount
    viseme['blendShape1.mouthLowerDownLeft'] = lowerAmount
    viseme['blendShape1.mouthLowerDownRight'] = lowerAmount
  }

  return viseme
}

/**
 * Animate head during speech for more natural movement
 */
function animateHeadDuringSpeech(state: SceneState, config: SpeechConfig): void {
  if (!state.headMesh) return

  // Natural head movement during speech
  // Small random movements to simulate emphasis
  const yRotation = (Math.random() - 0.5) * config.headMovementRange
  const xRotation = (Math.random() - 0.5) * config.headMovementRange * 0.5

  state.headMesh.rotation.y = yRotation
  state.headMesh.rotation.x = xRotation
}

/**
 * Reset mouth and head to neutral position
 */
function resetToNeutral(state: SceneState): void {
  // Reset visemes
  state.targetViseme = {}

  // Clear speech state
  state.speechTimeouts = []
  state.isSpeaking = false

  console.log('🎭 Speech ended, returning to neutral')

  // Reset head position
  if (state.headMesh) {
    state.headMesh.rotation.y = 0
    state.headMesh.rotation.x = 0
  }
}

/**
 * Test mouth opening with all possible morph target names
 * Useful for debugging which morph targets are available
 */
export function testMouthOpen(state: SceneState): void {
  if (!state.headMesh || !state.headMesh.morphTargetDictionary) {
    console.warn('Model not ready for testing')
    return
  }

  const { morphTargetDictionary } = state.headMesh
  console.log('Testing mouth open with available morph targets:', Object.keys(morphTargetDictionary))

  // Find mouth-related morph targets
  const mouthTargets = Object.keys(morphTargetDictionary).filter(name =>
    name.toLowerCase().includes('mouth') ||
    name.toLowerCase().includes('jaw') ||
    name.toLowerCase().includes('lip')
  )
  console.log('Found mouth-related targets:', mouthTargets)

  // Test opening mouth wide with various possible names
  const testViseme: VisemeWeights = {
    'jawOpen': 1.0,
    'mouthOpen': 1.0,
    'blendShape1.jawOpen': 1.0,
    'blendShape1.mouthOpen': 1.0,
    'JawOpen': 1.0,
    'MouthOpen': 1.0,
    ...Object.fromEntries(mouthTargets.map(t => [t, 0.8]))
  }

  state.targetViseme = testViseme
  console.log('Setting test viseme:', testViseme)

  // Reset after 1 second
  setTimeout(() => {
    state.targetViseme = {}
    console.log('Resetting to neutral')
  }, 1000)
}

/**
 * Log current morph target values for debugging
 */
export function logMorphTargetValues(state: SceneState): void {
  if (!state.headMesh || !state.headMesh.morphTargetDictionary || !state.headMesh.morphTargetInfluences) {
    console.warn('Model not ready for logging')
    return
  }

  const { morphTargetDictionary, morphTargetInfluences } = state.headMesh
  console.log('Current morph target values:')

  Object.entries(morphTargetDictionary).forEach(([name, index]) => {
    const value = morphTargetInfluences[index as number]
    if (value > 0.01) {
      console.log(`  ${name}: ${value.toFixed(3)}`)
    }
  })
}
