// Speech Recognition Service wrapper for Web Speech API

interface SpeechRecognitionHandlerOptions {
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  lang?: string;
}

export class SpeechRecorder {
  private recognition: any = null;
  private isListening = false;
  private finalTranscript = '';

  constructor() {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public start(options: SpeechRecognitionHandlerOptions = {}): boolean {
    if (!this.recognition) {
      options.onError?.('Speech recognition is not supported in this browser. You can type directly.');
      return false;
    }

    if (this.isListening) {
      this.stop();
    }

    this.finalTranscript = '';

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.finalTranscript += (this.finalTranscript ? ' ' : '') + transcript;
          options.onFinalResult?.(this.finalTranscript);
        } else {
          interimTranscript += transcript;
        }
      }
      if (interimTranscript) {
        options.onInterimResult?.(interimTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      options.onError?.(event.error || 'Speech capture error');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      options.onEnd?.();
    };

    try {
      this.recognition.start();
      return true;
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      options.onError?.(e.message || 'Could not start microphone');
      return false;
    }
  }

  public stop(): string {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
    return this.finalTranscript;
  }

  public active(): boolean {
    return this.isListening;
  }
}

export const speechRecorder = new SpeechRecorder();

