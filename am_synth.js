// AM (Amplitude Modulation) Synthesis Module
class AMSynthesizer {
    constructor(audioCtx) {
        this.audioCtx = audioCtx;
        this.config = {
            modFrequency: 4.0,
            modDepth: 0.8,
            phaseOffset: 0,
            carrierWaveform: 'sine',
            modulatorWaveform: 'sine'
        };
    }

    setModFrequency(freq) {
        this.config.modFrequency = Math.max(0.1, Math.min(freq, 500));
    }

    setModDepth(depth) {
        this.config.modDepth = Math.max(0, Math.min(depth, 1));
    }

    setPhaseOffset(degrees) {
        this.config.phaseOffset = degrees % 360;
    }

    setCarrierWaveform(type) {
        this.config.carrierWaveform = type;
    }

    setModulatorWaveform(type) {
        this.config.modulatorWaveform = type;
    }

    playNote(frequency, globalGain, adsr, activeOscillators, key) {
        const now = this.audioCtx.currentTime;

        const carrier = this.audioCtx.createOscillator();
        carrier.frequency.setValueAtTime(frequency, now);
        carrier.type = this.config.carrierWaveform;

        const modulator = this.audioCtx.createOscillator();
        modulator.frequency.setValueAtTime(this.config.modFrequency, now);
        modulator.type = this.config.modulatorWaveform;

        // Phase offset approximated by delaying modulator start
        const phaseDelay = (this.config.phaseOffset / 360) * (1 / this.config.modFrequency);

        // AM: amGain.gain = DC_offset + modulator*modDepth
        // DC_offset = 1 - modDepth, so gain oscillates between (1-depth) and 1
        const amGain = this.audioCtx.createGain();
        amGain.gain.setValueAtTime(1 - this.config.modDepth, now);

        const modGain = this.audioCtx.createGain();
        modGain.gain.setValueAtTime(this.config.modDepth, now);

        const envelopeGain = this.audioCtx.createGain();
        envelopeGain.gain.setValueAtTime(0.01, now);
        envelopeGain.gain.exponentialRampToValueAtTime(0.4, now + adsr.attack);
        envelopeGain.gain.exponentialRampToValueAtTime(
            Math.max(adsr.sustain * 0.4, 0.001),
            now + adsr.attack + adsr.decay
        );

        modulator.connect(modGain);
        modGain.connect(amGain.gain);
        carrier.connect(amGain);
        amGain.connect(envelopeGain);
        envelopeGain.connect(globalGain);

        carrier.start(now);
        modulator.start(now + phaseDelay);

        activeOscillators[key] = {
            osc: carrier,
            modulator: modulator,
            gainNode: envelopeGain,
            amGain: amGain,
            modGain: modGain,
            type: 'am'
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

export default AMSynthesizer;