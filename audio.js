// Web Audio API implementation for Fibonacci-based audio-visual piece

class FibonacciChord {
    constructor() {
        this.audioContext = null;
        this.oscillators = [];
        this.gainNodes = [];
        this.lfoOscillators = [];
        this.lfoGains = [];
        this.panLFOs = []; // Panning LFOs
        this.panners = []; // StereoPanner nodes
        this.constantSources = []; // Store constant sources for cleanup
        this.masterGain = null;
        this.reverb = null;
        this.isPlaying = false;

        this.fundamental = 40; // Hz
        this.harmonicCount = 5; // How many Fibonacci harmonics
        this.globalVolume = 0.3; // Global volume (0-1)
    }

    async init() {
        // Create AudioContext (requires user gesture on first interaction)
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create reverb (simple gain for now, can add convolver later)
        await this.createReverb();

        // Create master gain for overall volume control
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0; // Start silent for ADSR envelope

        // Connect master → reverb → output
        this.masterGain.connect(this.reverb);
        this.reverb.connect(this.audioContext.destination);

        console.log('FibonacciChord audio system initialized');
    }

    async createReverb() {
        // Simple reverb using gain node (placeholder)
        // TODO: Implement proper reverb with ConvolverNode or delay network
        this.reverb = this.audioContext.createGain();
        this.reverb.gain.value = 1.0; // Pass-through for now
    }

    start() {
        if (this.isPlaying) return;

        // Resume audio context if suspended (browser autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const now = this.audioContext.currentTime;
        const fibonacci = this.generateFibonacci(this.harmonicCount);

        console.log('Starting Fibonacci chord with harmonics:', fibonacci);

        // Create oscillators for each Fibonacci harmonic
        for (let i = 0; i < fibonacci.length; i++) {
            const fibNum = fibonacci[i];
            const frequency = this.fundamental * fibNum;

            // Main oscillator (sine wave)
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = frequency;

            // Gain node for this oscillator
            const gain = this.audioContext.createGain();
            const baseGain = 1.0 / fibonacci.length; // Normalize volume
            gain.gain.value = 0; // Start at 0, will be modulated by LFO and constant

            // Constant source for base gain value
            const constantSource = this.audioContext.createConstantSource();
            constantSource.offset.value = baseGain;

            // LFO for amplitude modulation - rate based on Fibonacci number directly
            // LFO rates: 0.1, 0.1, 0.2, 0.3, 0.5, 0.8, 1.3, 2.1 Hz (fibonacci/10)
            const lfo = this.audioContext.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = fibNum * 0.1; // Fibonacci-based LFO rate

            const lfoGain = this.audioContext.createGain();
            lfoGain.gain.value = baseGain * 0.3; // LFO depth (30% modulation)

            // Panning LFO - each voice pans at its own rate
            const panLFO = this.audioContext.createOscillator();
            panLFO.type = 'sine';
            panLFO.frequency.value = fibNum * 0.05; // Slower panning rate

            const panLFOGain = this.audioContext.createGain();
            panLFOGain.gain.value = 0.7; // Pan range (-0.7 to 0.7)

            // Stereo panner
            const panner = this.audioContext.createStereoPanner();
            panner.pan.value = 0;

            // Connect panning LFO
            panLFO.connect(panLFOGain);
            panLFOGain.connect(panner.pan);

            // Connect constant source (base level) and LFO (modulation) to gain
            constantSource.connect(gain.gain);
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);

            // Connect main chain: osc → gain → panner → masterGain
            osc.connect(gain);
            gain.connect(panner);
            panner.connect(this.masterGain);

            // Start all sources
            osc.start(now);
            lfo.start(now);
            panLFO.start(now);
            constantSource.start(now);

            // Store references for cleanup
            this.oscillators.push(osc);
            this.gainNodes.push(gain);
            this.lfoOscillators.push(lfo);
            this.lfoGains.push(lfoGain);
            this.panLFOs.push(panLFO);
            this.panners.push(panner);
            this.constantSources.push(constantSource);
        }

        // Apply attack envelope to master gain (soft fade in)
        this.masterGain.gain.setValueAtTime(0, now);
        this.masterGain.gain.linearRampToValueAtTime(this.globalVolume, now + 1.0); // 1s attack

