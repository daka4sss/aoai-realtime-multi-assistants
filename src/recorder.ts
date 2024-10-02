export class Recorder {
  onDataAvailable: (base64: string) => void;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;

  public constructor(onDataAvailable: (base64: string) => void) {
    this.onDataAvailable = onDataAvailable;
  }

  async start(stream: MediaStream) {
    try {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      await this.audioContext.audioWorklet.addModule(
        "./audio-worklet-processor.js",
      );
      this.mediaStream = stream;
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(
        this.mediaStream,
      );
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const buffer = new ArrayBuffer(input.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < input.length; i++) {
          view.setInt16(i * 2, input[i] * 0x7FFF, true);
        }
        const base64data = btoa(String.fromCharCode(...new Uint8Array(buffer)));

        this.onDataAvailable(base64data);
      }
      this.mediaStreamSource.connect(processor);
      processor.connect(this.audioContext.destination);
    } catch (error) {
      this.stop();
    }
  }

  stop() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
