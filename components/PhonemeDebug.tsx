'use client'

import { SceneState } from './TalkingHead/types'
import { getVisemeForPhoneme, DEFAULT_SPEECH_CONFIG } from './TalkingHead/speechSimulation'

interface PhonemeDebugProps {
  sceneState: SceneState | null
}

export default function PhonemeDebug({ sceneState, onClose }: PhonemeDebugProps & { onClose: () => void }) {
  const phonemes = {
    // Vowels
    vowels: [
      { symbol: 'IY', example: 'see' },
      { symbol: 'IH', example: 'sit' },
      { symbol: 'EY', example: 'say' },
      { symbol: 'EH', example: 'set' },
      { symbol: 'AE', example: 'sat' },
      { symbol: 'AH', example: 'cut' },
      { symbol: 'AA', example: 'father' },
      { symbol: 'AO', example: 'law' },
      { symbol: 'OW', example: 'go' },
      { symbol: 'UH', example: 'book' },
      { symbol: 'UW', example: 'too' },
      { symbol: 'ER', example: 'bird' }
    ],
    // Consonants
    consonants: [
      { symbol: 'M', example: 'mom' },
      { symbol: 'P', example: 'pop' },
      { symbol: 'B', example: 'bob' },
      { symbol: 'F', example: 'fish' },
      { symbol: 'V', example: 'very' },
      { symbol: 'TH', example: 'think' },
      { symbol: 'S', example: 'see' },
      { symbol: 'Z', example: 'zoo' },
      { symbol: 'SH', example: 'she' },
      { symbol: 'ZH', example: 'azure' },
      { symbol: 'CH', example: 'cheese' },
      { symbol: 'JH', example: 'judge' },
      { symbol: 'K', example: 'key' },
      { symbol: 'G', example: 'go' },
      { symbol: 'L', example: 'lee' },
      { symbol: 'R', example: 'red' },
      { symbol: 'W', example: 'we' },
      { symbol: 'Y', example: 'yes' },
      { symbol: 'HH', example: 'hee' }
    ]
  }

  const testPhoneme = (phoneme: string) => {
    if (!sceneState || !sceneState.headMesh) {
      console.warn('Scene not ready for phoneme testing')
      return
    }

    console.log(`🎭 Testing phoneme: ${phoneme}`)

    // Get viseme for this phoneme
    const viseme = getVisemeForPhoneme(phoneme, DEFAULT_SPEECH_CONFIG)

    // Set the target viseme
    sceneState.targetViseme = viseme

    // Reset after 1 second
    setTimeout(() => {
      if (sceneState) {
        sceneState.targetViseme = {}
        console.log(`🎭 Reset after testing phoneme: ${phoneme}`)
      }
    }, 1000)
  }

  const resetAll = () => {
    if (!sceneState) return
    sceneState.targetViseme = {}
    console.log('🎭 Reset all visemes to neutral')
  }

  return (
    <div className="absolute top-4 left-4 bg-black bg-opacity-80 p-4 rounded-lg max-w-md max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <div className="text-white text-sm font-semibold">🎭 Phoneme Debug</div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-lg font-bold w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded"
          title="Close phoneme debug"
        >
          ×
        </button>
      </div>

      {/* Vowels */}
      <div className="mb-4">
        <div className="text-gray-300 text-xs mb-2 font-medium">VOWELS</div>
        <div className="grid grid-cols-6 gap-1">
          {phonemes.vowels.map(({ symbol, example }) => (
            <button
              key={symbol}
              onClick={() => testPhoneme(symbol)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-mono"
              title={`${symbol} (${example})`}
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Consonants */}
      <div className="mb-4">
        <div className="text-gray-300 text-xs mb-2 font-medium">CONSONANTS</div>
        <div className="grid grid-cols-6 gap-1">
          {phonemes.consonants.map(({ symbol, example }) => (
            <button
              key={symbol}
              onClick={() => testPhoneme(symbol)}
              className={`${
                symbol === 'M' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
              } text-white px-2 py-1 rounded text-xs font-mono`}
              title={`${symbol} (${example})`}
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Special */}
      <div className="mb-2">
        <div className="text-gray-300 text-xs mb-2 font-medium">SPECIAL</div>
        <button
          onClick={() => testPhoneme('SIL')}
          className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs font-mono mr-1"
          title="SIL (silence)"
        >
          SIL
        </button>
        <button
          onClick={resetAll}
          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
          title="Reset to neutral"
        >
          Reset
        </button>
      </div>

      <div className="text-gray-400 text-xs mt-2">
        Click any phoneme to test its viseme animation
      </div>
    </div>
  )
}
