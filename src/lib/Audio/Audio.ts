export class Audio {
  private audioContext: AudioContext = new AudioContext()

  private audioBuffer: AudioBuffer | null = null

  constructor(audioDataUrl?: string) {
    if (audioDataUrl) {
      this.load(audioDataUrl)
    }
  }

  load = async (audioDataUrl: string) => {
    try {
      const response = await fetch(audioDataUrl)
      const arrayBuffer = await response.arrayBuffer()
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
    } catch (e) {
      console.error(e)
    }
  }

  play = () => {
    if (this.audioBuffer === null) {
      console.error('Audio buffer not available')
      return
    }

    const audioSource = this.audioContext.createBufferSource()
    audioSource.buffer = this.audioBuffer
    audioSource.connect(this.audioContext.destination)
    audioSource.start()
  }
}
