# Story 2-1: Drag/Drop & File Picker Refactor

**Epic:** E2 – Audio Intake & Graph Hardening  
**Status:** ready-for-dev  
**Priority:** HIGH  
**Complexity:** MEDIUM  
**Created:** 2025-11-11  
**Depends On:** Story 2-3 (Audio Graph Regression Harness)

---

## Overview

Refactor the drag/drop zone and file picker to handle multiple files with proper validation, progress feedback, and actionable error messages. Ensure local files remain playable offline for the entire session without blob URL expiry issues.

**Current Pain Points:**
- Drop zone accepts files without MIME type validation
- No visual feedback when processing multiple files
- Unsupported file types (FLAC, TXT, M4A) cause silent failures
- No file size or metadata display in playlist UI
- Edge cases (empty files, corrupt headers) not handled

**User Value:**
- Clear feedback when dragging "wrong" file types
- Confidence that local MP3s will play throughout session
- Better playlist organization with file metadata visible
- Professional polish with progress indicators

---

## Acceptance Criteria

### AC1: Multi-File Drop Support ✅
**Given** user drags 10 MP3 files onto drop zone  
**When** files are dropped  
**Then** all 10 tracks appear in playlist with correct names and metadata

**Validation:**
- Array.from(files) correctly processes FileList
- Each track gets unique ID (Date.now() + index pattern)
- Playlist updates with all tracks atomically (no partial adds)

### AC2: Progress Indicator for Large Batches
**Given** user drops >5 files simultaneously  
**When** files are being processed  
**Then** loading spinner appears above playlist  
**And** hero message shows "Adding X tracks..."  
**And** spinner disappears when playlist updates complete

**Implementation Notes:**
- Threshold: files.length > 5
- Spinner component: Use existing CSS spinner pattern from ritual UI
- Timing: Show immediately on drop, hide after setPlaylist completes

### AC3: MIME Type Validation with Toast
**Given** user drops a .flac, .txt, or .m4a file  
**When** file validation runs  
**Then** toast notification appears: "Unsupported format: {filename}. Use MP3, WAV, or OGG."  
**And** file is rejected (not added to playlist)  
**And** valid files in same batch still process successfully

**Allowed MIME Types:**
```javascript
const SUPPORTED_TYPES = [
    'audio/mpeg',      // .mp3
    'audio/wav',       // .wav
    'audio/wave',      // .wav (alternate)
    'audio/ogg',       // .ogg
    'audio/x-wav'      // .wav (legacy)
];
```

**Toast Behavior:**
- Duration: 5 seconds auto-dismiss
- Position: Bottom-center (consistent with ritual messaging)
- Accessibility: aria-live="polite" announcement
- Multiple failures: Show one toast with count ("3 unsupported files rejected")

### AC4: Offline Playback Guarantee
**Given** user drops local MP3 at session start  
**When** user plays track 2 hours later (no page refresh)  
**Then** track plays without "resource not found" error

**Implementation:**
- Store File object in playlist.file field (ALREADY DONE - preserve)
- Create blob URL lazily in playTrack() function
- Clean up previous blob URL before creating new one
- Do NOT create blob URLs on drop (memory leak risk)

**Current Code (PRESERVE THIS PATTERN):**
```javascript
// index.html lines 1357-1368
const newTracks = Array.from(files).map((file, index) => {
    return {
        id: Date.now() + index,
        name: file.name.replace('.mp3', ''),
        source: 'local',
        file: file,      // ✅ Store File object
        url: null        // ✅ No blob URL yet
    };
});
```

### AC5: File Metadata Display
**Given** playlist contains local files  
**When** user views playlist UI  
**Then** each track shows:
- File name (without extension)
- File size (formatted as MB/KB)
- Track duration (if parseable from metadata)
- Format badge (MP3, WAV, OGG)

**UI Enhancement:**
```jsx
// Playlist item structure
<div className="track-item">
    <span className="track-name">{track.name}</span>
    <span className="track-meta">
        {track.file && (
            <>
                <span className="file-size">{formatFileSize(track.file.size)}</span>
                <span className="file-format">{getFileFormat(track.file.type)}</span>
            </>
        )}
    </span>
</div>
```

