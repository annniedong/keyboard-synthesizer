// Additive Synthesis Module
class AdditiveSynthesizer {
    constructor(audioCtx) {
        this.audioCtx = audioCtx;
        this.config = {
            numPartials: 5,
            waveform: 'sine',
            partials: [
                { harmonic: 1, amplitude: 1.0 },
                { harmonic: 2, amplitude: 0.5 },
                { harmonic: 3, amplitude: 0.3 },
                { harmonic: 4, amplitude: 0.2 },
                { harmonic: 5, amplitude: 0.1 }
            ]
        };
    }

    setNumPartials(num) {
        this.config.numPartials = Math.max(1, Math.min(num, 8));
        while (this.config.partials.length < this.config.numPartials) {
            const nextHarmonic = this.config.partials.length + 1;
            this.config.partials.push({ harmonic: nextHarmonic, amplitude: 1.0 / nextHarmonic });
        }
    }

    setWaveform(type) {
        this.config.waveform = type;
    }

    setPartialAmplitude(index, amplitude) {
        if (index < this.config.partials.length) {
            this.config.partials[index].amplitude = Math.max(0, Math.min(amplitude, 1));
        }
    }

    playNote(frequency, globalGain, adsr, activeOscillators, key) {
        const now = this.audioCtx.currentTime;
        const oscillators = [];
        const gainNodes = [];

        const masterGain = this.audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.01, now);
        masterGain.gain.exponentialRampToValueAtTime(0.3, now + adsr.attack);
        masterGain.gain.exponentialRampToValueAtTime(
            Math.max(adsr.sustain * 0.3, 0.001),
            now + adsr.attack + adsr.decay
        );

        for (let i = 0; i < this.config.numPartials; i++) {
            const partial = this.config.partials[i];
            const osc = this.audioCtx.createOscillator();
            const partialGain = this.audioCtx.createGain();

            osc.frequency.setValueAtTime(frequency * partial.harmonic, now);
            osc.type = this.config.waveform;
            partialGain.gain.setValueAtTime(partial.amplitude, now);

            osc.connect(partialGain);
            partialGain.connect(masterGain);
            osc.start(now);

            oscillators.push(osc);
            gainNodes.push(partialGain);
        }

        masterGain.connect(globalGain);

        activeOscillators[key] = {
            oscillators: oscillators,
            gainNode: masterGain,
            partialGains: gainNodes,
            type: 'additive'
        };

        return { oscillators, masterGain, gainNodes };
    }

    release(oscillatorData, adsr) {
        const now = this.audioCtx.currentTime;
        const { oscillators, gainNode } = oscillatorData;

        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + adsr.release);

        const stopTime = now + adsr.release + 0.01;
        oscillators.forEach(osc => osc.stop(stopTime));
    }
}

export function createAdditiveSynth(audioCtx) {
    return new AdditiveSynthesizer(audioCtx);
}

export default AdditiveSynthesizer;