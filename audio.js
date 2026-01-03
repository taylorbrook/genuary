// Web Audio API implementation for Fibonacci-based audio-visual piece

class FibonacciChord {
    constructor() {
        this.audioContext = null;
        this.oscillators = [];
        this.gainNodes = [];
        this.lfoOscillators = [];
        this.lfoGains = [];
        this.masterGain = null;
        this.reverb = null;
        this.isPlaying = false;

        this.fundamental = 40; // Hz
        this.harmonicCount = 5; // How many Fibonacci harmonics
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
            gain.gain.value = baseGain;

            // LFO for amplitude modulation (Fibonacci-timed!)
            const lfo = this.audioContext.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 1.0 / (fibNum * 2.0); // Slower LFO for smoother pulsing

            const lfoGain = this.audioContext.createGain();
            lfoGain.gain.value = baseGain * 0.5; // LFO depth (50% modulation)

            // Offset LFO so it modulates around the base gain value
            const lfoOffset = this.audioContext.createConstantSource();
            lfoOffset.offset.value = baseGain;

            // Connect LFO: lfo → lfoGain → gain.gain
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);
            lfoOffset.connect(gain.gain);

            // Connect main chain: osc → gain → masterGain
            osc.connect(gain);
            gain.connect(this.masterGain);

            // Start oscillators
            osc.start(now);
            lfo.start(now);
            lfoOffset.start(now);

            // Store references
            this.oscillators.push(osc);
            this.gainNodes.push(gain);
            this.lfoOscillators.push(lfo);
            this.lfoGains.push(lfoGain);
        }

        // Apply attack envelope to master gain (soft fade in)
        this.masterGain.gain.setValueAtTime(0, now);
        this.masterGain.gain.linearRampToValueAtTime(0.3, now + 1.0); // 1s attack to 30% volume

        this.isPlaying = true;
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
            this.gainNodes.forEach(gain => gain.disconnect());
            this.lfoGains.forEach(gain => gain.disconnect());

            // Clear arrays
            this.oscillators = [];
            this.gainNodes = [];
            this.lfoOscillators = [];
            this.lfoGains = [];

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
        this.harmonicCount = count;
        // Requires restart to add/remove oscillators
        if (this.isPlaying) {
            console.log('Restarting with', count, 'harmonics');
            this.stop();
            setTimeout(() => this.start(), 1200);
        }
    }

    generateFibonacci(n) {
        const fib = [1, 1];
        for (let i = 2; i < n; i++) {
            fib.push(fib[i-1] + fib[i-2]);
        }
        return fib.slice(0, n);
    }
}
