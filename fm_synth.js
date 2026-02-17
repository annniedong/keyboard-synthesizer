// FM (Frequency Modulation) Synthesis Module
class FMSynthesizer {
    constructor(audioCtx) {
        this.audioCtx = audioCtx;
        this.config = {
            modulatorRatio: 2.0,     // Ratio of modulator to carrier frequency
            modulationIndex: 100,     // Depth of modulation (in Hz)
            modulatorWaveform: 'sine',
            carrierWaveform: 'sine'
        };
    }

    setModulatorRatio(ratio) {
        this.config.modulatorRatio = Math.max(0.1, Math.min(ratio, 10));
    }

    setModulationIndex(index) {
        this.config.modulationIndex = Math.max(0, Math.min(index, 1000));
    }

    setModulatorWaveform(type) {
        this.config.modulatorWaveform = type;
    }

    setCarrierWaveform(type) {
        this.config.carrierWaveform = type;
    }

    playNote(frequency, globalGain, adsr, activeOscillators, key) {
        const now = this.audioCtx.currentTime;

        // Carrier oscillator (main tone)
        const carrier = this.audioCtx.createOscillator();
        carrier.frequency.setValueAtTime(frequency, now);
        carrier.type = this.config.carrierWaveform;

        // Modulator oscillator (modulates carrier frequency)
        const modulator = this.audioCtx.createOscillator();
        const modulatorFreq = frequency * this.config.modulatorRatio;
        modulator.frequency.setValueAtTime(modulatorFreq, now);
        modulator.type = this.config.modulatorWaveform;

        // Modulation index controls depth of frequency modulation
        const modulationGain = this.audioCtx.createGain();
        modulationGain.gain.setValueAtTime(this.config.modulationIndex, now);

        // Envelope gain (ADSR)
        const envelopeGain = this.audioCtx.createGain();
        envelopeGain.gain.setValueAtTime(0.01, now);

        // ADSR envelope
        envelopeGain.gain.exponentialRampToValueAtTime(
            0.4,
            now + adsr.attack
        );
        envelopeGain.gain.exponentialRampToValueAtTime(
            Math.max(adsr.sustain * 0.4, 0.001),
            now + adsr.attack + adsr.decay
        );

        // FM signal chain:
        // modulator -> modulationGain -> carrier.frequency
        // carrier -> envelopeGain -> globalGain
        modulator.connect(modulationGain);
        modulationGain.connect(carrier.frequency);
        
        carrier.connect(envelopeGain);
        envelopeGain.connect(globalGain);

        // Start oscillators
        carrier.start(now);
        modulator.start(now);

        // Store for cleanup
        activeOscillators[key] = {
            osc: carrier,
            modulator: modulator,
            gainNode: envelopeGain,
            modulationGain: modulationGain,
            type: 'fm'
        };

        return { carrier, modulator, envelopeGain };
    }

    release(oscillatorData, adsr) {
        const now = this.audioCtx.currentTime;
        const { osc, modulator, gainNode } = oscillatorData;

        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + adsr.release);

        const stopTime = now + adsr.release + 0.01;
        osc.stop(stopTime);
        modulator.stop(stopTime);
    }
}

export function createFMSynth(audioCtx) {
    return new FMSynthesizer(audioCtx);
}

export default FMSynthesizer;