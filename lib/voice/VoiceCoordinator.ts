/**
 * Voice Coordinator
 *
 * Orchestrates the full-duplex voice conversation system:
 * - Browser STT (Speech-to-Text)
 * - Conversation state management
 * - Barge-in detection
 * - API communication (OpenAI chat)
 * - TTS audio playback
 */

import { BrowserSTT } from './browser-stt';
import { ConversationStateMachine, ConversationState } from './conversation-state';
import { BargeInDetector } from './barge-in-detector';
import { LipSyncEngine } from '../audio/lipSyncEngine';

export interface VoiceCoordinatorConfig {
  debugMode?: boolean;
  audioContext?: AudioContext;
}

export interface VoiceCallbacks {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onResponse?: (text: string) => void;
  onStateChange?: (state: ConversationState) => void;
  onError?: (error: string) => void;
  onAudioChunk?: (audioBase64: string) => void;
  onAudioComplete?: () => void;
  onAudioStart?: () => void;
  getLipSyncEngine?: () => LipSyncEngine | null;
}

export class VoiceCoordinator {
  private stt: BrowserSTT | null = null;
  private stateMachine: ConversationStateMachine;
  private bargeInDetector: BargeInDetector;
  private callbacks: VoiceCallbacks;
  private config: VoiceCoordinatorConfig;
  private audioContext: AudioContext | null = null;
  private currentEventSource: EventSource | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private conversationId: string | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;

  constructor(config: VoiceCoordinatorConfig, callbacks: VoiceCallbacks) {
    this.config = config;
    this.callbacks = callbacks;

    // Initialize state machine
    this.stateMachine = new ConversationStateMachine({
      onStateChange: (state) => {
        if (this.config.debugMode) {
          console.log('[VoiceCoordinator] State changed:', state);
        }
        callbacks.onStateChange?.(state);
      }
    });

    // Initialize barge-in detector
    this.bargeInDetector = new BargeInDetector({
      onBargeIn: this.handleBargeIn.bind(this)
    });
  }

  /**
   * Start the voice coordinator
   */
  async start() {
    try {
      // Use provided audio context or create new one
      this.audioContext = this.config.audioContext || new AudioContext({ sampleRate: 24000 });

      // Initialize STT
      this.stt = new BrowserSTT(
        {
          continuous: true,
          interimResults: true,
        },
        {
          onTranscript: (event) => {
            this.handleTranscript(event.text, event.type === 'final');
          },
          onError: (error) => {
            console.error('[VoiceCoordinator] STT error:', error);
            this.callbacks.onError?.(error);
          }
        }
      );

      await this.stt.start();
      this.stateMachine.transition('LISTENING');

      if (this.config.debugMode) {
        console.log('[VoiceCoordinator] Started successfully');
      }
    } catch (error: any) {
      console.error('[VoiceCoordinator] Error starting:', error);
      this.callbacks.onError?.(error.message);
      throw error;
    }
  }

