// OpenAI Realtime API Voice Integration
// Docs: https://platform.openai.com/docs/api-reference/realtime

export type VoiceMode = "idle" | "listening" | "speaking" | "thinking";

export interface RealtimeConfig {
  apiKey: string;
  model?: string; // e.g., "gpt-4o-realtime-preview" or "gpt-5" if available
  voice?: "alloy" | "echo" | "shimmer";
  instructions?: string;
  onModeChange?: (mode: VoiceMode) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onResponse?: (text: string) => void;
  onError?: (error: Error) => void;
}

export class RealtimeVoiceClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private config: RealtimeConfig;
  private mode: VoiceMode = "idle";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(config: RealtimeConfig) {
    this.config = {
      model: "gpt-4o-realtime-preview",
      voice: "shimmer",
      ...config,
    };
  }

  async connect(): Promise<void> {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000,
        },
      });

      // Initialize AudioContext
      this.audioContext = new AudioContext({ sampleRate: 24000 });

      // Connect to Realtime API WebSocket
      const wsUrl = "wss://api.openai.com/v1/realtime";
      const params = new URLSearchParams({
        model: this.config.model || "gpt-4o-realtime-preview",
      });

      this.ws = new WebSocket(`${wsUrl}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      } as any);

      this.setupWebSocketHandlers();
      this.setMode("idle");
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log("[RealtimeAPI] Connected");
      this.reconnectAttempts = 0;
      
      // Send session configuration
      this.send({
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: this.config.instructions || "You are a helpful design consultant.",
          voice: this.config.voice || "shimmer",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
        },
      });
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleServerMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error("[RealtimeAPI] WebSocket error:", error);
      this.handleError(new Error("WebSocket error"));
    };

    this.ws.onclose = () => {
      console.log("[RealtimeAPI] Disconnected");
      this.setMode("idle");
      
      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
      }
    };
  }

  private handleServerMessage(message: any): void {
    switch (message.type) {
      case "session.created":
        console.log("[RealtimeAPI] Session created:", message.session);
        break;

      case "input_audio_buffer.speech_started":
        this.setMode("listening");
        break;

      case "input_audio_buffer.speech_stopped":
        this.setMode("thinking");
        break;

      case "conversation.item.input_audio_transcription.completed":
        if (this.config.onTranscript) {
          this.config.onTranscript(message.transcript, true);
        }
        break;

      case "response.audio.delta":
        // Play audio chunk
        if (message.delta && this.audioContext) {
          this.playAudioChunk(message.delta);
        }
        this.setMode("speaking");
        break;

      case "response.audio_transcript.delta":
        if (this.config.onTranscript) {
          this.config.onTranscript(message.delta, false);
        }
        break;

      case "response.done":
        this.setMode("idle");
        if (message.response?.output?.[0]?.content?.[0]?.transcript) {
          const transcript = message.response.output[0].content[0].transcript;
          if (this.config.onResponse) {
            this.config.onResponse(transcript);
          }
        }
        break;

      case "error":
        console.error("[RealtimeAPI] Server error:", message.error);
        this.handleError(new Error(message.error.message));
        break;
    }
  }

  private playAudioChunk(base64Audio: string): void {
    if (!this.audioContext) return;

    try {
      // Decode base64 PCM16 audio
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert to Float32Array for AudioBuffer
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      // Create and play audio buffer
      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      console.error("[RealtimeAPI] Error playing audio:", error);
    }
  }

  async startListening(): Promise<void> {
    if (!this.ws || !this.mediaStream) {
      throw new Error("Not connected");
    }

    this.setMode("listening");

    // Start capturing and sending audio
    const audioContext = this.audioContext!;
    const source = audioContext.createMediaStreamSource(this.mediaStream);
    
    // Create ScriptProcessor for audio chunks
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Convert Float32 to PCM16
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Convert to base64
      const bytes = new Uint8Array(pcm16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      // Send to server
      this.send({
        type: "input_audio_buffer.append",
        audio: base64,
      });
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }

  stopListening(): void {
    if (!this.ws) return;

    this.send({
      type: "input_audio_buffer.commit",
    });

    this.setMode("thinking");
  }

  sendText(text: string): void {
    if (!this.ws) return;

    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text,
          },
        ],
      },
    });

    this.send({
      type: "response.create",
    });

    this.setMode("thinking");
  }

  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private setMode(mode: VoiceMode): void {
    this.mode = mode;
    if (this.config.onModeChange) {
      this.config.onModeChange(mode);
    }
  }

  private handleError(error: Error): void {
    console.error("[RealtimeAPI] Error:", error);
    if (this.config.onError) {
      this.config.onError(error);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.setMode("idle");
  }

  getMode(): VoiceMode {
    return this.mode;
  }
}
