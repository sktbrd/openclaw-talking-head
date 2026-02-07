'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { VoiceCoordinator } from '@/lib/voice/VoiceCoordinator';
import { ConversationState } from '@/lib/voice/conversation-state';
import { LipSyncEngine } from '@/lib/audio/lipSyncEngine';

export interface UseVoiceReturn {
  isActive: boolean;
  state: ConversationState;
  transcript: string;
  response: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  lipSyncEngine: LipSyncEngine | null;
}

export function useVoice(): UseVoiceReturn {
  const [isActive, setIsActive] = useState(false);
  const [state, setState] = useState<ConversationState>('IDLE');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);

  const coordinatorRef = useRef<VoiceCoordinator | null>(null);
  const lipSyncRef = useRef<LipSyncEngine | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize coordinator on mount
  useEffect(() => {
    const debugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

    // Initialize audio context and lip sync engine upfront
    audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    lipSyncRef.current = new LipSyncEngine(audioContextRef.current);

    const coordinator = new VoiceCoordinator(
      { debugMode, audioContext: audioContextRef.current },
      {
        onTranscript: (text, isFinal) => {
          if (isFinal) {
            setTranscript(text);
          }
        },
        onResponse: (text) => {
          setResponse(text);
        },
        onStateChange: (newState) => {
          setState(newState);
        },
        onError: (errorMsg) => {
          setError(errorMsg);
          console.error('[useVoice] Error:', errorMsg);
        },
        onAudioStart: () => {
          // Audio starting
        },
        onAudioChunk: () => {
          // Audio chunk received - lip sync engine will analyze it
        },
        onAudioComplete: () => {
          // Audio playback complete
        },
        getLipSyncEngine: () => lipSyncRef.current,
      }
    );

    coordinatorRef.current = coordinator;

    return () => {
      if (coordinator) {
        coordinator.stop();
      }
      if (lipSyncRef.current) {
        lipSyncRef.current.dispose();
        lipSyncRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const start = useCallback(async () => {
    if (!coordinatorRef.current) {
      setError('Voice coordinator not initialized');
      return;
    }

    try {
      setError(null);
      await coordinatorRef.current.start();
      setIsActive(true);
    } catch (err: any) {
      setError(err.message || 'Failed to start voice coordinator');
      console.error('[useVoice] Error starting:', err);
    }
  }, []);

  const stop = useCallback(() => {
    if (coordinatorRef.current) {
      coordinatorRef.current.stop();
      setIsActive(false);
      setTranscript('');
      setResponse('');
      setError(null);
    }
  }, []);

  return {
    isActive,
    state,
    transcript,
    response,
    error,
    start,
    stop,
    lipSyncEngine: lipSyncRef.current,
  };
}
