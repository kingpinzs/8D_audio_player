# Story 2-2: Streaming URL Validation & Messaging

**Epic:** E2 – Audio Intake & Graph Hardening  
**Status:** ready-for-dev  
**Priority:** HIGH  
**Complexity:** LOW  
**Created:** 2025-11-11  
**Depends On:** Story 2-3 (Audio Graph Regression Harness)

---

## Overview

Implement URL input validation with HEAD/GET requests to detect CORS blocks, unreachable streams, and unsupported services. Surface actionable error messages while retaining other playlist items, ensuring users understand why a stream failed and what they can do about it.

**Current Pain Points:**
- URLs added without validation, errors only surface during playback
- CORS failures show cryptic browser errors
- YouTube/Spotify URLs fail silently with no guidance
- Failed streams break entire playback flow
- No timeout handling for unreachable URLs

**User Value:**
- Immediate feedback when adding invalid URLs
- Clear guidance for CORS-blocked streams
- Understanding of which services require proxies
- Confidence that other tracks will still play

---

## Acceptance Criteria

### AC1: URL Format Validation ✅
**Given** user enters URL in stream input field  
**When** URL is submitted  
**Then** basic format check runs before network request  
**And** invalid formats show error message immediately

**Validation Rules:**
```javascript
// Must start with http:// or https://
// Must have valid domain structure
const isValidUrl = (str) => {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};
```

**Error Messages:**
- Empty input: (ignored silently)
- Malformed URL: "Invalid URL format. Use: https://example.com/song.mp3"

### AC2: HEAD Request Confirms Reachability ✅
**Given** URL passes format validation  
**When** validation runs  
**Then** HEAD request sent with 5-second timeout  
**And** 200-299 status allows URL to be added  
**And** 404/500 status shows error toast

**Implementation:**
```javascript
const validateStreamUrl = async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
        const response = await fetch(url, {
            method: 'HEAD',
            mode: 'cors',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
            return { valid: true, url };
        } else {
            return { 
                valid: false, 
                reason: 'unreachable',
                status: response.status 
            };
        }
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            return { valid: false, reason: 'timeout' };
        }
        return { valid: false, reason: 'cors', error: err };
    }
};
```

### AC3: CORS Error Guidance ✅
**Given** URL triggers CORS error (TypeError in fetch)  
**When** validation completes  
**Then** toast shows: "Stream blocked by CORS. Use direct MP3 link or enable server CORS."  
**And** URL is NOT added to playlist  
**And** aria-live announces error for screen readers

### AC4: YouTube/Spotify Detection ✅
**Given** URL contains youtube.com, youtu.be, or spotify.com  
**When** validation runs  
**Then** toast shows: "YouTube/Spotify playback requires authenticated proxy. See documentation."  
**And** URL is NOT added to playlist  
**And** Documentation link provided (if applicable)

**Detection:**
```javascript
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
```

### AC5: Failed Stream Isolation ✅
**Given** playlist contains 3 tracks: MP3, valid URL, invalid URL  
**When** invalid URL fails validation  
**Then** other 2 tracks remain playable  
**And** playback continues to next track if invalid URL was playing  
**And** no "playlist empty" error shown

### AC6: Test Matrix Coverage ✅
**Test Scenarios:**

| # | Input | Expected Behavior |
|---|-------|-------------------|
| 1 | https://example.com/song.mp3 (valid) | HEAD request, if 200 → add to playlist |
| 2 | https://cors-blocked.com/stream (CORS) | Toast: "Stream blocked by CORS..." |
| 3 | https://example.com/404 (not found) | Toast: "Stream unreachable (404). Check URL." |
| 4 | https://youtube.com/watch?v=... | Toast: "YouTube requires proxy..." |
| 5 | https://spotify.com/track/... | Toast: "Spotify requires proxy..." |
| 6 | example.com/song.mp3 (no protocol) | Toast: "Invalid URL format..." |
| 7 | (empty input) | Ignored, no error |
| 8 | https://slow-server.com (timeout) | Toast: "Request timeout. Server unreachable." |

---

## Technical Implementation

### Files to Modify

#### 1. `index.html` - Add URL Validation Helpers

**Location:** Before `addUrl` function (~line 1500)

```javascript
// URL format validator
const isValidUrl = (str) => {
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

// Unsupported service detector
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

// Stream URL validator (async)
const validateStreamUrl = async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
        const response = await fetch(url, {
            method: 'HEAD',
            mode: 'cors',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
            return { valid: true, url };
        } else {
            return { 
                valid: false, 
                reason: 'unreachable',
                status: response.status 
            };
        }
    } catch (err) {
        clearTimeout(timeoutId);
        
        if (err.name === 'AbortError') {
            return { valid: false, reason: 'timeout' };
        }
        
        // CORS or network error
        return { valid: false, reason: 'cors', error: err };
    }
};
```

#### 2. `index.html` - Refactor addUrl Function

