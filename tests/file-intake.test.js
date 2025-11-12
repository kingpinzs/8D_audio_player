// tests/file-intake.test.js
// File intake validation tests for Story 2-1

const assert = require('assert');

// Mock File object
class MockFile {
    constructor(name, type, size) {
        this.name = name;
        this.type = type;
        this.size = size;
        this.lastModified = Date.now();
    }
}

// Helper functions (copy from implementation)
const SUPPORTED_MIME_TYPES = [
    'audio/mpeg',      // .mp3
    'audio/wav',       // .wav
    'audio/wave',      // .wav (alternate)
    'audio/ogg',       // .ogg
    'audio/x-wav'      // .wav (legacy)
];

const validateFile = (file) => {
    // Check for empty files
    if (file.size === 0) {
        return { valid: false, reason: 'empty' };
    }
    
    // Check MIME type
    if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
        return { valid: false, reason: 'unsupported' };
    }
    
    return { valid: true };
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatFileType = (mimeType) => {
    const typeMap = {
        'audio/mpeg': 'MP3',
        'audio/wav': 'WAV',
        'audio/wave': 'WAV',
        'audio/ogg': 'OGG',
        'audio/x-wav': 'WAV'
    };
    return typeMap[mimeType] || 'Audio';
};

// Test Suite
console.log('🧪 Running file intake validation tests...\n');

let testsPassed = 0;
let testsFailed = 0;

// Test 1: Valid MP3 file
try {
    const mp3File = new MockFile('song.mp3', 'audio/mpeg', 5242880);
    const result1 = validateFile(mp3File);
    assert.strictEqual(result1.valid, true, 'Valid MP3 should pass');
    console.log('✅ Test 1: Valid MP3 file');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 1 FAILED:', err.message);
    testsFailed++;
}

// Test 2: Empty file rejection
try {
    const emptyFile = new MockFile('empty.mp3', 'audio/mpeg', 0);
    const result2 = validateFile(emptyFile);
    assert.strictEqual(result2.valid, false, 'Empty file should be rejected');
    assert.strictEqual(result2.reason, 'empty', 'Rejection reason should be "empty"');
    console.log('✅ Test 2: Empty file rejection');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 2 FAILED:', err.message);
    testsFailed++;
}

// Test 3: Unsupported MIME type
try {
    const flacFile = new MockFile('audio.flac', 'audio/flac', 1048576);
    const result3 = validateFile(flacFile);
    assert.strictEqual(result3.valid, false, 'FLAC should be rejected');
    assert.strictEqual(result3.reason, 'unsupported', 'Rejection reason should be "unsupported"');
    console.log('✅ Test 3: Unsupported MIME type rejection');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 3 FAILED:', err.message);
    testsFailed++;
}

// Test 4: File size formatting
try {
    assert.strictEqual(formatFileSize(0), '0 B');
    assert.strictEqual(formatFileSize(512), '512 B');
    assert.strictEqual(formatFileSize(1536), '1.5 KB');
    assert.strictEqual(formatFileSize(5242880), '5.0 MB');
    console.log('✅ Test 4: File size formatting');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 4 FAILED:', err.message);
    testsFailed++;
}

// Test 5: File type formatting
try {
    assert.strictEqual(formatFileType('audio/mpeg'), 'MP3');
    assert.strictEqual(formatFileType('audio/wav'), 'WAV');
    assert.strictEqual(formatFileType('audio/ogg'), 'OGG');
    assert.strictEqual(formatFileType('audio/unknown'), 'Audio');
    console.log('✅ Test 5: File type formatting');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 5 FAILED:', err.message);
    testsFailed++;
}

// Test 6: Batch validation (mixed valid/invalid)
try {
    const files = [
        new MockFile('song1.mp3', 'audio/mpeg', 3145728),
        new MockFile('song2.wav', 'audio/wav', 2097152),
        new MockFile('doc.txt', 'text/plain', 1024),
        new MockFile('audio.flac', 'audio/flac', 4194304),
        new MockFile('empty.mp3', 'audio/mpeg', 0)
    ];

    const validFiles = files.filter(f => validateFile(f).valid);
    const rejectedFiles = files.filter(f => !validateFile(f).valid);

    assert.strictEqual(validFiles.length, 2, 'Should accept 2 valid files');
    assert.strictEqual(rejectedFiles.length, 3, 'Should reject 3 files');
    console.log('✅ Test 6: Batch validation (2 valid, 3 rejected)');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 6 FAILED:', err.message);
    testsFailed++;
}

// Test 7: WAV alternate MIME type
try {
    const wavFile = new MockFile('audio.wav', 'audio/wave', 2097152);
    const result = validateFile(wavFile);
    assert.strictEqual(result.valid, true, 'WAV alternate MIME type should pass');
    console.log('✅ Test 7: WAV alternate MIME type support');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 7 FAILED:', err.message);
    testsFailed++;
}

// Test 8: OGG file validation
try {
    const oggFile = new MockFile('audio.ogg', 'audio/ogg', 1048576);
    const result = validateFile(oggFile);
    assert.strictEqual(result.valid, true, 'OGG file should pass');
    console.log('✅ Test 8: OGG file validation');
    testsPassed++;
} catch (err) {
    console.error('❌ Test 8 FAILED:', err.message);
    testsFailed++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results: ${testsPassed} passed, ${testsFailed} failed`);

if (testsFailed === 0) {
    console.log('🎉 All file intake validation tests passed!');
    process.exit(0);
} else {
    console.log('❌ Some tests failed. Please review the errors above.');
    process.exit(1);
}
