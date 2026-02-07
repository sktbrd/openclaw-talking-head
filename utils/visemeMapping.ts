// Viseme mapping for lip-sync animation
// Maps phonemes to morph target combinations

export interface VisemeWeights {
  [morphTarget: string]: number
}

// Basic viseme phoneme groups
// Using ARKit blendshape names from the Facecap model
export const visemeMap: Record<string, VisemeWeights> = {
  // Silence/neutral position
  'silence': {
    'jawOpen': 0,
    'jawForward': 0,
    'jawLeft': 0,
    'jawRight': 0,
    'mouthClose': 0,
    'mouthFunnel': 0,
    'mouthPucker': 0,
    'mouthLeft': 0,
    'mouthRight': 0,
    'mouthSmile_L': 0,
    'mouthSmile_R': 0,
    'mouthFrown_L': 0,
    'mouthFrown_R': 0,
    'mouthDimple_L': 0,
    'mouthDimple_R': 0,
    'mouthStretch_L': 0,
    'mouthStretch_R': 0,
    'mouthRollLower': 0,
    'mouthRollUpper': 0,
    'mouthShrugLower': 0,
    'mouthShrugUpper': 0,
    'mouthPress_L': 0,
    'mouthPress_R': 0,
    'mouthLowerDown_L': 0,
    'mouthLowerDown_R': 0,
    'mouthUpperUp_L': 0,
    'mouthUpperUp_R': 0,
    'tongueOut': 0
  },
  
  // AA as in "father"
  'aa': {
    'jawOpen': 0.7,
    'mouthLowerDown_L': 0.3,
    'mouthLowerDown_R': 0.3,
    'mouthStretch_L': 0.2,
    'mouthStretch_R': 0.2
  },
  
  // EE as in "see"
  'ee': {
    'mouthSmile_L': 0.6,
    'mouthSmile_R': 0.6,
    'mouthStretch_L': 0.4,
    'mouthStretch_R': 0.4,
    'jawOpen': 0.1
  },
  
  // II as in "it"
  'ii': {
    'mouthSmile_L': 0.3,
    'mouthSmile_R': 0.3,
    'jawOpen': 0.2,
    'mouthStretch_L': 0.1,
    'mouthStretch_R': 0.1
  },
  
  // OH as in "go"
  'oh': {
    'mouthPucker': 0.5,
    'mouthFunnel': 0.3,
    'jawOpen': 0.4
  },
  
  // OO as in "too"
  'oo': {
    'mouthPucker': 0.8,
    'mouthFunnel': 0.4,
    'jawOpen': 0.1
  },
  
  // MM as in "mother"
  'mm': {
    'jawOpen': 0,
    'mouthPucker': 0.1,
    'mouthClose': 0.8,
    'mouthPress_L': 0.3,
    'mouthPress_R': 0.3
  },
  
  // FF as in "face"
  'ff': {
    'jawOpen': 0.1,
    'mouthPucker': 0.1,
    'mouthFunnel': 0.3,
    'mouthRollLower': 0.2
  },
  
  // TH as in "think"
  'th': {
    'jawOpen': 0.15,
    'tongueOut': 0.5
  },
  
  // L as in "like"
  'l': {
    'jawOpen': 0.2,
    'tongueOut': 0.1
  },
  
  // R as in "run"
  'r': {
    'mouthPucker': 0.3,
    'mouthFunnel': 0.2,
    'jawOpen': 0.15
  },
  
  // S as in "see"
  's': {
    'mouthSmile_L': 0.2,
    'mouthSmile_R': 0.2,
    'jawOpen': 0.05,
    'mouthStretch_L': 0.1,
    'mouthStretch_R': 0.1
  },
  
  // SH as in "she"
  'sh': {
    'mouthPucker': 0.4,
    'mouthFunnel': 0.3,
    'jawOpen': 0.1
  },
  
  // K as in "key"
  'k': {
    'jawOpen': 0.3,
    'mouthStretch_L': 0.1,
    'mouthStretch_R': 0.1
  },
  
  // P/B as in "pet"/"bet"
  'pb': {
    'jawOpen': 0,
    'mouthPucker': 0.2,
    'mouthClose': 0.9,
    'mouthPress_L': 0.4,
    'mouthPress_R': 0.4
  },
  
  // T/D as in "top"/"dog"
  'td': {
    'jawOpen': 0.15,
    'tongueOut': 0.1
  },
  
  // N as in "no"
  'n': {
    'jawOpen': 0.1
  },
  
  // W as in "way"
  'w': {
    'mouthPucker': 0.6,
    'mouthFunnel': 0.2,
    'jawOpen': 0.1
  },
  
  // Y as in "yes"
  'y': {
    'mouthSmile_L': 0.3,
    'mouthSmile_R': 0.3,
    'mouthStretch_L': 0.2,
    'mouthStretch_R': 0.2,
    'jawOpen': 0.15
  }
}

// Phoneme to viseme mapping
export const phonemeToViseme: Record<string, string> = {
  // Vowels
  'AH': 'aa', 'AA': 'aa', 'AE': 'aa', 'AO': 'aa', 'AW': 'aa',
  'IY': 'ee', 'EY': 'ee', 'EH': 'ee',
  'IH': 'ii', 'IX': 'ii',
  'OW': 'oh', 'OH': 'oh',
  'UW': 'oo', 'UH': 'oo', 'ER': 'oo',
  
  // Consonants
  'M': 'mm', 'N': 'n', 'NG': 'n',
  'F': 'ff', 'V': 'ff',
  'TH': 'th', 'DH': 'th',
  'L': 'l', 'R': 'r',
  'S': 's', 'Z': 's',
  'SH': 'sh', 'ZH': 'sh', 'CH': 'sh', 'JH': 'sh',
  'K': 'k', 'G': 'k', 'HH': 'k',
  'P': 'pb', 'B': 'pb',
  'T': 'td', 'D': 'td',
  'W': 'w', 'Y': 'y',
  
  // Silence
  'SIL': 'silence', 'SP': 'silence'
}

// Helper function to interpolate between visemes
export function interpolateVisemes(
  from: VisemeWeights,
  to: VisemeWeights,
  factor: number
): VisemeWeights {
  const result: VisemeWeights = {}
  const allKeys = new Set([...Object.keys(from), ...Object.keys(to)])

  allKeys.forEach(key => {
    const fromValue = from[key] || 0
    const toValue = to[key] || 0
    result[key] = fromValue + (toValue - fromValue) * factor
  })
  
  return result
}

// Get viseme weights for a phoneme
export function getVisemeWeights(phoneme: string): VisemeWeights {
  const viseme = phonemeToViseme[phoneme.toUpperCase()] || 'silence'
  return visemeMap[viseme] || visemeMap['silence']
}