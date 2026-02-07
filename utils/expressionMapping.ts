// Expression mapping for emotional states
// Maps emotions to morph target combinations

export interface ExpressionWeights {
  [morphTarget: string]: number
}

// Hume AI emotion expressions
export const emotionExpressions: Record<string, ExpressionWeights> = {
  // Neutral/calm state
  'neutral': {
    'browDownLeft': 0,
    'browDownRight': 0,
    'browInnerUp': 0,
    'browOuterUpLeft': 0,
    'browOuterUpRight': 0,
    'eyeBlinkLeft': 0,
    'eyeBlinkRight': 0,
    'eyeSquintLeft': 0,
    'eyeSquintRight': 0,
    'eyeWideLeft': 0,
    'eyeWideRight': 0,
    'mouthSmileLeft': 0,
    'mouthSmileRight': 0,
    'mouthFrownLeft': 0,
    'mouthFrownRight': 0,
    'noseSneerLeft': 0,
    'noseSneerRight': 0,
    'cheekPuff': 0
  },
  
  // Joy/Happiness
  'joy': {
    'mouthSmileLeft': 0.7,
    'mouthSmileRight': 0.7,
    'eyeSquintLeft': 0.3,
    'eyeSquintRight': 0.3,
    'cheekPuff': 0.2,
    'browInnerUp': 0.1
  },
  
  // Amusement
  'amusement': {
    'mouthSmileLeft': 0.8,
    'mouthSmileRight': 0.8,
    'eyeSquintLeft': 0.4,
    'eyeSquintRight': 0.4,
    'cheekPuff': 0.3,
    'browOuterUpLeft': 0.2,
    'browOuterUpRight': 0.2
  },
  
  // Sadness
  'sadness': {
    'mouthFrownLeft': 0.5,
    'mouthFrownRight': 0.5,
    'browInnerUp': 0.4,
    'browDownLeft': 0.2,
    'browDownRight': 0.2,
    'eyeSquintLeft': 0.1,
    'eyeSquintRight': 0.1
  },
  
  // Distress
  'distress': {
    'mouthFrownLeft': 0.6,
    'mouthFrownRight': 0.6,
    'browInnerUp': 0.6,
    'browDownLeft': 0.3,
    'browDownRight': 0.3,
    'eyeWideLeft': 0.2,
    'eyeWideRight': 0.2
  },
  
  // Anger
  'anger': {
    'browDownLeft': 0.7,
    'browDownRight': 0.7,
    'eyeSquintLeft': 0.3,
    'eyeSquintRight': 0.3,
    'mouthFrownLeft': 0.4,
    'mouthFrownRight': 0.4,
    'noseSneerLeft': 0.2,
    'noseSneerRight': 0.2
  },
  
  // Fear
  'fear': {
    'eyeWideLeft': 0.7,
    'eyeWideRight': 0.7,
    'browInnerUp': 0.6,
    'browOuterUpLeft': 0.4,
    'browOuterUpRight': 0.4,
    'mouthOpen': 0.3,
    'jawOpen': 0.2
  },
  
  // Surprise
  'surprise': {
    'eyeWideLeft': 0.8,
    'eyeWideRight': 0.8,
    'browOuterUpLeft': 0.7,
    'browOuterUpRight': 0.7,
    'mouthOpen': 0.5,
    'jawOpen': 0.4
  },
  
  // Disgust
  'disgust': {
    'noseSneerLeft': 0.6,
    'noseSneerRight': 0.6,
    'browDownLeft': 0.3,
    'browDownRight': 0.3,
    'mouthFrownLeft': 0.3,
    'mouthFrownRight': 0.3,
    'eyeSquintLeft': 0.2,
    'eyeSquintRight': 0.2
  },
  
  // Contempt
  'contempt': {
    'mouthSmileLeft': 0.3,
    'mouthSmileRight': 0.1,
    'browDownLeft': 0.2,
    'browDownRight': 0.1,
    'eyeSquintLeft': 0.15,
    'eyeSquintRight': 0.1
  },
  
  // Excitement
  'excitement': {
    'eyeWideLeft': 0.5,
    'eyeWideRight': 0.5,
    'mouthSmileLeft': 0.6,
    'mouthSmileRight': 0.6,
    'browOuterUpLeft': 0.3,
    'browOuterUpRight': 0.3,
    'cheekPuff': 0.2
  },
  
  // Interest
  'interest': {
    'browOuterUpLeft': 0.3,
    'browOuterUpRight': 0.3,
    'eyeWideLeft': 0.2,
    'eyeWideRight': 0.2,
    'mouthSmileLeft': 0.1,
    'mouthSmileRight': 0.1
  },
  
  // Confusion
  'confusion': {
    'browDownLeft': 0.2,
    'browDownRight': 0.4,
    'browInnerUp': 0.3,
    'eyeSquintLeft': 0.2,
    'eyeSquintRight': 0.1,
    'mouthFrownLeft': 0.1,
    'mouthFrownRight': 0.2
  },
  
  // Determination
  'determination': {
    'browDownLeft': 0.4,
    'browDownRight': 0.4,
    'eyeSquintLeft': 0.2,
    'eyeSquintRight': 0.2,
    'jawClench': 0.3,
    'mouthPressLeft': 0.2,
    'mouthPressRight': 0.2
  },
  
  // Concentration
  'concentration': {
    'browDownLeft': 0.3,
    'browDownRight': 0.3,
    'eyeSquintLeft': 0.25,
    'eyeSquintRight': 0.25,
    'mouthPressLeft': 0.1,
    'mouthPressRight': 0.1
  }
}

// Map Hume AI prosody scores to expressions
export interface ProsodyScores {
  [emotion: string]: number
}

// Get the dominant emotion from prosody scores
export function getDominantEmotion(scores: ProsodyScores): string {
  let maxEmotion = 'neutral'
  let maxScore = 0
  
  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score
      maxEmotion = emotion
    }
  }
  
  return maxEmotion
}

// Blend multiple emotions based on their scores
export function blendEmotions(scores: ProsodyScores): ExpressionWeights {
  const result: ExpressionWeights = {}
  let totalWeight = 0
  
  // Calculate total weight for normalization
  for (const score of Object.values(scores)) {
    totalWeight += score
  }
  
  if (totalWeight === 0) {
    return emotionExpressions['neutral']
  }
  
  // Blend all emotions proportionally
  for (const [emotion, score] of Object.entries(scores)) {
    const expression = emotionExpressions[emotion.toLowerCase()]
    if (!expression) continue
    
    const weight = score / totalWeight
    
    for (const [morphTarget, value] of Object.entries(expression)) {
      result[morphTarget] = (result[morphTarget] || 0) + value * weight
    }
  }
  
  return result
}

// Helper function to interpolate between expressions
export function interpolateExpressions(
  from: ExpressionWeights,
  to: ExpressionWeights,
  factor: number
): ExpressionWeights {
  const result: ExpressionWeights = {}
  const allKeys = new Set([...Object.keys(from), ...Object.keys(to)])

  allKeys.forEach(key => {
    const fromValue = from[key] || 0
    const toValue = to[key] || 0
    result[key] = fromValue + (toValue - fromValue) * factor
  })
  
  return result
}