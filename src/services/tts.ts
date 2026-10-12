// High-Performance Browser Text-To-Speech Engine with Prioritized Queue
import { cleanChatText } from './textCleanup';

export interface SpeechItem {
  id: string;
  text: string;
  speaker?: string;
  isPriority?: boolean; // Super Chats jump to front of queue
  lang?: string;
  category?: 'chat' | 'gift';
}

class TtsEngine {
  private queue: SpeechItem[] = [];
  private isSpeaking: boolean = false;
  private isEnabled: boolean = false;
  private volume: number = 0.8;
  private rate: number = 1.0;
  private skipUsernames: boolean = true;
  private selectedVoiceUri: string = '';
  private voices: SpeechSynthesisVoice[] = [];
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private activeItem: SpeechItem | null = null;

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
    if (val && !this.isSupported()) {
      console.error('Text-to-speech is unavailable in this browser.');
      return false;
    }
    this.isEnabled = val;
    if (val && typeof window !== 'undefined') {
      window.speechSynthesis.resume();
    } else {
      this.stop();
    }
    return true;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined'
      && 'speechSynthesis' in window
      && typeof SpeechSynthesisUtterance !== 'undefined';
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

  public setVoice(uri: string) {
    this.selectedVoiceUri = uri;
  }

  public enqueue(item: SpeechItem) {
    if (!this.isEnabled || !this.isSupported()) return;

    const cleanText = cleanChatText(item.text);

    if (!cleanText.trim()) return;

    let fullSpeech = cleanText;
    if (!this.skipUsernames && item.speaker) {
      fullSpeech = `${item.speaker} says: ${cleanText}`;
    }

    const cleanedItem = { ...item, text: fullSpeech };

    if (item.isPriority) {
      // Insert at the front (after currently speaking item)
      if (this.queue.filter((queued) => queued.isPriority).length >= 50) {
        const oldestPriority = this.queue.findIndex((queued) => queued.isPriority);
        if (oldestPriority !== -1) this.queue.splice(oldestPriority, 1);
      }
      this.queue.unshift(cleanedItem);
    } else {
      // Normal chat: limit queue length so it doesn't build an infinite backlog
      const normalCount = this.queue.filter((queued) => !queued.isPriority).length;
      if (normalCount >= 20) {
        const oldestNormal = this.queue.findIndex((queued) => !queued.isPriority);
        if (oldestNormal !== -1) this.queue.splice(oldestNormal, 1);
      }
      this.queue.push(cleanedItem);
    }

    if (!this.isSpeaking) {
      this.processNext();
    }
  }

  public removeCategory(category: NonNullable<SpeechItem['category']>) {
    this.queue = this.queue.filter((item) => item.category !== category);
    if (this.activeItem?.category !== category || !this.isSupported()) return;

    this.activeUtterance = null;
    this.activeItem = null;
    this.isSpeaking = false;
    window.speechSynthesis.cancel();
    this.processNext();
  }

  public skip() {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.activeUtterance = null;
      this.activeItem = null;
      this.processNext();
    }
  }

  public stop() {
    this.queue = [];
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.activeUtterance = null;
      this.activeItem = null;
    }
  }

  private processNext() {
    if (!this.isEnabled || !this.isSupported() || this.queue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    const nextItem = this.queue.shift();
    if (!nextItem) return;

    try {
      this.isSpeaking = true;
      this.activeItem = nextItem;
      const utterance = new SpeechSynthesisUtterance(nextItem.text);
      this.activeUtterance = utterance;
      utterance.volume = this.volume;
      utterance.rate = this.rate;
      utterance.lang = nextItem.lang || this.detectLanguage(nextItem.text);

      const selectedVoice = this.voices.find((voice) => voice.voiceURI === this.selectedVoiceUri);
      const languageVoice = this.voices.find((voice) =>
        voice.lang.toLowerCase().startsWith(utterance.lang.toLowerCase().split('-')[0]),
      );
      if (selectedVoice || languageVoice) utterance.voice = selectedVoice || languageVoice || null;

      const finish = () => {
        if (this.activeUtterance !== utterance) return;
        this.activeUtterance = null;
        this.activeItem = null;
        this.isSpeaking = false;
        this.processNext();
      };
      utterance.onend = finish;
      utterance.onerror = (event) => {
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          console.error(`Text-to-speech playback failed: ${event.error}`);
        }
        finish();
      };
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Failed to start text-to-speech playback:', error);
      this.activeUtterance = null;
      this.activeItem = null;
      this.isSpeaking = false;
      this.processNext();
    }
  }

  private detectLanguage(text: string): string {
    if (/[\u3040-\u30ff]/u.test(text)) return 'ja-JP';
    if (/[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f]/u.test(text)) return 'ko-KR';
    if (/[\u4e00-\u9fff]/u.test(text)) return 'zh-CN';
    return 'en-US';
  }
}

export const tts = new TtsEngine();