  /**
   * Stop the voice coordinator
   */
  stop() {
    if (this.stt) {
      this.stt.stop();
      this.stt = null;
    }

    this.stopAudioPlayback();

    // Only close audio context if we created it (not provided externally)
    if (this.audioContext && !this.config.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.stateMachine.transition('IDLE');

    if (this.config.debugMode) {
      console.log('[VoiceCoordinator] Stopped');
    }
  }

  /**
   * Get current state
   */
  getCurrentState(): ConversationState {
    return this.stateMachine.getState();
  }

  /**
   * Handle transcript from STT
   */
  private async handleTranscript(text: string, isFinal: boolean) {
    this.callbacks.onTranscript?.(text, isFinal);

    // Check for barge-in during speaking
    if (this.stateMachine.getState() === 'SPEAKING') {
      this.bargeInDetector.processTranscript(text, isFinal);
    }

    // Process final transcript
    if (isFinal && text.trim()) {
      await this.processUserInput(text);
    }
  }

  /**
   * Process user input and get AI response
   */
  private async processUserInput(text: string) {
    if (this.config.debugMode) {
      console.log('[VoiceCoordinator] Processing user input:', text);
    }

    this.stateMachine.transition('THINKING');

    try {
      // Call OpenAI API
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: this.conversationId
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Store conversation ID for continuity
      this.conversationId = data.conversationId;

      if (this.config.debugMode) {
        console.log('[VoiceCoordinator] AI response:', data.text);
        if (data.toolCalls) {
          console.log('[VoiceCoordinator] Tool calls:', data.toolCalls);
        }
      }

      this.callbacks.onResponse?.(data.text);

      // Speak the response
      await this.speakResponse(data.text);

    } catch (error: any) {
      console.error('[VoiceCoordinator] Error processing input:', error);
      this.callbacks.onError?.(`Error: ${error.message}`);
      this.stateMachine.transition('LISTENING');
    }
  }

  /**
   * Speak AI response using TTS
   */
  private async speakResponse(text: string) {
    if (!text || !text.trim()) {
      this.stateMachine.transition('LISTENING');
      return;
    }

    this.stateMachine.transition('SPEAKING');
    this.callbacks.onAudioStart?.();

    try {
      // Connect to SSE streaming endpoint
      const response = await fetch('/api/tts/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`TTS error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              this.callbacks.onAudioComplete?.();
              this.stateMachine.transition('LISTENING');
              return;
            }

            try {
              const { audio } = JSON.parse(data);
              this.callbacks.onAudioChunk?.(audio);
              await this.playAudioChunk(audio);
            } catch (error) {
              if (this.config.debugMode) {
                console.warn('[VoiceCoordinator] Error parsing audio chunk:', error);
              }
            }
          }
        }
      }

    } catch (error: any) {
      console.error('[VoiceCoordinator] TTS error:', error);
      this.callbacks.onError?.(`TTS error: ${error.message}`);
      this.stateMachine.transition('LISTENING');
    }
  }

  /**
   * Play audio chunk
   */
  private async playAudioChunk(base64Audio: string) {
    if (!this.audioContext) {
      console.warn('[VoiceCoordinator] Audio context not initialized');
      return;
    }

    try {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);

      // Add to queue
      this.audioQueue.push(audioBuffer);

      // Start playing if not already playing
      if (!this.isPlaying) {
        this.playNextInQueue();
      }
    } catch (error) {
      console.error('[VoiceCoordinator] Error decoding audio:', error);
    }
  }

  /**
   * Play next audio buffer in queue
   */
  private playNextInQueue() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    if (!this.audioContext) {
      return;
    }

    this.isPlaying = true;
    const buffer = this.audioQueue.shift()!;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    // Connect to lip sync engine if available
    const lipSyncEngine = this.callbacks.getLipSyncEngine?.();
    if (lipSyncEngine) {
      lipSyncEngine.connectAudioSource(source);
    }

    // Connect to destination (speakers)
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.currentSourceNode = null;
      this.playNextInQueue();
    };

    this.currentSourceNode = source;
    source.start();
  }

  /**
   * Handle barge-in (user interrupts AI)
   */
  private handleBargeIn() {
    if (this.config.debugMode) {
      console.log('[VoiceCoordinator] Barge-in detected');
    }

    this.stopAudioPlayback();
    this.stateMachine.transition('BARGE_IN');

    // Return to listening after brief pause
    setTimeout(() => {
      if (this.stateMachine.getState() === 'BARGE_IN') {
        this.stateMachine.transition('LISTENING');
      }
    }, 300);
  }

  /**
   * Stop audio playback
   */
  private stopAudioPlayback() {
    // Stop current SSE stream
    if (this.currentEventSource) {
      this.currentEventSource.close();
      this.currentEventSource = null;
    }

    // Stop current audio source
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
      } catch (error) {
        // Ignore - source may already be stopped
      }
      this.currentSourceNode = null;
    }

    // Clear audio queue
    this.audioQueue = [];
    this.isPlaying = false;
  }
}
