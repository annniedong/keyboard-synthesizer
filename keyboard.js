import AdditiveSynthesizer from './additive_synth.js';
import FMSynthesizer from './fm_synth.js';
import AMSynthesizer from './am_synth.js';
import LFO from './lfo.js';

document.addEventListener("DOMContentLoaded", function(event) {

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const globalGain = audioCtx.createGain();
    globalGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    globalGain.connect(audioCtx.destination);

    const additiveSynth = new AdditiveSynthesizer(audioCtx);
    const fmSynth = new FMSynthesizer(audioCtx);
    const amSynth = new AMSynthesizer(audioCtx);
    
    const lfo = new LFO(audioCtx);

    const keyboardFrequencyMap = {
        '90': 261.625565300598634,
        '83': 277.182630976872096,
        '88': 293.664767917407560,
        '68': 311.126983722080910,
        '67': 329.627556912869929,
        '86': 349.228231433003884,
        '71': 369.994422711634398,
        '66': 391.995435981749294,
        '72': 415.304697579945138,
        '78': 440.000000000000000,
        '74': 466.163761518089916,
        '77': 493.883301256124111,
        '81': 523.251130601197269,
        '50': 554.365261953744192,
        '87': 587.329535834815120,
        '51': 622.253967444161821,
        '69': 659.255113825739859,
        '82': 698.456462866007768,
        '53': 739.988845423268797,
        '84': 783.990871963498588,
        '54': 830.609395159890277,
        '89': 880.000000000000000,
        '55': 932.327523036179832,
        '85': 987.766602512248223,
    };

    const adsr = {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.6,
        release: 0.2
    };

    const nyquistFrequency = audioCtx.sampleRate / 2;

    window.addEventListener('keydown', keyDown, false);
    window.addEventListener('keyup', keyUp, false);

    let activeOscillators = {};
    
    window.currentWaveform = 'sine';
    window.currentSynthMode = 'simple'; // default mode

    function keyDown(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && !activeOscillators[key]) {
            playNote(key);
            const activeVoices = Object.keys(activeOscillators).length;
            const adjustedGain = Math.min(0.4 / Math.max(activeVoices, 1), .5);
            globalGain.gain.setTargetAtTime(adjustedGain, audioCtx.currentTime, .02);
        }
    }

    function keyUp(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && activeOscillators[key]) {
            const oscData = activeOscillators[key];
            
            switch(oscData.type) {
                case 'additive':
                    additiveSynth.release(oscData, adsr);
                    break;
                case 'fm':
                    fmSynth.release(oscData, adsr);
                    break;
                case 'am':
                    amSynth.release(oscData, adsr);
                    break;
                default:
                    const { osc, gainNode } = oscData;
                    gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
                    gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + adsr.release);
                    osc.stop(audioCtx.currentTime + adsr.release + .01);
            }
            
            delete activeOscillators[key];
        }
    }

    function playNote(key) {
        const frequency = keyboardFrequencyMap[key];
        if (frequency >= nyquistFrequency) return;

        switch(window.currentSynthMode) {
            case 'additive':
                additiveSynth.playNote(frequency, globalGain, adsr, activeOscillators, key);
                break;
            case 'fm':
                fmSynth.playNote(frequency, globalGain, adsr, activeOscillators, key);
                break;
            case 'am':
                amSynth.playNote(frequency, globalGain, adsr, activeOscillators, key);
                break;
            default: // simple
                const osc = audioCtx.createOscillator();
                osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
                osc.type = window.currentWaveform || 'sine';

                const gainNode = audioCtx.createGain();
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(.5, audioCtx.currentTime + adsr.attack);
                gainNode.gain.exponentialRampToValueAtTime(Math.max(adsr.sustain, 0.001), audioCtx.currentTime + adsr.attack + adsr.decay);

                osc.connect(gainNode).connect(globalGain);        
                osc.start();
                activeOscillators[key] = { osc, gainNode, type: 'simple' };
        }
    }

    // Synthesis mode buttons
    const synthModeButtons = document.querySelectorAll('.synth-mode-btn');
    synthModeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            synthModeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            window.currentSynthMode = this.dataset.mode;
            updateControlVisibility(this.dataset.mode);
        });
    });

    function updateControlVisibility(mode) {
        const additiveControls = document.getElementById('additive-controls');
        const fmControls = document.getElementById('fm-controls');
        const amControls = document.getElementById('am-controls');
        
        if (additiveControls) additiveControls.style.display = 'none';
        if (fmControls) fmControls.style.display = 'none';
        if (amControls) amControls.style.display = 'none';
        
        switch(mode) {
            case 'additive':
                if (additiveControls) additiveControls.style.display = 'block';
                break;
            case 'fm':
                if (fmControls) fmControls.style.display = 'block';
                break;
            case 'am':
                if (amControls) amControls.style.display = 'block';
                break;
        }
    }
    
    // Initialize with simple mode (no extra controls)
    updateControlVisibility('simple');

    // Waveform selection buttons — applies to ALL modes
    document.querySelectorAll('.waveform-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.waveform-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');            
            window.currentWaveform = this.dataset.waveform;
            // Update all synths
            fmSynth.setCarrierWaveform(this.dataset.waveform);
            additiveSynth.setWaveform(this.dataset.waveform);
            amSynth.setCarrierWaveform(this.dataset.waveform);
        });
    });

    // Function to update ADSR visualization
    function updateADSRVisualization() {
        const path = document.getElementById('adsr-path');
        if (!path) return;

        // Map ADSR values to SVG coordinates (smaller SVG: 160x100)
        const startX = 8;
        const endX = 152;
        const maxY = 80; // bottom
        const minY = 16;  // top

        // Calculate time-based X positions
        const attackTime = adsr.attack;
        const decayTime = adsr.decay;
        const releaseTime = adsr.release;
        
        // Normalize times for visualization (total width = 144px)
        const totalTime = attackTime + decayTime + 1 + releaseTime; // 1s for sustain display
        const timeScale = 120 / Math.max(totalTime, 2); // minimum 2s total
        
        const attackX = startX + (attackTime * timeScale);
        const decayX = attackX + (decayTime * timeScale);
        const sustainX = decayX + (1 * timeScale); // 1 second sustain display
        const releaseX = Math.min(endX, sustainX + (releaseTime * timeScale));
        
        // Calculate Y positions
        const peakY = minY;
        const sustainLevel = adsr.sustain;
        const sustainY = maxY - ((maxY - minY) * sustainLevel);
        const endY = maxY;
        
        // Create path: start -> attack peak -> decay to sustain -> sustain -> release to end
        const pathData = `M ${startX} ${maxY} L ${attackX} ${peakY} L ${decayX} ${sustainY} L ${sustainX} ${sustainY} L ${releaseX} ${endY}`;
        
        path.setAttribute('d', pathData);
    }

    // ADSR controls with visualization update
    const attackSlider = document.getElementById('attack');
    const decaySlider = document.getElementById('decay');
    const sustainSlider = document.getElementById('sustain');
    const releaseSlider = document.getElementById('release');

    if (attackSlider) attackSlider.addEventListener('input', (e) => {
        adsr.attack = parseFloat(e.target.value);
        document.getElementById('attack-value').textContent = adsr.attack.toFixed(2);
        updateADSRVisualization();
    });

    if (decaySlider) decaySlider.addEventListener('input', (e) => {
        adsr.decay = parseFloat(e.target.value);
        document.getElementById('decay-value').textContent = adsr.decay.toFixed(2);
        updateADSRVisualization();
    });

    if (sustainSlider) sustainSlider.addEventListener('input', (e) => {
        adsr.sustain = parseFloat(e.target.value);
        document.getElementById('sustain-value').textContent = adsr.sustain.toFixed(2);
        updateADSRVisualization();
    });

    if (releaseSlider) releaseSlider.addEventListener('input', (e) => {
        adsr.release = parseFloat(e.target.value);
        document.getElementById('release-value').textContent = adsr.release.toFixed(2);
        updateADSRVisualization();
    });

    // Initialize ADSR visualization
    updateADSRVisualization();

    // Additive synthesis controls
    const numPartialsSlider = document.getElementById('num-partials');
    if (numPartialsSlider) numPartialsSlider.addEventListener('input', (e) => {
        const num = parseInt(e.target.value);
        additiveSynth.setNumPartials(num);
        document.getElementById('num-partials-value').textContent = num;
    });

    // FM synthesis controls
    const fmRatioSlider = document.getElementById('fm-ratio');
    const fmIndexSlider = document.getElementById('fm-index');
    const fmModWaveformSelect = document.getElementById('fm-mod-waveform');

    if (fmRatioSlider) fmRatioSlider.addEventListener('input', (e) => {
        const ratio = parseFloat(e.target.value);
        fmSynth.setModulatorRatio(ratio);
        document.getElementById('fm-ratio-value').textContent = ratio.toFixed(2);
    });

    if (fmIndexSlider) fmIndexSlider.addEventListener('input', (e) => {
        const index = parseFloat(e.target.value);
        fmSynth.setModulationIndex(index);
        document.getElementById('fm-index-value').textContent = index.toFixed(0);
    });

    if (fmModWaveformSelect) fmModWaveformSelect.addEventListener('change', (e) => {
        fmSynth.setModulatorWaveform(e.target.value);
    });

    // AM synthesis controls
    const amModFreqSlider = document.getElementById('am-mod-freq');
    const amModDepthSlider = document.getElementById('am-mod-depth');
    const amPhaseOffsetSlider = document.getElementById('am-phase-offset');
    const amModWaveformSelect = document.getElementById('am-mod-waveform');

    if (amModFreqSlider) amModFreqSlider.addEventListener('input', (e) => {
        const freq = parseFloat(e.target.value);
        amSynth.setModFrequency(freq);
        document.getElementById('am-mod-freq-value').textContent = freq.toFixed(1);
    });

    if (amModDepthSlider) amModDepthSlider.addEventListener('input', (e) => {
        const depth = parseFloat(e.target.value) / 100; // convert % to 0-1
        amSynth.setModDepth(depth);
        document.getElementById('am-mod-depth-value').textContent = e.target.value;
    });

    if (amPhaseOffsetSlider) amPhaseOffsetSlider.addEventListener('input', (e) => {
        const phase = parseFloat(e.target.value);
        amSynth.setPhaseOffset(phase);
        document.getElementById('am-phase-offset-value').textContent = phase.toFixed(0);
    });

    if (amModWaveformSelect) amModWaveformSelect.addEventListener('change', (e) => {
        amSynth.setModulatorWaveform(e.target.value);
    });

    // LFO controls
    const lfoToggle = document.getElementById('lfo-toggle');
    const lfoFreqSlider = document.getElementById('lfo-freq');
    const lfoDepthSlider = document.getElementById('lfo-depth');

    // Function to update rainbow background based on LFO settings
    function updateRainbowFromLFO() {
        const lfoActive = lfoToggle ? lfoToggle.checked : false;
        if (lfoActive) {
            const frequency = lfoFreqSlider ? parseFloat(lfoFreqSlider.value) : 5.0;
            const depth = lfoDepthSlider ? parseFloat(lfoDepthSlider.value) : 0.3;
            
            // Map LFO depth (0-1) to rainbow opacity (0.15-0.6)
            const opacity = 0.15 + (depth * 0.45);
            
            // Map LFO frequency (0.1-20) to rainbow speed (30s-3s) - higher freq = faster
            const speed = Math.max(3, 30 - (frequency * 1.35));
            
            document.documentElement.style.setProperty('--rainbow-opacity', opacity);
            document.documentElement.style.setProperty('--rainbow-speed', speed + 's');
        } else {
            // Reset to defaults when LFO is off
            document.documentElement.style.setProperty('--rainbow-opacity', '0.15');
            document.documentElement.style.setProperty('--rainbow-speed', '15s');
        }
    }

    if (lfoToggle) lfoToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            lfo.start();
            lfo.connectToParam(globalGain.gain, 0.2);
        } else {
            lfo.stop();
        }
        updateRainbowFromLFO();
    });

    if (lfoFreqSlider) lfoFreqSlider.addEventListener('input', (e) => {
        const freq = parseFloat(e.target.value);
        lfo.setFrequency(freq);
        document.getElementById('lfo-freq-value').textContent = freq.toFixed(1);
        updateRainbowFromLFO();
    });

    if (lfoDepthSlider) lfoDepthSlider.addEventListener('input', (e) => {
        const depth = parseFloat(e.target.value);
        lfo.setDepth(depth);
        document.getElementById('lfo-depth-value').textContent = depth.toFixed(2);
        updateRainbowFromLFO();
    });

    // Visual feedback for key presses
    window.addEventListener('keydown', function(event) {
        const key = (event.detail || event.which).toString();
        const keyElement = document.querySelector(`[data-key="${key}"]`);
        if (keyElement && !keyElement.classList.contains('active')) {
            keyElement.classList.add('active');
        }
    }, false);

    window.addEventListener('keyup', function(event) {
        const key = (event.detail || event.which).toString();
        const keyElement = document.querySelector(`[data-key="${key}"]`);
        if (keyElement) keyElement.classList.remove('active');
    }, false);

    // Mouse events for on-screen keyboard
    document.querySelectorAll('.key').forEach(key => {
        key.addEventListener('mousedown', (e) => {
            const keyCode = e.target.closest('.key').dataset.key;
            const event = new KeyboardEvent('keydown', { detail: parseInt(keyCode), which: parseInt(keyCode) });
            window.dispatchEvent(event);
        });
        key.addEventListener('mouseup', (e) => {
            const keyCode = e.target.closest('.key').dataset.key;
            const event = new KeyboardEvent('keyup', { detail: parseInt(keyCode), which: parseInt(keyCode) });
            window.dispatchEvent(event);
        });
        key.addEventListener('mouseleave', (e) => {
            const keyCode = e.target.closest('.key').dataset.key;
            const keyElement = e.target.closest('.key');
            if (keyElement.classList.contains('active')) {
                const event = new KeyboardEvent('keyup', { detail: parseInt(keyCode), which: parseInt(keyCode) });
                window.dispatchEvent(event);
            }
        });
    });
});