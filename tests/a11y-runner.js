/**
 * Accessibility Testing Runner - Story 6-3
 * Runs pa11y against a localhost build URL
 * Fails CI if accessibility errors > 0
 *
 * Usage: npm run test:a11y
 * Requires: A running server on localhost (e.g., npx serve .)
 */

const pa11y = require('pa11y');

// Configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000';
const FAIL_ON_ERROR = true;

async function runAccessibilityTests() {
    console.log('='.repeat(60));
    console.log('Accessibility Testing (pa11y)');
    console.log('='.repeat(60));
    console.log(`Testing URL: ${TEST_URL}`);
    console.log('');

    try {
        // Run pa11y with WCAG 2.1 AA standard
        const results = await pa11y(TEST_URL, {
            standard: 'WCAG2AA',
            runners: ['axe'], // Use axe-core for additional rules
            includeWarnings: true,
            includeNotices: false,
            timeout: 30000,
            wait: 1000, // Wait for page to fully load
            chromeLaunchConfig: {
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        // Count issues by type
        const errors = results.issues.filter(i => i.type === 'error');
        const warnings = results.issues.filter(i => i.type === 'warning');

        console.log('Results Summary:');
        console.log('-'.repeat(40));
        console.log(`Errors:   ${errors.length}`);
        console.log(`Warnings: ${warnings.length}`);
        console.log('');

        // Display errors
        if (errors.length > 0) {
            console.log('ERRORS (must fix):');
            console.log('-'.repeat(40));
            errors.forEach((issue, index) => {
                console.log(`\n${index + 1}. ${issue.message}`);
                console.log(`   Code: ${issue.code}`);
                console.log(`   Context: ${issue.context}`);
                console.log(`   Selector: ${issue.selector}`);
            });
            console.log('');
        }

        // Display warnings (informational)
        if (warnings.length > 0) {
            console.log('WARNINGS (review recommended):');
            console.log('-'.repeat(40));
            warnings.slice(0, 5).forEach((issue, index) => {
                console.log(`\n${index + 1}. ${issue.message}`);
                console.log(`   Selector: ${issue.selector}`);
            });
            if (warnings.length > 5) {
                console.log(`\n... and ${warnings.length - 5} more warnings`);
            }
            console.log('');
        }

        // Exit status
        console.log('='.repeat(60));
        if (errors.length > 0) {
            console.log('FAIL: Accessibility errors found');
            console.log(`Fix ${errors.length} error(s) before merge`);
            if (FAIL_ON_ERROR) {
                process.exit(1);
            }
        } else {
            console.log('PASS: No accessibility errors');
            console.log(`(${warnings.length} warnings logged but not blocking)`);
        }
        console.log('='.repeat(60));

    } catch (error) {
        console.error('Error running accessibility tests:', error.message);
        console.log('');
        console.log('Troubleshooting:');
        console.log('1. Ensure a server is running on', TEST_URL);
        console.log('2. Try: npx serve . (then run this script)');
        console.log('3. Or set TEST_URL env var to your server address');
        process.exit(1);
    }
}

// Run tests
runAccessibilityTests();
