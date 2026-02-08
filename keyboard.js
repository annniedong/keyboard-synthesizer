document.addEventListener("DOMContentLoaded", function(event) {

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const globalGain = audioCtx.createGain()
    globalGain.gain.setValueAtTime(0.5, audioCtx.currentTime)
    globalGain.connect(audioCtx.destination)

    const keyboardFrequencyMap = {
        '90': 261.625565300598634,  //Z - C
        '83': 277.182630976872096, //S - C#
        '88': 293.664767917407560,  //X - D
        '68': 311.126983722080910, //D - D#
        '67': 329.627556912869929,  //C - E
        '86': 349.228231433003884,  //V - F
        '71': 369.994422711634398, //G - F#
        '66': 391.995435981749294,  //B - G
        '72': 415.304697579945138, //H - G#
        '78': 440.000000000000000,  //N - A
        '74': 466.163761518089916, //J - A#
        '77': 493.883301256124111,  //M - B
        '81': 523.251130601197269,  //Q - C
        '50': 554.365261953744192, //2 - C#
        '87': 587.329535834815120,  //W - D
        '51': 622.253967444161821, //3 - D#
        '69': 659.255113825739859,  //E - E
        '82': 698.456462866007768,  //R - F
        '53': 739.988845423268797, //5 - F#
        '84': 783.990871963498588,  //T - G
        '54': 830.609395159890277, //6 - G#
        '89': 880.000000000000000,  //Y - A
        '55': 932.327523036179832, //7 - A#
        '85': 987.766602512248223,  //U - B
    }

    const adsr = {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.6,
        release: 0.2
    };

    const nyquistFrequency = audioCtx.sampleRate / 2;

    window.addEventListener('keydown', keyDown, false);
    window.addEventListener('keyup', keyUp, false);

    activeOscillators = {}
    
    window.currentWaveform = 'sine';

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
            const { osc, gainNode } = activeOscillators[key];
            
            gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
            gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);

            // release
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + adsr.release);

            osc.stop(audioCtx.currentTime + adsr.release + .01);
            delete activeOscillators[key];
        }
    }

    function playNote(key) {
        const frequency = keyboardFrequencyMap[key];
        if (frequency >= nyquistFrequency) {
            console.warn(`Frequency ${frequency} Hz exceeds Nyquist frequency. Note not played.`);
            return;
        }

        const osc = audioCtx.createOscillator();
        osc.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime)
        osc.type = window.currentWaveform || 'sine'

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

        // attack
        gainNode.gain.exponentialRampToValueAtTime(.5, audioCtx.currentTime + adsr.attack);

        //decay to sustain
        gainNode.gain.exponentialRampToValueAtTime(Math.max(adsr.sustain, 0.001), audioCtx.currentTime + adsr.attack + adsr.decay);

        osc.connect(gainNode).connect(globalGain)        
        
        osc.start();
        activeOscillators[key] = { osc, gainNode };
    }

    // waveform selection buttons
    document.querySelectorAll('.waveform-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.waveform-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');            
            window.currentWaveform = this.dataset.waveform;
        });
    });

    // visual feedback for key presses
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
        if (keyElement) {
            keyElement.classList.remove('active');
        }
    }, false);

    // mouse events for on-screen keyboard
    document.querySelectorAll('.key').forEach(key => {
        key.addEventListener('mousedown', (e) => {
            const keyCode = e.target.closest('.key').dataset.key;
            const keyElement = e.target.closest('.key');
            
            // simulate keyboard event
            const event = new KeyboardEvent('keydown', {
                detail: parseInt(keyCode),
                which: parseInt(keyCode)
            });
            window.dispatchEvent(event);
            keyElement.classList.add('active');
        });

        key.addEventListener('mouseup', (e) => {
            const keyCode = e.target.closest('.key').dataset.key;
            const keyElement = e.target.closest('.key');
            
            // simulate keyboard event
            const event = new KeyboardEvent('keyup', {
                detail: parseInt(keyCode),
                which: parseInt(keyCode)
            });
            window.dispatchEvent(event);
            keyElement.classList.remove('active');
        });

        key.addEventListener('mouseleave', (e) => {
            const keyCode = e.target.closest('.key').dataset.key;
            const keyElement = e.target.closest('.key');
            
            if (keyElement.classList.contains('active')) {
                // simulate keyboard event
                const event = new KeyboardEvent('keyup', {
                    detail: parseInt(keyCode),
                    which: parseInt(keyCode)
                });
                window.dispatchEvent(event);
                keyElement.classList.remove('active');
            }
        });
    });
});