        this.isPlaying = true;
    }

    setGlobalVolume(volume) {
        this.globalVolume = volume;
        if (this.isPlaying && this.masterGain) {
            const now = this.audioContext.currentTime;
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
            this.masterGain.gain.linearRampToValueAtTime(volume, now + 0.1); // Smooth transition
        }
    }

    stop() {
        if (!this.isPlaying) return;

        const now = this.audioContext.currentTime;

        // Apply release envelope (soft fade out)
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0, now + 1.0); // 1s release

        // Stop and disconnect oscillators after release completes
        setTimeout(() => {
            this.oscillators.forEach(osc => {
                osc.stop();
                osc.disconnect();
            });
            this.lfoOscillators.forEach(lfo => {
                lfo.stop();
                lfo.disconnect();
            });
            this.constantSources.forEach(cs => {
                cs.stop();
                cs.disconnect();
            });
            this.panLFOs.forEach(pan => {
                pan.stop();
                pan.disconnect();
            });
            this.gainNodes.forEach(gain => gain.disconnect());
            this.lfoGains.forEach(gain => gain.disconnect());
            this.panners.forEach(panner => panner.disconnect());

            // Clear arrays
            this.oscillators = [];
            this.gainNodes = [];
            this.lfoOscillators = [];
            this.lfoGains = [];
            this.constantSources = [];
            this.panLFOs = [];
            this.panners = [];

            this.isPlaying = false;
            console.log('Fibonacci chord stopped');
        }, 1100); // Wait for release to complete
    }

    getAmplitudes() {
        // Return current amplitude of each harmonic for visual feedback
        const amplitudes = [];

        if (!this.isPlaying || this.gainNodes.length === 0) {
            // Return zeros if not playing
            for (let i = 0; i < this.harmonicCount; i++) {
                amplitudes.push(0);
            }
            return amplitudes;
        }

        // Get current gain value for each oscillator (includes LFO modulation)
        for (let i = 0; i < this.gainNodes.length; i++) {
            amplitudes.push(this.gainNodes[i].gain.value);
        }

        return amplitudes;
    }

    setFundamental(freq) {
        this.fundamental = freq;
        if (this.isPlaying) {
            // Update oscillator frequencies in real-time
            const fibonacci = this.generateFibonacci(this.harmonicCount);
            for (let i = 0; i < this.oscillators.length; i++) {
                this.oscillators[i].frequency.value = freq * fibonacci[i];
            }
            console.log('Updated fundamental to', freq, 'Hz');
        }
    }

    setHarmonicCount(count) {
        const oldCount = this.harmonicCount;
        this.harmonicCount = count;

        if (!this.isPlaying) return;

        const now = this.audioContext.currentTime;
        const fadeTime = 0.3; // 300ms fade

        if (count > oldCount) {
            // Adding harmonics - need to create new oscillators
            const fibonacci = this.generateFibonacci(count);

            for (let i = oldCount; i < count && i < 21; i++) {
                const fibNum = fibonacci[i];
                const frequency = this.fundamental * fibNum;
                const baseGain = 1.0 / count; // Recalculate for new count

                // Create new oscillator
                const osc = this.audioContext.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = frequency;

                const gain = this.audioContext.createGain();
                gain.gain.value = 0; // Start silent

                const constantSource = this.audioContext.createConstantSource();
                constantSource.offset.value = 0; // Start at 0, will fade in

                const lfo = this.audioContext.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = fibNum * 0.1;

                const lfoGain = this.audioContext.createGain();
                lfoGain.gain.value = baseGain * 0.3;

                const panLFO = this.audioContext.createOscillator();
                panLFO.type = 'sine';
                panLFO.frequency.value = fibNum * 0.05;

                const panLFOGain = this.audioContext.createGain();
                panLFOGain.gain.value = 0.7;

                const panner = this.audioContext.createStereoPanner();

                // Connect everything
                constantSource.connect(gain.gain);
                lfo.connect(lfoGain);
                lfoGain.connect(gain.gain);
                panLFO.connect(panLFOGain);
                panLFOGain.connect(panner.pan);
                osc.connect(gain);
                gain.connect(panner);
                panner.connect(this.masterGain);

                // Start and fade in
                osc.start(now);
                lfo.start(now);
                panLFO.start(now);
                constantSource.start(now);
                constantSource.offset.setValueAtTime(0, now);
                constantSource.offset.linearRampToValueAtTime(baseGain, now + fadeTime);

                // Store references
                this.oscillators.push(osc);
                this.gainNodes.push(gain);
                this.lfoOscillators.push(lfo);
                this.lfoGains.push(lfoGain);
                this.panLFOs.push(panLFO);
                this.panners.push(panner);
                this.constantSources.push(constantSource);
            }
        } else if (count < oldCount) {
            // Removing harmonics - fade out and stop
            for (let i = count; i < oldCount && i < this.oscillators.length; i++) {
                const constantSource = this.constantSources[i];

                // Fade out
                constantSource.offset.setValueAtTime(constantSource.offset.value, now);
                constantSource.offset.linearRampToValueAtTime(0, now + fadeTime);

                // Stop and disconnect after fade
                const osc = this.oscillators[i];
                const lfo = this.lfoOscillators[i];
                const panLFO = this.panLFOs[i];
                const gain = this.gainNodes[i];
                const panner = this.panners[i];

                setTimeout(() => {
                    osc.stop();
                    lfo.stop();
                    panLFO.stop();
                    constantSource.stop();
                    osc.disconnect();
                    lfo.disconnect();
                    panLFO.disconnect();
                    constantSource.disconnect();
                    gain.disconnect();
                    panner.disconnect();
                }, fadeTime * 1000 + 50);
            }

            // Trim arrays
            this.oscillators = this.oscillators.slice(0, count);
            this.gainNodes = this.gainNodes.slice(0, count);
            this.lfoOscillators = this.lfoOscillators.slice(0, count);
            this.lfoGains = this.lfoGains.slice(0, count);
            this.panLFOs = this.panLFOs.slice(0, count);
            this.panners = this.panners.slice(0, count);
            this.constantSources = this.constantSources.slice(0, count);
        }

        console.log('Updated to', count, 'harmonics');
    }

    generateFibonacci(n) {
        const fib = [1, 1];
        for (let i = 2; i < n; i++) {
            fib.push(fib[i-1] + fib[i-2]);
        }
        return fib.slice(0, n);
    }
}
