/**
 * Lip Sync Engine
 *
 * Analyzes audio in real-time and maps frequency data to viseme weights
 * for realistic lip-syncing on the 3D talking head.
 *
 * Visemes are the visual representations of phonemes (speech sounds).
 * We analyze audio frequencies to approximate which viseme should be active.
 */

export interface VisemeWeights {
  [morphTargetName: string]: number;
}

export class LipSyncEngine {
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer>;
  private smoothingFactor = 0.3; // For smooth transitions
  private previousWeights: VisemeWeights = {};

  constructor(audioContext: AudioContext) {
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
  }

  /**
   * Connect an audio source to the analyser
   */
  connectAudioSource(source: AudioBufferSourceNode | MediaStreamAudioSourceNode) {
    if (this.analyser) {
      source.connect(this.analyser);
      // Don't connect to destination - we just want to analyze, not play through this node
    }
  }

  /**
   * Disconnect the analyser
   */
  disconnect() {
    if (this.analyser) {
      this.analyser.disconnect();
    }
  }

  /**
   * Get current viseme weights based on audio analysis
   */
  getCurrentViseme(): VisemeWeights {
    if (!this.analyser) {
      return {};
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Analyze frequency bands
    const lowFreq = this.getFrequencyBand(0, 300);       // 0-300 Hz: Low vowels
    const midFreq = this.getFrequencyBand(300, 2000);    // 300-2000 Hz: Mid vowels
    const highFreq = this.getFrequencyBand(2000, 8000);  // 2000-8000 Hz: Consonants
    const volume = this.getOverallVolume();

    // Map frequencies to visemes
    const weights = this.mapToVisemes(lowFreq, midFreq, highFreq, volume);

    // Smooth transitions
    const smoothedWeights = this.smoothWeights(weights);

    this.previousWeights = smoothedWeights;
    return smoothedWeights;
  }

  /**
   * Map frequency analysis to viseme weights
   */
  private mapToVisemes(
    lowFreq: number,
    midFreq: number,
    highFreq: number,
    volume: number
  ): VisemeWeights {
    // Silence
    if (volume < 0.1) {
      return {
        jawOpen: 0,
        mouthClose: 1,
      };
    }

    // High frequency - Sibilants (S, SH, F, TH)
    if (highFreq > 0.6) {
      return {
        jawOpen: 0.2,
        mouthStretchLeft: 0.4,
        mouthStretchRight: 0.4,
        mouthFunnel: 0.2,
      };
    }

    // Low frequency - Open vowels (AA, AH, AO)
    if (lowFreq > 0.7) {
      return {
        jawOpen: 0.8,
        mouthOpen: 0.6,
        mouthSmileLeft: 0.1,
        mouthSmileRight: 0.1,
      };
    }

    // Mid-low frequency - Closed consonants (M, B, P)
    if (midFreq > 0.5 && volume > 0.3) {
      return {
        mouthClose: 0.9,
        mouthPressLeft: 0.5,
        mouthPressRight: 0.5,
        jawOpen: 0.1,
      };
    }

    // Mid-high frequency - Mid vowels (EE, EH, IH)
    if (midFreq > 0.4 && highFreq > 0.3) {
      return {
        jawOpen: 0.3,
        mouthSmileLeft: 0.6,
        mouthSmileRight: 0.6,
        mouthStretchLeft: 0.3,
        mouthStretchRight: 0.3,
      };
    }

    // Rounded vowels (OO, OH)
    if (lowFreq > 0.4 && midFreq > 0.3) {
      return {
        jawOpen: 0.5,
        mouthFunnel: 0.7,
        mouthPucker: 0.6,
      };
    }

    // Default - neutral with slight movement
    return {
      jawOpen: 0.3 * volume,
      mouthOpen: 0.2 * volume,
    };
  }

  /**
   * Get frequency band energy (normalized 0-1)
   */
  private getFrequencyBand(minFreq: number, maxFreq: number): number {
    if (!this.analyser) return 0;

    const sampleRate = this.analyser.context.sampleRate;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / this.dataArray.length;

    const minBin = Math.floor(minFreq / binWidth);
    const maxBin = Math.floor(maxFreq / binWidth);

    let sum = 0;
    let count = 0;

    for (let i = minBin; i < maxBin && i < this.dataArray.length; i++) {
      sum += this.dataArray[i] / 255;
      count++;
    }

    return count > 0 ? sum / count : 0;
  }

  /**
   * Get overall volume (normalized 0-1)
   */
  private getOverallVolume(): number {
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] / 255;
    }
    return sum / this.dataArray.length;
  }

  /**
   * Smooth weight transitions for natural animation
   */
  private smoothWeights(newWeights: VisemeWeights): VisemeWeights {
    const smoothed: VisemeWeights = {};

    // Get all unique keys from both old and new weights
    const allKeys = new Set([
      ...Object.keys(this.previousWeights),
      ...Object.keys(newWeights),
    ]);

    for (const key of Array.from(allKeys)) {
      const oldValue = this.previousWeights[key] || 0;
      const newValue = newWeights[key] || 0;

      // Linear interpolation for smooth transitions
      smoothed[key] = oldValue + (newValue - oldValue) * this.smoothingFactor;

      // Clamp to 0-1 range
      smoothed[key] = Math.max(0, Math.min(1, smoothed[key]));
    }

    return smoothed;
  }

  /**
   * Set smoothing factor (0 = no smoothing, 1 = maximum smoothing)
   */
  setSmoothingFactor(factor: number) {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.disconnect();
    this.analyser = null;
  }
}