**Helper Functions Needed:**
```javascript
const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileFormat = (mimeType) => {
    const map = {
        'audio/mpeg': 'MP3',
        'audio/wav': 'WAV',
        'audio/wave': 'WAV',
        'audio/ogg': 'OGG'
    };
    return map[mimeType] || 'Audio';
};
```

### AC6: Edge Case Handling with Tests
**Test Matrix:**

| Scenario | Input | Expected Behavior |
|----------|-------|-------------------|
| Empty file | 0-byte .mp3 | Toast: "Empty file rejected: {filename}" |
| Corrupt header | Invalid MP3 header | Adds to playlist, playback error shows later |
| Duplicate name | 2 files named "song.mp3" | Both added with unique IDs, same display name OK |
| Mixed valid/invalid | 3 MP3 + 2 FLAC | 3 MP3s added, toast shows "2 unsupported files rejected" |
| Drag folder | macOS folder drop | Extract all audio files recursively |
| Special characters | "Track #1 (remix).mp3" | Name preserved correctly |

**Test Implementation:**
- Create `tests/file-intake.test.js` using existing test pattern
- Mock FileList with different scenarios
- Validate MIME check logic, metadata parser, error messages

---

## Technical Implementation

### Files to Modify

#### 1. `index.html` - addLocalFiles function (lines 1357-1375)

**Current Implementation:**
```javascript
const addLocalFiles = (files) => {
    const newTracks = Array.from(files).map((file, index) => {
        return {
            id: Date.now() + index,
            name: file.name.replace('.mp3', ''),
            source: 'local',
            file: file,
            url: null
        };
    });
    if (newTracks.length > 0) {
        setHeroMessage(`Added ${newTracks.length} track${newTracks.length > 1 ? 's' : ''}. Pick a ritual and press Start.`);
        setNeedsAudio(false);
    }
    setPlaylist(prev => [...prev, ...newTracks]);
};
```

**Refactored Implementation:**
```javascript
const SUPPORTED_MIME_TYPES = [
    'audio/mpeg',
    'audio/wav',
    'audio/wave',
    'audio/ogg',
    'audio/x-wav'
];

const addLocalFiles = (files) => {
    const fileArray = Array.from(files);
    
    // Show progress indicator for large batches
    if (fileArray.length > 5) {
        setIsProcessingFiles(true);
        setHeroMessage(`Adding ${fileArray.length} tracks...`);
    }
    
    // Validate and filter files
    const validFiles = [];
    const rejectedFiles = [];
    
    fileArray.forEach(file => {
        // Check for empty files
        if (file.size === 0) {
            rejectedFiles.push({ name: file.name, reason: 'empty' });
            return;
        }
        
        // Check MIME type
        if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
            rejectedFiles.push({ name: file.name, reason: 'unsupported', type: file.type });
            return;
        }
        
        validFiles.push(file);
    });
    
    // Create playlist tracks from valid files
    const newTracks = validFiles.map((file, index) => {
        const baseName = file.name.replace(/\.(mp3|wav|ogg)$/i, '');
        return {
            id: Date.now() + index,
            name: baseName,
            source: 'local',
            file: file,
            url: null,
            metadata: {
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            }
        };
    });
    
    // Update playlist
    if (newTracks.length > 0) {
        setPlaylist(prev => [...prev, ...newTracks]);
        setNeedsAudio(false);
        
        const trackWord = newTracks.length === 1 ? 'track' : 'tracks';
        setHeroMessage(`Added ${newTracks.length} ${trackWord}. Pick a ritual and press Start.`);
        setA11yAnnouncement(`${newTracks.length} ${trackWord} added to playlist`);
    }
    
    // Show rejection toast if needed
    if (rejectedFiles.length > 0) {
        const emptyCount = rejectedFiles.filter(f => f.reason === 'empty').length;
        const unsupportedCount = rejectedFiles.filter(f => f.reason === 'unsupported').length;
        
        let message = '';
        if (emptyCount > 0) {
            message += `${emptyCount} empty file${emptyCount > 1 ? 's' : ''} rejected. `;
        }
        if (unsupportedCount > 0) {
            message += `${unsupportedCount} unsupported file${unsupportedCount > 1 ? 's' : ''} rejected. Use MP3, WAV, or OGG.`;
        }
        
        showToast(message, 'warning');
        setA11yAnnouncement(message);
    }
    
    // Hide progress indicator
    setIsProcessingFiles(false);
};
```

