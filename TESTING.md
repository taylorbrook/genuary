# Day 3 Testing Guide

## How to Test

1. Start a local server: `python3 -m http.server 8000`
2. Open browser to: `http://localhost:8000/?day=3`
3. Open browser console (F12 or Cmd+Option+I)
4. Watch for test output prefixed with `[AUDIO TEST]` and `[VISUAL TEST]`

## What to Look For

### Audio System Tests

When the page loads on Day 3, you should see:
```
[AUDIO TEST] Switching to day: 3
[AUDIO TEST] FibonacciChord class exists: true
[AUDIO TEST] Day 3 initialization starting...
[AUDIO TEST] Creating new FibonacciChord instance
[AUDIO TEST] AudioContext created, state: suspended (or running)
[AUDIO TEST] FibonacciChord audio system initialized
[AUDIO TEST] Master gain: [GainNode object]
[AUDIO TEST] Reverb: [GainNode object]
[AUDIO TEST] FibonacciChord initialized
[AUDIO TEST] Audio parameters set: {fundamental: 40, harmonicCount: 5, globalVolume: 0.3}
```

When you click the "Play Sound" button:
```
[AUDIO TEST] Audio toggle clicked
[AUDIO TEST] window.fibonacciChord exists: true
[AUDIO TEST] fibonacciChord.isPlaying: false
[AUDIO TEST] Starting audio...
[AUDIO TEST] start() called, isPlaying: false
[AUDIO TEST] Resuming suspended AudioContext (if needed)
[AUDIO TEST] Starting Fibonacci chord with harmonics: [1, 1, 2, 3, 5]
[AUDIO TEST] Fundamental: 40 Hz
[AUDIO TEST] Global volume: 0.3
```

### Visual System Tests

When Day 3 loads:
```
[VISUAL TEST] Loading shaders: shaders/vertex.glsl shaders/day3-fragment.glsl
[VISUAL TEST] Shaders loaded, compiling...
[VISUAL TEST] Shaders compiled successfully
[VISUAL TEST] Program linked successfully
[VISUAL TEST] Uniforms found: [list of all uniforms]
```

During animation (once per second):
```
[VISUAL TEST] Amplitudes: [0, 0, 0, 0, 0] (when audio not playing)
[VISUAL TEST] Amplitudes: [0.2, 0.18, 0.15, ...] (when audio is playing)
[VISUAL TEST] Harmonic count: 5
```

## Common Issues to Check

### Issue: Audio not playing

**Check console for:**
- Is `FibonacciChord class exists: false`? → audio.js not loaded
- Is `window.fibonacciChord exists: false`? → Instance not created
- Is AudioContext state "suspended"? → Browser autoplay policy blocked it
- Are oscillators being created? → Should see messages in start()

**If you see an error:**
- Copy the full error message
- Note which line number it occurs on

### Issue: Visuals not rendering

**Check console for:**
- Are shaders compiling? → Should see "Shaders compiled successfully"
- Is program linking? → Should see "Program linked successfully"
- What uniforms are found? → Should include: time, resolution, amplitudes, harmonicCount
- Are amplitudes being passed? → Should see amplitude values updating

**Visual debugging:**
- Canvas should be visible (not hidden)
- Canvas should have non-zero dimensions
- WebGL context should exist

### Issue: Interval ratios slider not working

**Expected behavior:**
- Slider shows value (2-12)
- Moving slider should call setHarmonicCount()
- Audio should fade in/out new harmonics smoothly (300ms)

## Manual Tests

### Test 1: Basic Audio Playback
1. Load Day 3
2. Click "▶ Play Sound"
3. ✓ Should hear low drone sound
4. ✓ Button should change to "⏸ Pause Sound"

### Test 2: Fundamental Frequency
1. Start audio
2. Move "Fundamental Frequency" slider
3. ✓ Pitch should change in real-time
4. ✓ No clicks or pops

### Test 3: Harmonic Count
1. Start audio
2. Move "Interval Ratios" slider up
3. ✓ New harmonics should fade in (300ms)
4. Move slider down
5. ✓ Higher harmonics should fade out (300ms)

### Test 4: Global Volume
1. Start audio
2. Move "Global Volume" slider
3. ✓ Overall volume should change smoothly
4. ✓ No sudden jumps

### Test 5: Visual Response
1. Start audio
2. ✓ Should see circles/shapes on canvas
3. ✓ Shapes should pulse/glow with audio
4. ✓ Moving harmonic count slider should show different number of shapes

## Expected Visual Appearance

- **Background:** Warm tan/paper color (rgb(0.95, 0.93, 0.88))
- **Shapes:** Dark sketchy circles arranged in Fibonacci spiral
- **Glow:** Blue glow (rgb(0.3, 0.6, 0.9)) when audio is playing
- **Spiral line:** Golden color (rgb(0.8, 0.6, 0.2))

## Next Steps if Tests Fail

1. **Copy all console output** from page load to reproduction of the bug
2. **Note which test failed** (audio/visual/both)
3. **Describe what you see** vs what you expect
4. **Include any error messages** (even if they seem unrelated)

This information will help debug the specific issue quickly.
