// LFO (Low Frequency Oscillator) Module
class LFO {
    constructor(audioCtx) {
        this.audioCtx = audioCtx;
        this.oscillator = null;
        this.gainNode = null;
        this.isActive = false;
        
        this.config = {
            frequency: 5,        // Hz
            depth: 0.3,          // 0-1
            waveform: 'sine',
            target: 'volume'     // 'volume', 'pitch', 'filter'
        };
    }

    setFrequency(freq) {
        this.config.frequency = Math.max(0.1, Math.min(freq, 20));
        if (this.oscillator) {
            this.oscillator.frequency.setValueAtTime(
                this.config.frequency,
                this.audioCtx.currentTime
            );
        }
    }

    setDepth(depth) {
        this.config.depth = Math.max(0, Math.min(depth, 1));
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(
                this.config.depth,
                this.audioCtx.currentTime
            );
        }
    }

    setWaveform(type) {
        this.config.waveform = type;
        if (this.oscillator) {
            this.oscillator.type = type;
        }
    }

    setTarget(target) {
        this.config.target = target;
    }

    start() {
        if (this.isActive) return;
        
        this.oscillator = this.audioCtx.createOscillator();
        this.gainNode = this.audioCtx.createGain();
        
        this.oscillator.frequency.setValueAtTime(
            this.config.frequency,
            this.audioCtx.currentTime
        );
        this.oscillator.type = this.config.waveform;
        this.gainNode.gain.setValueAtTime(
            this.config.depth,
            this.audioCtx.currentTime
        );
        
        this.oscillator.connect(this.gainNode);
        this.oscillator.start();
        
        this.isActive = true;
    }

    stop() {
        if (!this.isActive) return;
        
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator = null;
        }
        this.gainNode = null;
        this.isActive = false;
    }

    connectToParam(param, range = 1) {
        if (!this.isActive) this.start();
        
        // Create a scaled gain for the parameter
        const scaledGain = this.audioCtx.createGain();
        scaledGain.gain.value = range;
        
        this.gainNode.connect(scaledGain);
        scaledGain.connect(param);
        
        return scaledGain;
    }

    getOutput() {
        return this.gainNode;
    }
}

export function createLFO(audioCtx) {
    return new LFO(audioCtx);
}

export default LFO;