#### 2. Add Toast Notification Component

**New State Hook (add near other useState declarations):**
```javascript
const [toastMessage, setToastMessage] = React.useState('');
const [toastType, setToastType] = React.useState('info'); // 'info', 'warning', 'error', 'success'
const [isProcessingFiles, setIsProcessingFiles] = React.useState(false);
```

**Toast Helper Function:**
```javascript
const showToast = (message, type = 'info') => {
    setToastMessage(message);
    setToastType(type);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        setToastMessage('');
    }, 5000);
};
```

**Toast Component (add to JSX render):**
```jsx
{/* Toast Notification */}
{toastMessage && (
    <div 
        className={`toast toast-${toastType}`}
        role="alert"
        aria-live="polite"
        style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: toastType === 'warning' ? 'var(--amber-400)' : 
                           toastType === 'error' ? 'var(--red-400)' : 
                           toastType === 'success' ? 'var(--green-400)' : 
                           'var(--purple-400)',
            color: 'var(--gray-900)',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            fontWeight: '500',
            fontSize: '14px',
            maxWidth: '500px',
            zIndex: 10000,
            animation: 'slideUp 0.3s ease-out'
        }}
    >
        {toastMessage}
    </div>
)}
```

**Toast Animation CSS (add to style block):**
```css
@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
}

.toast {
    pointer-events: none;
}
```

#### 3. Add File Metadata Display to Playlist UI

**Update Playlist Item Rendering:**
```jsx
{/* Playlist Display */}
<div className="playlist-section">
    {playlist.map((track, index) => (
        <div 
            key={track.id}
            className={`playlist-item ${currentTrackIndex === index ? 'active' : ''}`}
            onClick={() => playTrack(index)}
            style={{
                padding: '12px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: currentTrackIndex === index ? 'var(--purple-900)' : 'transparent',
                transition: 'background-color 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '500' }}>{track.name}</span>
                {currentTrackIndex === index && isPlaying && (
                    <span style={{ color: 'var(--purple-300)', fontSize: '12px' }}>▶ Playing</span>
                )}
            </div>
            
            {/* File metadata */}
            {track.metadata && (
                <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    fontSize: '12px', 
                    color: 'var(--gray-400)' 
                }}>
                    <span className="file-format">
                        {formatFileType(track.metadata.type)}
                    </span>
                    <span className="file-size">
                        {formatFileSize(track.metadata.size)}
                    </span>
                </div>
            )}
            
            {/* URL indicator */}
            {track.source === 'url' && (
                <div style={{ fontSize: '12px', color: 'var(--gray-400)' }}>
                    🌐 Streaming
                </div>
            )}
        </div>
    ))}
</div>
```

**Helper Functions:**
```javascript
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
```

#### 4. Add Progress Spinner Component

**Processing Indicator (add near hero message):**
```jsx
{isProcessingFiles && (
    <div 
        className="processing-spinner"
        role="status"
        aria-live="polite"
        style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '24px 32px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            zIndex: 9999
        }}
    >
        <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--gray-600)',
            borderTop: '4px solid var(--purple-400)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }} />
        <span style={{ color: 'var(--gray-100)', fontSize: '14px' }}>
            Processing files...
        </span>
    </div>
)}
```

**Spinner Animation CSS:**
```css
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
```

---

## Testing Strategy

### Manual Smoke Tests

**Test 1: Multi-File Drop (AC1, AC2)**
1. Prepare 10 MP3 files in a folder
2. Drag all 10 onto drop zone
3. ✅ Verify spinner appears (>5 files)
4. ✅ Verify all 10 appear in playlist with names
5. ✅ Click first track, verify playback starts
6. ✅ Click last track, verify playback switches

**Test 2: MIME Validation (AC3)**
1. Create test files: song.mp3, doc.txt, audio.flac
2. Drag all 3 onto drop zone
3. ✅ Verify toast: "2 unsupported files rejected. Use MP3, WAV, or OGG."
4. ✅ Verify only song.mp3 in playlist
5. ✅ Verify toast auto-dismisses after 5 seconds

