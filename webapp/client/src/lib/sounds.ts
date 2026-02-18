// Sound system for SintraPrime
// Provides audio feedback for various user interactions

export type SoundType =
  | "notification"
  | "success"
  | "error"
  | "warning"
  | "message"
  | "command"
  | "click"
  | "whoosh";

class SoundManager {
  private enabled: boolean = true;
  private volume: number = 0.5;
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.loadSettings();
    // Initialize sounds on first user interaction to comply with browser autoplay policies
    if (typeof window !== 'undefined') {
      const initOnInteraction = () => {
        if (!this.initialized) {
          this.initializeSounds();
          this.initialized = true;
          document.removeEventListener('click', initOnInteraction);
          document.removeEventListener('keydown', initOnInteraction);
        }
      };
      document.addEventListener('click', initOnInteraction, { once: true });
      document.addEventListener('keydown', initOnInteraction, { once: true });
    }
  }

  private initializeSounds() {
    // Using Web Audio API to generate sounds programmatically
    // This avoids needing external audio files
    
    // Notification sound (pleasant chime)
    this.sounds.set("notification", this.createTone([523.25, 659.25, 783.99], 0.3));
    
    // Success sound (upward progression)
    this.sounds.set("success", this.createTone([392, 523.25, 659.25], 0.2));
    
    // Error sound (descending tone)
    this.sounds.set("error", this.createTone([440, 349.23], 0.3));
    
    // Warning sound (double beep)
    this.sounds.set("warning", this.createTone([523.25, 523.25], 0.2));
    
    // Message received (soft pop)
    this.sounds.set("message", this.createTone([587.33], 0.15));
    
    // Command executed (quick blip)
    this.sounds.set("command", this.createTone([783.99], 0.1));
    
    // Click sound (subtle tap)
    this.sounds.set("click", this.createTone([1046.50], 0.05));
    
    // Whoosh (transition sound)
    this.sounds.set("whoosh", this.createTone([200, 150, 100], 0.15));
  }

  private createTone(frequencies: number[], duration: number): HTMLAudioElement {
    // Create an audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create offline context for rendering
    const offlineContext = new OfflineAudioContext(
      1,
      audioContext.sampleRate * duration,
      audioContext.sampleRate
    );

    const now = offlineContext.currentTime;
    const noteDuration = duration / frequencies.length;

    frequencies.forEach((freq, index) => {
      const oscillator = offlineContext.createOscillator();
      const gainNode = offlineContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(offlineContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = "sine";

      const startTime = now + index * noteDuration;
      const endTime = startTime + noteDuration;

      // Envelope for smooth sound
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

      oscillator.start(startTime);
      oscillator.stop(endTime);
    });

    // Render and create audio element
    const audio = new Audio();
    
    offlineContext.startRendering().then((buffer) => {
      // Convert buffer to WAV
      const wav = this.bufferToWave(buffer);
      const blob = new Blob([wav], { type: "audio/wav" });
      audio.src = URL.createObjectURL(blob);
    });

    return audio;
  }

  private bufferToWave(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels: Float32Array[] = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF identifier
    setUint32(0x46464952);
    // file length minus RIFF identifier length and file description length
    setUint32(length - 8);
    // RIFF type
    setUint32(0x45564157);
    // format chunk identifier
    setUint32(0x20746d66);
    // format chunk length
    setUint32(16);
    // sample format (raw)
    setUint16(1);
    // channel count
    setUint16(buffer.numberOfChannels);
    // sample rate
    setUint32(buffer.sampleRate);
    // byte rate (sample rate * block align)
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels);
    // block align (channel count * bytes per sample)
    setUint16(buffer.numberOfChannels * 2);
    // bits per sample
    setUint16(16);
    // data chunk identifier
    setUint32(0x61746164);
    // data chunk length
    setUint32(length - pos - 4);

    // Write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return arrayBuffer;
  }

  private loadSettings() {
    const settings = localStorage.getItem("soundSettings");
    if (settings) {
      const parsed = JSON.parse(settings);
      this.enabled = parsed.enabled ?? true;
      this.volume = parsed.volume ?? 0.5;
    }
  }

  private saveSettings() {
    localStorage.setItem(
      "soundSettings",
      JSON.stringify({
        enabled: this.enabled,
        volume: this.volume,
      })
    );
  }

  play(type: SoundType) {
    if (!this.enabled || !this.initialized) return;

    const sound = this.sounds.get(type);
    if (sound) {
      sound.volume = this.volume;
      sound.currentTime = 0;
      sound.play().catch((err) => {
        console.warn("Failed to play sound:", err);
      });
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.saveSettings();
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Convenience functions
export const playSound = (type: SoundType) => soundManager.play(type);
export const enableSounds = () => soundManager.setEnabled(true);
export const disableSounds = () => soundManager.setEnabled(false);
export const setSoundVolume = (volume: number) => soundManager.setVolume(volume);
