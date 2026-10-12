// High-Performance Browser Text-To-Speech Engine with Prioritized Queue
export interface SpeechItem {
  id: string;
  text: string;
  speaker?: string;
  isPriority?: boolean; // Super Chats jump to front of queue
  lang?: string;
}

class TtsEngine {
  private queue: SpeechItem[] = [];
  private isSpeaking: boolean = false;
  private isEnabled: boolean = false;
  private volume: number = 0.8;
  private rate: number = 1.0;
  private skipUsernames: boolean = true;
  private skipEmojis: boolean = true;
  private selectedVoiceUri: string = '';
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private loadVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    return this.voices;
  }

  public setEnabled(val: boolean) {
    this.isEnabled = val;
    if (!val) {
      this.stop();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setRate(rate: number) {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
  }

  public setSkipUsernames(val: boolean) {
    this.skipUsernames = val;
  }

  public setSkipEmojis(val: boolean) {
    this.skipEmojis = val;
  }

  public setVoice(uri: string) {
    this.selectedVoiceUri = uri;
  }

  public enqueue(item: SpeechItem) {
    if (!this.isEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    let cleanText = item.text;
    if (this.skipEmojis) {
      // Strip common emojis and symbols
      cleanText = cleanText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '');
    }

    if (!cleanText.trim()) return;

    let fullSpeech = cleanText;
    if (!this.skipUsernames && item.speaker) {
      fullSpeech = `${item.speaker} says: ${cleanText}`;
    }

    const cleanedItem = { ...item, text: fullSpeech };

    if (item.isPriority) {
      // Insert at the front (after currently speaking item)
      this.queue.unshift(cleanedItem);
    } else {
      // Normal chat: limit queue length so it doesn't build an infinite backlog
      if (this.queue.length > 8) {
        this.queue.shift(); // Drop oldest
      }
      this.queue.push(cleanedItem);
    }

    if (!this.isSpeaking) {
      this.processNext();
    }
  }

  public skip() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.processNext();
    }
  }

  public stop() {
    this.queue = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  private processNext() {
    if (this.queue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    const nextItem = this.queue.shift();
    if (!nextItem) return;

    this.isSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(nextItem.text);
    utterance.volume = this.volume;
    utterance.rate = this.rate;

    // Detect language or assign selected voice
    if (this.selectedVoiceUri) {
      const match = this.voices.find((v) => v.voiceURI === this.selectedVoiceUri);
      if (match) utterance.voice = match;
    }

    utterance.onend = () => {
      this.isSpeaking = false;
      this.processNext();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.processNext();
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeaking = false;
    }
  }
}

export const tts = new TtsEngine();
