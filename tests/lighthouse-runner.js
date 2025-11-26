/**
 * Lighthouse Audit Runner - Story 6-3
 * Runs Lighthouse PWA and Accessibility audits
 * Reports scores and saves results as artifacts
 *
 * Usage: npm run lighthouse
 * Requires: A running server on localhost (e.g., npx serve .)
 *
 * Score Thresholds (from AC6.3.2, AC6.3.3):
 * - Accessibility: >= 95
 * - PWA: >= 90
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './lighthouse-reports';
const ACCESSIBILITY_THRESHOLD = 95;
const PWA_THRESHOLD = 90;

async function runLighthouseAudit() {
    console.log('='.repeat(60));
    console.log('Lighthouse Audit (PWA + Accessibility)');
    console.log('='.repeat(60));
    console.log(`Testing URL: ${TEST_URL}`);
    console.log('');

    let chrome;

    try {
        // Launch Chrome
        chrome = await chromeLauncher.launch({
            chromeFlags: ['--headless', '--no-sandbox', '--disable-setuid-sandbox']
        });

        // Configure Lighthouse
        const options = {
            logLevel: 'error',
            output: ['json', 'html'],
            onlyCategories: ['accessibility', 'pwa'],
            port: chrome.port
        };

        // Run Lighthouse
        console.log('Running Lighthouse audit...');
        const runnerResult = await lighthouse(TEST_URL, options);

        // Extract scores
        const accessibilityScore = Math.round(runnerResult.lhr.categories.accessibility.score * 100);
        const pwaScore = Math.round(runnerResult.lhr.categories.pwa.score * 100);

        // Display results
        console.log('');
        console.log('Results Summary:');
        console.log('-'.repeat(40));
        console.log(`Accessibility Score: ${accessibilityScore}/100 (threshold: ${ACCESSIBILITY_THRESHOLD})`);
        console.log(`PWA Score:          ${pwaScore}/100 (threshold: ${PWA_THRESHOLD})`);
        console.log('');

        // Save reports
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const jsonPath = path.join(OUTPUT_DIR, `lighthouse-${timestamp}.json`);
        const htmlPath = path.join(OUTPUT_DIR, `lighthouse-${timestamp}.html`);

        fs.writeFileSync(jsonPath, runnerResult.report[0]);
        fs.writeFileSync(htmlPath, runnerResult.report[1]);

        console.log('Reports saved:');
        console.log(`  JSON: ${jsonPath}`);
        console.log(`  HTML: ${htmlPath}`);
        console.log('');

        // Display key audit results
        console.log('Key Audit Details:');
        console.log('-'.repeat(40));

        // Accessibility audits
        const a11yAudits = runnerResult.lhr.categories.accessibility.auditRefs;
        const failingA11y = a11yAudits.filter(ref => {
            const audit = runnerResult.lhr.audits[ref.id];
            return audit && audit.score !== null && audit.score < 1;
        });

        if (failingA11y.length > 0) {
            console.log('\nAccessibility issues:');
            failingA11y.slice(0, 5).forEach(ref => {
                const audit = runnerResult.lhr.audits[ref.id];
                console.log(`  - ${audit.title}`);
            });
            if (failingA11y.length > 5) {
                console.log(`  ... and ${failingA11y.length - 5} more`);
            }
        } else {
            console.log('\nAccessibility: All audits passed');
        }

        // PWA audits
        const pwaAudits = runnerResult.lhr.categories.pwa.auditRefs;
        const failingPwa = pwaAudits.filter(ref => {
            const audit = runnerResult.lhr.audits[ref.id];
            return audit && audit.score !== null && audit.score < 1;
        });

        if (failingPwa.length > 0) {
            console.log('\nPWA issues:');
            failingPwa.slice(0, 5).forEach(ref => {
                const audit = runnerResult.lhr.audits[ref.id];
                console.log(`  - ${audit.title}`);
            });
            if (failingPwa.length > 5) {
                console.log(`  ... and ${failingPwa.length - 5} more`);
            }
        } else {
            console.log('\nPWA: All audits passed');
        }

        // Exit status
        console.log('');
        console.log('='.repeat(60));

        let failed = false;

        if (accessibilityScore < ACCESSIBILITY_THRESHOLD) {
            console.log(`FAIL: Accessibility score ${accessibilityScore} < ${ACCESSIBILITY_THRESHOLD}`);
            failed = true;
        }

        if (pwaScore < PWA_THRESHOLD) {
            console.log(`FAIL: PWA score ${pwaScore} < ${PWA_THRESHOLD}`);
            failed = true;
        }

        if (failed) {
            console.log('');
            console.log('Fix issues before merge to maintain quality standards');
            process.exit(1);
        } else {
            console.log('PASS: All score thresholds met');
        }

        console.log('='.repeat(60));

    } catch (error) {
        console.error('Error running Lighthouse audit:', error.message);
        console.log('');
        console.log('Troubleshooting:');
        console.log('1. Ensure a server is running on', TEST_URL);
        console.log('2. Try: npx serve . (then run this script)');
        console.log('3. Or set TEST_URL env var to your server address');
        console.log('4. Ensure Chrome/Chromium is installed');
        process.exit(1);
    } finally {
        if (chrome) {
            await chrome.kill();
        }
    }
}

// Run audit
runLighthouseAudit();
