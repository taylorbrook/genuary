// Playwright test to run Day 3 diagnostics
const { chromium } = require('playwright');

(async () => {
    console.log('Starting browser automation test...\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capture all console messages
    const consoleMessages = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleMessages.push(text);
        console.log(`[BROWSER CONSOLE] ${text}`);
    });

    // Capture errors
    page.on('pageerror', error => {
        console.error(`[BROWSER ERROR] ${error.message}`);
    });

    try {
        console.log('Navigating to http://localhost:8000/?day=3\n');
        await page.goto('http://localhost:8000/?day=3', { waitUntil: 'networkidle' });

        // Wait for page to fully load
        await page.waitForTimeout(2000);

        console.log('\n=== Running testDay3() function ===\n');

        // Run the test function and get results
        const testResults = await page.evaluate(() => {
            if (typeof testDay3 === 'function') {
                return testDay3();
            } else {
                return { error: 'testDay3 function not found' };
            }
        });

        console.log('\n=== Test Results ===');
        console.log(JSON.stringify(testResults, null, 2));

        // Try to click the play button and see what happens
        console.log('\n=== Testing Audio Button ===\n');
        const audioButton = await page.locator('#audioToggle');
        const buttonExists = await audioButton.count() > 0;

        if (buttonExists) {
            console.log('Audio button found, clicking...');
            await audioButton.click();
            await page.waitForTimeout(1000);
            console.log('Button clicked, waiting for audio to start...');
        } else {
            console.log('Audio button NOT found!');
        }

        // Check canvas visibility
        console.log('\n=== Canvas Check ===');
        const canvasInfo = await page.evaluate(() => {
            const canvas = document.getElementById('glCanvas');
            if (!canvas) return { found: false };

            return {
                found: true,
                width: canvas.width,
                height: canvas.height,
                clientWidth: canvas.clientWidth,
                clientHeight: canvas.clientHeight,
                visible: canvas.offsetParent !== null
            };
        });
        console.log('Canvas info:', canvasInfo);

        // Get current shader info
        console.log('\n=== Shader Info ===');
        const shaderInfo = await page.evaluate(() => {
            if (!window.shaderProgram) return { found: false };

            return {
                found: true,
                programExists: !!window.shaderProgram.program,
                uniforms: Object.keys(window.shaderProgram.uniforms || {}),
                canvasWidth: window.shaderProgram.canvas?.width,
                canvasHeight: window.shaderProgram.canvas?.height
            };
        });
        console.log('Shader info:', shaderInfo);

        // Get audio system info
        console.log('\n=== Audio System Info ===');
        const audioInfo = await page.evaluate(() => {
            if (!window.fibonacciChord) return { found: false };

            return {
                found: true,
                isPlaying: window.fibonacciChord.isPlaying,
                fundamental: window.fibonacciChord.fundamental,
                harmonicCount: window.fibonacciChord.harmonicCount,
                globalVolume: window.fibonacciChord.globalVolume,
                audioContextState: window.fibonacciChord.audioContext?.state,
                oscillatorCount: window.fibonacciChord.oscillators?.length || 0
            };
        });
        console.log('Audio info:', audioInfo);

        console.log('\n=== All Console Messages ===');
        console.log(`Total messages: ${consoleMessages.length}`);

        // Keep browser open for a bit to observe
        console.log('\nKeeping browser open for 5 seconds to observe...');
        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('Test failed with error:', error.message);
        console.error(error.stack);
    } finally {
        await browser.close();
        console.log('\nBrowser closed.');
    }
})();
