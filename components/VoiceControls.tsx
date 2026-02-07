'use client';

import { ConversationState } from '@/lib/voice/conversation-state';

interface Props {
  isActive: boolean;
  state: ConversationState;
  transcript: string;
  response: string;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}

const stateEmoji: Record<ConversationState, string> = {
  IDLE: '💤',
  LISTENING: '👂',
  THINKING: '🤔',
  SPEAKING: '🗣️',
  BARGE_IN: '✋',
};

const stateLabels: Record<ConversationState, string> = {
  IDLE: 'Idle',
  LISTENING: 'Listening',
  THINKING: 'Thinking',
  SPEAKING: 'Speaking',
  BARGE_IN: 'Interrupted',
};

export default function VoiceControls({
  isActive,
  state,
  transcript,
  response,
  error,
  onStart,
  onStop,
}: Props) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-gray-900/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-gray-700 min-w-[400px] max-w-[600px]">
        {/* Status Display */}
        <div className="text-center mb-4">
          <div className="text-6xl mb-2 animate-pulse-slow">
            {stateEmoji[state]}
          </div>
          <p className="text-white font-semibold text-lg">
            {stateLabels[state]}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-200 text-sm">
              ⚠️ {error}
            </p>
          </div>
        )}

        {/* Control Button */}
        <button
          onClick={isActive ? onStop : onStart}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-lg ${
            isActive
              ? 'bg-red-500 hover:bg-red-600 active:scale-95'
              : 'bg-green-500 hover:bg-green-600 active:scale-95'
          } text-white`}
          disabled={state === 'THINKING'}
        >
          {isActive ? '⏹️ Stop Conversation' : '▶️ Start Conversation'}
        </button>

        {/* Conversation Display */}
        {isActive && (
          <div className="mt-4 space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar">
            {transcript && (
              <div className="bg-blue-900/50 backdrop-blur-sm p-3 rounded-lg border border-blue-700">
                <p className="text-xs text-blue-300 font-semibold mb-1">You said:</p>
                <p className="text-white">&ldquo;{transcript}&rdquo;</p>
              </div>
            )}
            {response && (
              <div className="bg-purple-900/50 backdrop-blur-sm p-3 rounded-lg border border-purple-700">
                <p className="text-xs text-purple-300 font-semibold mb-1">AI responded:</p>
                <p className="text-white">{response}</p>
              </div>
            )}
            {!transcript && !response && (
              <div className="text-center text-gray-400 text-sm py-4">
                Start speaking...
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!isActive && (
          <div className="mt-4 text-center text-gray-400 text-sm">
            <p>Click the button to start a conversation with the AI</p>
            <p className="mt-1 text-xs">
              You can interrupt at any time while it&apos;s speaking
            </p>
          </div>
        )}
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        .animate-pulse-slow {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