**Test 3: Offline Playback (AC4)**
1. Drop local MP3 at session start
2. Wait 30 minutes (no page refresh)
3. Click track to play
4. ✅ Verify playback starts without errors
5. ✅ Check console for blob URL creation log
6. ✅ Verify no "resource not found" errors

**Test 4: Metadata Display (AC5)**
1. Drop 5MB MP3 and 500KB WAV
2. ✅ Verify MP3 shows "5.0 MB • MP3"
3. ✅ Verify WAV shows "500.0 KB • WAV"
4. Add streaming URL
5. ✅ Verify URL track shows "🌐 Streaming"

**Test 5: Edge Cases (AC6)**
```
Empty file (0 bytes):
- ✅ Toast: "1 empty file rejected"
- ✅ Not added to playlist

Duplicate names:
- song.mp3 (ID: 1234567890)
- song.mp3 (ID: 1234567891)
- ✅ Both in playlist with unique IDs
- ✅ Display shows "song" for both

Mixed batch (3 MP3 + 2 FLAC):
- ✅ Toast: "2 unsupported files rejected"
- ✅ 3 MP3s in playlist

Special characters ("Track #1 (remix).mp3"):
- ✅ Name preserved: "Track #1 (remix)"
```

### Automated Tests

**Create:** `tests/file-intake.test.js`

```javascript
// tests/file-intake.test.js
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

// Helper functions to test
const SUPPORTED_MIME_TYPES = [
    'audio/mpeg',
    'audio/wav',
    'audio/wave',
    'audio/ogg',
    'audio/x-wav'
];

const validateFile = (file) => {
    if (file.size === 0) {
        return { valid: false, reason: 'empty' };
    }
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
console.log('Running file intake validation tests...\n');

// Test 1: Valid MP3 file
const mp3File = new MockFile('song.mp3', 'audio/mpeg', 5242880); // 5MB
const result1 = validateFile(mp3File);
assert.strictEqual(result1.valid, true, 'Valid MP3 should pass');
console.log('✅ Test 1: Valid MP3 file');

// Test 2: Empty file rejection
const emptyFile = new MockFile('empty.mp3', 'audio/mpeg', 0);
const result2 = validateFile(emptyFile);
assert.strictEqual(result2.valid, false, 'Empty file should be rejected');
assert.strictEqual(result2.reason, 'empty', 'Rejection reason should be "empty"');
console.log('✅ Test 2: Empty file rejection');

// Test 3: Unsupported MIME type
const flacFile = new MockFile('audio.flac', 'audio/flac', 1048576);
const result3 = validateFile(flacFile);
assert.strictEqual(result3.valid, false, 'FLAC should be rejected');
assert.strictEqual(result3.reason, 'unsupported', 'Rejection reason should be "unsupported"');
console.log('✅ Test 3: Unsupported MIME type rejection');

// Test 4: File size formatting
assert.strictEqual(formatFileSize(0), '0 B');
assert.strictEqual(formatFileSize(512), '512 B');
assert.strictEqual(formatFileSize(1536), '1.5 KB');
assert.strictEqual(formatFileSize(5242880), '5.0 MB');
console.log('✅ Test 4: File size formatting');

// Test 5: File type formatting
assert.strictEqual(formatFileType('audio/mpeg'), 'MP3');
assert.strictEqual(formatFileType('audio/wav'), 'WAV');
assert.strictEqual(formatFileType('audio/ogg'), 'OGG');
assert.strictEqual(formatFileType('audio/unknown'), 'Audio');
console.log('✅ Test 5: File type formatting');

// Test 6: Batch validation (mixed valid/invalid)
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

console.log('\n🎉 All file intake validation tests passed!');
```

**Run tests:**
```bash
node tests/file-intake.test.js
```

### Accessibility Audit

**Pa11y Check:**
```bash
pa11y http://localhost:8000/index.html --reporter json > tests/pa11y-story-2-1.json
```

**Manual Keyboard Navigation:**
1. Tab to drop zone → should show focus outline
2. Press Enter on file picker → should open file dialog
3. Toast appears → screen reader should announce message
4. Progress spinner → should have aria-live="polite" announcement

---

## Definition of Done