**Current Implementation:** (lines ~1503-1531)
```javascript
const addUrl = () => {
    if (!urlInput.trim()) return;
    
    let source = 'url';
    let name = 'Remote Track';
    
    if (urlInput.includes('youtube.com') || urlInput.includes('youtu.be')) {
        source = 'youtube';
        name = 'YouTube Track';
    }
    
    const newTrack = {
        id: Date.now(),
        name: name,
        source: source,
        url: urlInput,
        originalUrl: urlInput
    };
    
    setPlaylist(prev => [...prev, newTrack]);
    setUrlInput('');
    setNeedsAudio(false);
    setHeroMessage('Stream added. Start your ritual to hear it.');
};
```

**Refactored Implementation:**
```javascript
const addUrl = async () => {
    const url = urlInput.trim();
    
    // Ignore empty input
    if (!url) return;
    
    // 1. Format validation
    if (!isValidUrl(url)) {
        showToast('Invalid URL format. Use: https://example.com/song.mp3', 'error');
        setA11yAnnouncement('Invalid URL format');
        return;
    }
    
    // 2. Unsupported service detection
    const serviceCheck = detectUnsupportedService(url);
    if (!serviceCheck.supported) {
        showToast(
            `${serviceCheck.service} playback requires authenticated proxy. Direct MP3 URLs only.`,
            'warning'
        );
        setA11yAnnouncement(`${serviceCheck.service} not supported`);
        return;
    }
    
    // 3. Show validating state
    setHeroMessage('Validating stream URL...');
    
    // 4. HEAD request validation
    const validation = await validateStreamUrl(url);
    
    if (!validation.valid) {
        let message = '';
        
        switch (validation.reason) {
            case 'cors':
                message = 'Stream blocked by CORS. Use direct MP3 link or enable server CORS.';
                break;
            case 'timeout':
                message = 'Request timeout (5s). Server unreachable or slow.';
                break;
            case 'unreachable':
                message = `Stream unreachable (${validation.status}). Check URL and try again.`;
                break;
            default:
                message = 'Unable to validate stream. Check URL.';
        }
        
        showToast(message, 'error');
        setA11yAnnouncement(message);
        setHeroMessage('Stream validation failed. Try another URL.');
        return;
    }
    
    // 5. Add validated URL to playlist
    const newTrack = {
        id: Date.now(),
        name: 'Remote Track',
        source: 'url',
        url: url,
        originalUrl: url
    };
    
    setPlaylist(prev => [...prev, newTrack]);
    setUrlInput('');
    setNeedsAudio(false);
    setHeroMessage('Stream validated and added. Start your ritual to hear it.');
    setA11yAnnouncement('Stream added to playlist');
};
```

#### 3. Add Loading State for URL Validation

**New State Hook:**
```javascript
const [isValidatingUrl, setIsValidatingUrl] = useState(false);
```

**Update addUrl to use loading state:**
```javascript
const addUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    
    // ... validation checks ...
    
    setIsValidatingUrl(true);
    setHeroMessage('Validating stream URL...');
    
    const validation = await validateStreamUrl(url);
    
    setIsValidatingUrl(false);
    
    // ... handle validation result ...
};
```

**Update UI to show loading state:**
```jsx
<button 
    type="button" 
    className="primary-btn" 
    onClick={addUrl} 
    disabled={!urlInput.trim() || isValidatingUrl}
>
    {isValidatingUrl ? 'Validating...' : 'Add URL'}
</button>
```

---

## Testing Strategy

### Automated Tests

**Create:** `tests/url-validation.test.js`

```javascript
// tests/url-validation.test.js
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

console.log('🧪 Running URL validation tests...\n');

// Test 1: Valid HTTP URL
const validHttp = isValidUrl('http://example.com/song.mp3');
assert.strictEqual(validHttp, true, 'Valid HTTP URL should pass');
console.log('✅ Test 1: Valid HTTP URL');

// Test 2: Valid HTTPS URL
const validHttps = isValidUrl('https://example.com/song.mp3');
assert.strictEqual(validHttps, true, 'Valid HTTPS URL should pass');
console.log('✅ Test 2: Valid HTTPS URL');

// Test 3: Invalid URL (no protocol)
const invalidNoProtocol = isValidUrl('example.com/song.mp3');
assert.strictEqual(invalidNoProtocol, false, 'URL without protocol should fail');
console.log('✅ Test 3: Invalid URL (no protocol)');

// Test 4: Invalid URL (malformed)
const invalidMalformed = isValidUrl('not a url');
assert.strictEqual(invalidMalformed, false, 'Malformed URL should fail');
console.log('✅ Test 4: Invalid URL (malformed)');

// Test 5: YouTube detection
const youtubeCheck = detectUnsupportedService('https://www.youtube.com/watch?v=abc123');
assert.strictEqual(youtubeCheck.supported, false, 'YouTube should be unsupported');
assert.strictEqual(youtubeCheck.service, 'YouTube', 'Service should be YouTube');
console.log('✅ Test 5: YouTube URL detection');

// Test 6: Spotify detection
const spotifyCheck = detectUnsupportedService('https://open.spotify.com/track/abc123');
assert.strictEqual(spotifyCheck.supported, false, 'Spotify should be unsupported');
assert.strictEqual(spotifyCheck.service, 'Spotify', 'Service should be Spotify');
console.log('✅ Test 6: Spotify URL detection');

// Test 7: Valid streaming URL (not YouTube/Spotify)
const validStream = detectUnsupportedService('https://example.com/stream.mp3');
assert.strictEqual(validStream.supported, true, 'Regular MP3 URL should be supported');
console.log('✅ Test 7: Regular MP3 URL supported');

// Test 8: YouTube short URL (youtu.be)
const youtubeShort = detectUnsupportedService('https://youtu.be/abc123');
assert.strictEqual(youtubeShort.supported, false, 'YouTube short URL should be unsupported');
console.log('✅ Test 8: YouTube short URL detection');

console.log('\n🎉 All URL validation tests passed!');
```

