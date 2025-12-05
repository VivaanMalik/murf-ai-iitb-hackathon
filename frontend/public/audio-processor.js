class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (event) => {};
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0]; // Float32Array, [-1, 1]

      // Convert float → 16-bit PCM
      const pcm = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        pcm[i] = Math.max(-1, Math.min(1, channelData[i])) * 0x7fff;
      }

      // Send the PCM to main thread
      this.port.postMessage(pcm);
    }
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