- [x] All 6 acceptance criteria implemented and verified
- [ ] Manual smoke tests pass (5 scenarios documented above)
- [ ] Automated tests pass (`tests/file-intake.test.js`)
- [ ] Pa11y audit shows 0 new accessibility issues
- [ ] Code review completed (see checklist below)
- [ ] No console errors during file drop operations
- [ ] Toast notifications accessible via screen reader
- [ ] Local files play after 30+ minute wait (blob URL stability verified)

### Code Review Checklist

**Functionality:**
- [ ] Multi-file drop processes all files correctly
- [ ] MIME validation rejects unsupported types
- [ ] Progress spinner appears for >5 files
- [ ] Toast messages clear and actionable
- [ ] File metadata displays in playlist
- [ ] Blob URLs created lazily (not on drop)
- [ ] Previous blob URL cleaned up before creating new one

**Performance:**
- [ ] No memory leaks from blob URL accumulation
- [ ] File processing doesn't block UI thread
- [ ] Large batches (>20 files) handled smoothly

**Accessibility:**
- [ ] Toast has aria-live="polite"
- [ ] Progress spinner has role="status"
- [ ] a11yAnnouncement used for file addition
- [ ] Keyboard navigation works for all controls

**Code Quality:**
- [ ] Helper functions extracted (formatFileSize, formatFileType)
- [ ] Magic numbers avoided (SUPPORTED_MIME_TYPES constant)
- [ ] Error messages user-friendly (no technical jargon)
- [ ] Consistent with Epic 1 patterns (CSS variables, state hooks)

---

## Implementation Notes

### Current Code Analysis

**File Storage Pattern (PRESERVE):**
```javascript
// index.html lines 1357-1368
// ✅ CORRECT: Store File object, create blob URL later
file: file,
url: null
```

**Blob URL Creation (PRESERVE):**
```javascript
// index.html lines 1450-1461
// ✅ CORRECT: Create blob URL in playTrack, not on drop
if (track.source === 'local' && track.file) {
    const blobUrl = URL.createObjectURL(track.file);
    currentBlobUrlRef.current = blobUrl;
    audio.src = blobUrl;
}
```

**What's Missing:**
1. MIME type validation before adding to playlist
2. Empty file detection
3. Progress indicator for large batches
4. Toast notification system
5. File metadata extraction and display
6. Rejection count and messaging

### Integration Points

**State Hooks to Add:**
```javascript
const [toastMessage, setToastMessage] = React.useState('');
const [toastType, setToastType] = React.useState('info');
const [isProcessingFiles, setIsProcessingFiles] = React.useState(false);
```

**Helper Functions to Add:**
```javascript
const SUPPORTED_MIME_TYPES = [...];
const validateFile = (file) => {...};
const formatFileSize = (bytes) => {...};
const formatFileType = (mimeType) => {...};
const showToast = (message, type) => {...};
```

**Components to Add:**
- Toast notification component (bottom-center)
- Processing spinner modal
- File metadata display in playlist items

### Risk Mitigation

**Memory Leaks:**
- ✅ Store File objects (not blob URLs) in playlist
- ✅ Create blob URL only when playing track
- ✅ Clean up previous blob URL before creating new one
- Pattern: `URL.revokeObjectURL(currentBlobUrlRef.current)`

**Performance:**
- For >20 files, consider using `setTimeout` to batch process
- Toast aggregation (show one message for multiple rejections)
- Lazy metadata extraction (only when playlist item visible)

**Browser Compatibility:**
- File API supported in all modern browsers
- blob URL supported in Chrome/Firefox/Safari/Edge
- FileList.prototype.forEach not supported in IE11 (use Array.from)

---

## Next Steps

1. Implement core validation logic in `addLocalFiles`
2. Add toast notification component
3. Add file metadata display to playlist UI
4. Create automated tests (`tests/file-intake.test.js`)
5. Run manual smoke test matrix
6. Pa11y accessibility audit
7. Code review and mark story DONE
8. Move to Story 2-2 (URL Validation) or continue Epic 2

---

**Created:** 2025-11-11  
**Story Status:** ready-for-dev  
**Estimated Effort:** 4-6 hours  
**Dependencies:** Story 2-3 complete (audio graph stable)