### Manual Test Matrix

Execute all 8 scenarios from AC6:

1. **Valid MP3 URL** - Use a known working MP3 URL
2. **CORS-blocked stream** - Test with URL that has no CORS headers
3. **404 Not Found** - Use intentionally broken URL
4. **YouTube URL** - Copy any YouTube video URL
5. **Spotify URL** - Copy any Spotify track URL
6. **Malformed URL** - Type "example.com/song" (no protocol)
7. **Empty input** - Leave field empty, click Add
8. **Timeout** - Use very slow server URL (simulated)

---

## Definition of Done

### Code Implementation
- [ ] URL format validation function (isValidUrl)
- [ ] Service detection function (detectUnsupportedService)
- [ ] Async stream validator (validateStreamUrl)
- [ ] Refactored addUrl function with validation pipeline
- [ ] Loading state for validation (isValidatingUrl)
- [ ] UI updates (disabled button, loading text)

### Testing
- [ ] Automated tests created (tests/url-validation.test.js)
- [ ] Automated tests pass (8/8)
- [ ] Manual test matrix executed (8 scenarios)
- [ ] Pa11y audit: 0 new issues
- [ ] Screen reader announcements verified

### Error Handling
- [ ] Format validation errors show clear message
- [ ] CORS errors show actionable guidance
- [ ] Timeout errors handled gracefully
- [ ] HTTP error codes surfaced (404, 500, etc.)
- [ ] YouTube/Spotify URLs blocked with explanation

### User Experience
- [ ] Toast notifications for all error types
- [ ] Hero message updates during validation
- [ ] Button disabled during validation
- [ ] Loading state visible ("Validating...")
- [ ] Aria-live announcements for screen readers

---

## Implementation Notes

### Network Request Considerations

**Timeout Handling:**
- 5-second timeout prevents long hangs
- AbortController cleanly cancels requests
- User gets immediate feedback

**CORS Detection:**
- TypeError from fetch indicates CORS block
- Message guides user to direct MP3 links
- No way to "fix" CORS from client side

**HEAD vs GET:**
- HEAD request checks reachability without downloading
- Faster and more bandwidth-efficient
- Some servers don't support HEAD (fallback to GET if needed)

### Error Message Philosophy

**Be Specific:**
- ❌ "Invalid URL" (vague)
- ✅ "Invalid URL format. Use: https://example.com/song.mp3" (actionable)

**Explain Why:**
- ❌ "Stream blocked"
- ✅ "Stream blocked by CORS. Use direct MP3 link or enable server CORS."

**Provide Next Steps:**
- ❌ "YouTube not supported"
- ✅ "YouTube playback requires authenticated proxy. Direct MP3 URLs only."

---

## Risk Mitigation

**R1: HEAD Request Failures**
- Some servers block HEAD requests
- Mitigation: Fall back to GET with Range: bytes=0-0
- Document servers that require GET

**R2: False Positives (CORS)**
- Browser may block for security reasons
- Mitigation: Clear error message guides user
- Can't bypass CORS from client (by design)

**R3: Slow Network Hangs UI**
- 5s timeout may feel long
- Mitigation: Loading state shows progress
- Consider shorter timeout (3s) if UX feels slow

**R4: Mixed Content (HTTP on HTTPS)**
- Browser blocks HTTP requests from HTTPS pages
- Mitigation: Warn user to use HTTPS URLs
- Document in error message

---

## Next Steps

1. Implement helper functions (isValidUrl, detectUnsupportedService, validateStreamUrl)
2. Add isValidatingUrl state hook
3. Refactor addUrl with validation pipeline
4. Update UI (button disabled state, loading text)
5. Create automated tests
6. Run manual test matrix
7. Pa11y accessibility audit
8. Mark story DONE and complete Epic 2

---

**Created:** 2025-11-11  
**Story Status:** ready-for-dev  
**Estimated Effort:** 2-3 hours  
**Dependencies:** Story 2-3 complete (audio graph stable)
