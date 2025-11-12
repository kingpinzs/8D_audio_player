// tests/url-validation.test.js
// URL validation tests for Story 2-2

const assert = require('assert');

// Helper functions (copy from implementation)
const isValidUrl = (str) => {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

const detectUnsupportedService = (url) => {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
        return { service: 'YouTube', supported: false };
    }
    if (urlLower.includes('spotify.com')) {
        return { service: 'Spotify', supported: false };
    }
    return { supported: true };
};

// Test Suite
console.log('🧪 Running URL validation tests...\n');

let testsPassed = 0;
let testsFailed = 0;

// Test 1: Valid HTTP URL
try {
    const validHttp = isValidUrl('http://example.com/song.mp3');
    assert.strictEqual(validHttp, true, 'Valid HTTP URL should pass');
    console.log('✅ Test 1: Valid HTTP URL');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 1 FAILED:', err.message);
    testsFailed++;
}

// Test 2: Valid HTTPS URL
try {
    const validHttps = isValidUrl('https://example.com/song.mp3');
    assert.strictEqual(validHttps, true, 'Valid HTTPS URL should pass');
    console.log('✅ Test 2: Valid HTTPS URL');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 2 FAILED:', err.message);
    testsFailed++;
}

// Test 3: Invalid URL (no protocol)
try {
    const invalidNoProtocol = isValidUrl('example.com/song.mp3');
    assert.strictEqual(invalidNoProtocol, false, 'URL without protocol should fail');
    console.log('✅ Test 3: Invalid URL (no protocol)');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 3 FAILED:', err.message);
    testsFailed++;
}

// Test 4: Invalid URL (malformed)
try {
    const invalidMalformed = isValidUrl('not a url');
    assert.strictEqual(invalidMalformed, false, 'Malformed URL should fail');
    console.log('✅ Test 4: Invalid URL (malformed)');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 4 FAILED:', err.message);
    testsFailed++;
}

// Test 5: YouTube detection (full URL)
try {
    const youtubeCheck = detectUnsupportedService('https://www.youtube.com/watch?v=abc123');
    assert.strictEqual(youtubeCheck.supported, false, 'YouTube should be unsupported');
    assert.strictEqual(youtubeCheck.service, 'YouTube', 'Service should be YouTube');
    console.log('✅ Test 5: YouTube URL detection (full)');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 5 FAILED:', err.message);
    testsFailed++;
}

// Test 6: YouTube detection (short URL)
try {
    const youtubeShort = detectUnsupportedService('https://youtu.be/abc123');
    assert.strictEqual(youtubeShort.supported, false, 'YouTube short URL should be unsupported');
    assert.strictEqual(youtubeShort.service, 'YouTube', 'Service should be YouTube');
    console.log('✅ Test 6: YouTube short URL detection');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 6 FAILED:', err.message);
    testsFailed++;
}

// Test 7: Spotify detection
try {
    const spotifyCheck = detectUnsupportedService('https://open.spotify.com/track/abc123');
    assert.strictEqual(spotifyCheck.supported, false, 'Spotify should be unsupported');
    assert.strictEqual(spotifyCheck.service, 'Spotify', 'Service should be Spotify');
    console.log('✅ Test 7: Spotify URL detection');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 7 FAILED:', err.message);
    testsFailed++;
}

// Test 8: Valid streaming URL (not YouTube/Spotify)
try {
    const validStream = detectUnsupportedService('https://example.com/stream.mp3');
    assert.strictEqual(validStream.supported, true, 'Regular MP3 URL should be supported');
    console.log('✅ Test 8: Regular MP3 URL supported');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 8 FAILED:', err.message);
    testsFailed++;
}

// Test 9: FTP protocol (unsupported)
try {
    const ftpUrl = isValidUrl('ftp://example.com/song.mp3');
    assert.strictEqual(ftpUrl, false, 'FTP URLs should be rejected');
    console.log('✅ Test 9: FTP protocol rejection');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 9 FAILED:', err.message);
    testsFailed++;
}

// Test 10: Case insensitive service detection
try {
    const youtubeUpper = detectUnsupportedService('https://WWW.YOUTUBE.COM/watch?v=abc');
    assert.strictEqual(youtubeUpper.supported, false, 'Case insensitive YouTube detection');
    console.log('✅ Test 10: Case insensitive service detection');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 10 FAILED:', err.message);
    testsFailed++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results: ${testsPassed} passed, ${testsFailed} failed`);

if (testsFailed === 0) {
    console.log('🎉 All URL validation tests passed!');
    process.exit(0);
} else {
    console.log('❌ Some tests failed. Please review the errors above.');
    process.exit(1);
}
