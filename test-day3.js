// Day 3 Test Suite
// Run this in the browser console when on Day 3

function testDay3() {
    console.log('========================================');
    console.log('DAY 3 DIAGNOSTIC TEST');
    console.log('========================================\n');

    const results = {
        passed: [],
        failed: [],
        warnings: []
    };

    // Test 1: FibonacciChord class exists
    console.log('Test 1: FibonacciChord class exists');
    if (typeof FibonacciChord !== 'undefined') {
        results.passed.push('FibonacciChord class is defined');
        console.log('✓ PASS\n');
    } else {
        results.failed.push('FibonacciChord class not found - audio.js may not be loaded');
        console.log('✗ FAIL - audio.js not loaded\n');
    }

    // Test 2: FibonacciChord instance exists
    console.log('Test 2: FibonacciChord instance created');
    if (window.fibonacciChord) {
        results.passed.push('window.fibonacciChord instance exists');
        console.log('✓ PASS');
        console.log('  Instance:', window.fibonacciChord);
        console.log('  Is playing:', window.fibonacciChord.isPlaying);
        console.log('  Fundamental:', window.fibonacciChord.fundamental, 'Hz');
        console.log('  Harmonic count:', window.fibonacciChord.harmonicCount);
        console.log('  Global volume:', window.fibonacciChord.globalVolume);
        console.log('');
    } else {
        results.failed.push('window.fibonacciChord instance not created');
        console.log('✗ FAIL - Instance not created. Make sure you\'re on Day 3\n');
    }

    // Test 3: AudioContext state
    if (window.fibonacciChord && window.fibonacciChord.audioContext) {
        console.log('Test 3: AudioContext state');
        const state = window.fibonacciChord.audioContext.state;
        console.log('  State:', state);

        if (state === 'running') {
            results.passed.push('AudioContext is running');
            console.log('✓ PASS\n');
        } else if (state === 'suspended') {
            results.warnings.push('AudioContext is suspended (normal before first user interaction)');
            console.log('⚠ WARNING - Suspended (click Play Sound to resume)\n');
        } else {
            results.failed.push('AudioContext in unexpected state: ' + state);
            console.log('✗ FAIL - Unexpected state\n');
        }
    } else {
        console.log('Test 3: AudioContext state');
        results.failed.push('AudioContext not initialized');
        console.log('✗ FAIL - No AudioContext\n');
    }

    // Test 4: Shader program
    console.log('Test 4: WebGL shader program');
    if (window.shaderProgram && window.shaderProgram.program) {
        results.passed.push('Shader program exists');
        console.log('✓ PASS');
        console.log('  Program:', window.shaderProgram.program);
        console.log('  Uniforms:', Object.keys(window.shaderProgram.uniforms));
        console.log('');
    } else {
        results.failed.push('Shader program not loaded');
        console.log('✗ FAIL - Shader not loaded\n');
    }

    // Test 5: Check for required uniforms
    if (window.shaderProgram && window.shaderProgram.uniforms) {
        console.log('Test 5: Required uniforms for Day 3');
        const required = ['time', 'resolution', 'amplitudes', 'harmonicCount', 'rotation', 'sketchiness', 'lineWeight', 'glowIntensity'];
        const found = Object.keys(window.shaderProgram.uniforms);
        const missing = required.filter(u => !found.includes(u));

        if (missing.length === 0) {
            results.passed.push('All required uniforms found');
            console.log('✓ PASS');
            console.log('  Found:', found.join(', '));
            console.log('');
        } else {
            results.failed.push('Missing uniforms: ' + missing.join(', '));
            console.log('✗ FAIL');
            console.log('  Missing:', missing.join(', '));
            console.log('  Found:', found.join(', '));
            console.log('');
        }
    } else {
        console.log('Test 5: Required uniforms for Day 3');
        results.failed.push('Cannot check uniforms - shader not loaded');
        console.log('✗ FAIL - No shader loaded\n');
    }

    // Test 6: Canvas dimensions
    console.log('Test 6: Canvas dimensions');
    const canvas = document.getElementById('glCanvas');
    if (canvas) {
        console.log('  Width:', canvas.width, 'Height:', canvas.height);
        console.log('  Client width:', canvas.clientWidth, 'Client height:', canvas.clientHeight);

        if (canvas.width > 0 && canvas.height > 0) {
            results.passed.push('Canvas has valid dimensions');
            console.log('✓ PASS\n');
        } else {
            results.failed.push('Canvas has zero dimensions');
            console.log('✗ FAIL - Canvas dimensions are 0\n');
        }
    } else {
        results.failed.push('Canvas element not found');
        console.log('✗ FAIL - Canvas not found\n');
    }

    // Test 7: Current day
    console.log('Test 7: Current day is 3');
    if (window.currentDay === 3) {
        results.passed.push('Current day is 3');
        console.log('✓ PASS\n');
    } else {
        results.failed.push('Not on Day 3 (current day: ' + window.currentDay + ')');
        console.log('✗ FAIL - Wrong day! Navigate to /?day=3\n');
    }

    // Test 8: Audio toggle button
    console.log('Test 8: Audio toggle button');
    const audioToggle = document.getElementById('audioToggle');
    if (audioToggle) {
        results.passed.push('Audio toggle button exists');
        console.log('✓ PASS');
        console.log('  Text:', audioToggle.textContent);
        console.log('  Visible:', audioToggle.offsetParent !== null);
        console.log('');
    } else {
        results.failed.push('Audio toggle button not found');
        console.log('✗ FAIL - Button not found\n');
    }

    // Summary
    console.log('========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    console.log('Passed:', results.passed.length);
    console.log('Failed:', results.failed.length);
    console.log('Warnings:', results.warnings.length);
    console.log('');

    if (results.failed.length > 0) {
        console.log('FAILURES:');
        results.failed.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
        console.log('');
    }

    if (results.warnings.length > 0) {
        console.log('WARNINGS:');
        results.warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
        console.log('');
    }

    if (results.failed.length === 0) {
        console.log('✓ All tests passed! System should be working.');
        console.log('If you still have issues, check the main console for runtime errors.');
    } else {
        console.log('✗ Some tests failed. See above for details.');
    }

    console.log('========================================\n');

    return {
        passed: results.passed.length,
        failed: results.failed.length,
        warnings: results.warnings.length,
        details: results
    };
}

// Auto-run if we're on Day 3
if (typeof window !== 'undefined' && window.currentDay === 3) {
    console.log('Day 3 test suite loaded. Run testDay3() to diagnose issues.');
}
