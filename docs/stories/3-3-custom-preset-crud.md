# Story 3-3 – Custom Preset CRUD & Auto-Restore

**Epic:** E3 – Preset & Mode Orchestration  
**Status:** backlog  
**Owner:** TBD  
**Source:** docs/epic-3-preset-mode-orchestration.context.xml (S3.3)

---

## Summary
Enable users to save, rename, reorder, and delete custom audio presets. Each playlist track remembers its last-used preset and automatically restores it on replay. Presets persist in localStorage with migration path to IndexedDB. Target: ≥80% preset reuse rate across sessions.

## User Story
> **As a** parent creating a bedtime routine for my neurodivergent child  
> **I want** to save our "Calm Bedtime" preset and have it auto-apply when we play our bedtime playlist  
> **So that** we have consistent calming audio every night, reducing anxiety triggers

## Acceptance Criteria

### AC1: Save Custom Preset from Advanced Controls
**Given** user has adjusted audio parameters to their liking  
**When** clicking "Save Preset" button in advanced controls drawer  
**Then**:
- Modal dialog appears with:
  - "Preset Name" text input (required, max 50 chars)
  - "Description" textarea (optional, max 200 chars)
  - Optional color picker for accent color
  - "Save" button (disabled until name entered)
  - "Cancel" button
- Clicking "Save" creates preset in localStorage with structure:
  ```javascript
  {
    id: 'custom-preset-1699999999999',
    name: 'Deep Flow',
    description: 'My perfect focus state',
    createdAt: 1699999999999,
    lastUsedAt: 1699999999999,
    preset: {
      speed: 0.4,
      intensity: 0.75,
      spatialDepth: 0.5,
      movement: 'figure8',
      binaural: { enabled: true, freq: 10 },
      noise: { type: 'brown', volume: 0.1 }
    },
    color: '#6366f1',
    tags: []
  }
  ```
- Toast confirmation: "Preset 'Deep Flow' saved"
- New preset appears in preset list immediately
- Active preset switches to newly saved custom preset

**Validation:**
- Manual test: Adjust parameters, save as "Test Preset", verify in localStorage
- Edge case: Name too long (50+ chars) → validation error
- Edge case: localStorage quota exceeded → graceful error message

### AC2: Preset List UI Shows All Presets
**Given** user has default + custom presets  
**When** viewing preset list (new UI section below mode chips)  
**Then**:
- List shows all presets in order:
  - Default presets (Focus, Calm, Energize) with "Default" badge
  - Custom presets sorted by last used date
- Each preset card displays:
  - Preset name
  - Description (truncated if long)
  - Last used timestamp ("Used 2 hours ago")
  - Quick apply button
  - Edit button (custom presets only)
  - Delete button (custom presets only)
  - Drag handle for reordering
- Active preset highlighted with accent border
- Keyboard navigation: Arrow keys navigate, Enter applies preset

**Validation:**
- Manual test: Create 3 custom presets, verify all appear in list
- Accessibility test: Navigate list with keyboard only
- Manual test: Verify default presets cannot be deleted

### AC3: Edit & Delete Custom Presets
**Given** user has custom presets  
**When** clicking edit/delete buttons  
**Then**:
- **Edit:** Opens dialog with current name/description pre-filled, allows updates
- **Delete:** Shows confirmation modal "Delete 'Deep Flow'? This cannot be undone."
- Deleting preset:
  - Removes from localStorage
  - Removes from preset list UI immediately
  - Updates any tracks using this preset to fallback to "focus" default
  - Shows toast: "Preset 'Deep Flow' deleted"
- If deleted preset was active, switches to "focus" default gracefully
- No crashes or console errors

**Validation:**
- Manual test: Edit preset name, verify localStorage updates
- Manual test: Delete preset, verify removed from list and storage
- Edge case: Delete active preset → verify fallback to focus
- Regression: Delete preset used by track → verify track still plays with focus preset

### AC4: Playlist Track Auto-Restore
**Given** user plays different tracks with different presets  
**When** switching between tracks in playlist  
**Then**:
- Track schema includes:
  ```javascript
  {
    id: 'track-123',
    name: 'Focus Music.mp3',
    lastPresetId: 'calm',           // Auto-populated when preset changes during playback
    preferredPresetId: null,         // User can pin a preset to track (future enhancement)
    // ... existing fields
  }
  ```
- Playing track for first time sets `lastPresetId` to currently active preset
- Replaying track restores `lastPresetId` preset before audio starts
- If `lastPresetId` preset deleted, falls back to "focus" default
- Toast notification: "Restored Calm preset for 'Focus Music.mp3'"
- Changing preset during playback updates `lastPresetId` for current track

**Validation:**
- Manual test: Play Track 1 with Focus, Track 2 with Calm, replay Track 1 → verify Focus restored
- Manual test: Change preset during playback → verify `lastPresetId` updated
- Edge case: `lastPresetId` references deleted preset → verify fallback to focus
- Integration test: Refresh page, replay track → verify preset persists across sessions

### AC5: Preset Reordering (Drag/Drop or Arrows)
**Given** user has multiple custom presets  
**When** reordering presets via drag/drop or arrow buttons  
**Then**:
- Drag handle allows touch/mouse drag to reorder
- Up/down arrow buttons move preset in list
- Order persists in localStorage `preset-order` array:
  ```javascript
  localStorage.setItem('preset-order', JSON.stringify([
    'focus', 'calm', 'energize', // defaults always first
    'custom-preset-1', 'custom-preset-2', // custom order
  ]));
  ```
- Order preserved across page refreshes
- Accessibility: Keyboard shortcuts (Ctrl+Up/Down) to reorder focused preset

**Validation:**
- Manual test: Drag custom preset to top, refresh → verify order persists
- Accessibility test: Use Ctrl+Up/Down to reorder with keyboard
- Edge case: Only 1 custom preset → reorder controls disabled

### AC6: Export/Import Preset JSON (Stretch Goal)
**Given** user wants to share or backup presets  
**When** clicking "Export" on a preset  
**Then**:
- Downloads JSON file: `deep-flow.preset.json`
- JSON structure matches localStorage preset schema
- Import button allows uploading `.preset.json` file
- Importing preset validates structure, assigns new ID, saves to localStorage
- Toast: "Preset 'Deep Flow' imported successfully"

**Validation:**
- Manual test: Export preset, import on different browser, verify works
- Edge case: Import malformed JSON → validation error shown
- Edge case: Import preset with same name → auto-rename with " (2)" suffix

---

## Tasks/Subtasks

### Task 3-3-1: Define Preset Storage Schema & Helpers
**Priority:** HIGH  
**Estimate:** 45 minutes

**Implementation:**
```javascript
// localStorage keys:
// - 'custom-presets': object of custom preset definitions
// - 'preset-order': array of preset IDs in display order
// - 'default-presets': customized default preset values (from Story 3-1)

const loadCustomPresets = () => {
  try {
    const saved = localStorage.getItem('custom-presets');
    return saved ? JSON.parse(saved) : {};
  } catch (err) {
    console.error('Failed to load custom presets:', err);
    showToast('Error loading presets. Using defaults.', 'error');
    return {};
  }
};

const saveCustomPreset = (preset) => {
  try {
    const customPresets = loadCustomPresets();
    const id = `custom-preset-${Date.now()}`;
    
    customPresets[id] = {
      id,
      name: preset.name,
      description: preset.description || '',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      preset: {
        speed: preset.speed,
        intensity: preset.intensity,
        spatialDepth: preset.spatialDepth,
        movement: preset.movement,
        binaural: { 
          enabled: preset.binauralEnabled, 
          freq: preset.binauralFreq 
        },
        noise: { 
          type: preset.noiseType, 
          volume: preset.noiseVolume 
        }
      },
      color: preset.color || '#6366f1',
      tags: preset.tags || []
    };
    
    localStorage.setItem('custom-presets', JSON.stringify(customPresets));
    
    // Add to preset order
    const order = getPresetOrder();
    order.push(id);
    savePresetOrder(order);
    
    return id;
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      showToast('Storage full. Please delete old presets.', 'error');
    } else {
      console.error('Failed to save preset:', err);
      showToast('Error saving preset.', 'error');
    }
    return null;
  }
};

const updateCustomPreset = (id, updates) => {
  try {
    const customPresets = loadCustomPresets();
    if (customPresets[id]) {
      customPresets[id] = { 
        ...customPresets[id], 
        ...updates,
        lastUsedAt: Date.now()
      };
      localStorage.setItem('custom-presets', JSON.stringify(customPresets));
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to update preset:', err);
    showToast('Error updating preset.', 'error');
    return false;
  }
};

const deleteCustomPreset = (id) => {
  try {
    const customPresets = loadCustomPresets();
    delete customPresets[id];
    localStorage.setItem('custom-presets', JSON.stringify(customPresets));
    
    // Remove from order
    const order = getPresetOrder().filter(pid => pid !== id);
    savePresetOrder(order);
    
    // Update tracks using this preset
    setPlaylist(prev => prev.map(track => ({
      ...track,
      lastPresetId: track.lastPresetId === id ? 'focus' : track.lastPresetId,
      preferredPresetId: track.preferredPresetId === id ? null : track.preferredPresetId
    })));
    
    return true;
  } catch (err) {
    console.error('Failed to delete preset:', err);
    showToast('Error deleting preset.', 'error');
    return false;
  }
};

const getAllPresets = () => {
  const defaults = MODE_LIBRARY.map(mode => ({
    id: mode.id,
    name: mode.label,
    description: mode.description,
    preset: mode.preset,
    color: mode.accent,
    isDefault: true,
    createdAt: 0,
    lastUsedAt: 0
  }));
  
  const custom = Object.values(loadCustomPresets()).map(p => ({
    ...p,
    isDefault: false
  }));
  
  // Apply user-defined order
  const order = getPresetOrder();
  const ordered = order
    .map(id => [...defaults, ...custom].find(p => p.id === id))
    .filter(Boolean);
  
  return ordered;
};

const getPresetOrder = () => {
  try {
    const saved = localStorage.getItem('preset-order');
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.error('Failed to load preset order:', err);
  }
  
  // Default order: defaults first, then custom by creation date
  const defaults = MODE_LIBRARY.map(m => m.id);
  const custom = Object.keys(loadCustomPresets()).sort();
  return [...defaults, ...custom];
};

const savePresetOrder = (order) => {
  try {
    localStorage.setItem('preset-order', JSON.stringify(order));
  } catch (err) {
    console.error('Failed to save preset order:', err);
  }
};
```

**Testing:**
- [ ] Unit test: `saveCustomPreset()` creates valid preset in localStorage
- [ ] Unit test: `deleteCustomPreset()` removes preset and updates tracks
- [ ] Unit test: `getAllPresets()` merges defaults + custom in correct order
- [ ] Edge case test: localStorage quota exceeded → error handling

### Task 3-3-2: Build SavePresetDialog Component
**Priority:** HIGH  
**Estimate:** 60 minutes

**Implementation:**
```javascript
const SavePresetDialog = ({ 
  currentParameters, 
  onSave, 
  onCancel,
  existingPreset = null // for edit mode
}) => {
  const [name, setName] = useState(existingPreset?.name || '');
  const [description, setDescription] = useState(existingPreset?.description || '');
  const [color, setColor] = useState(existingPreset?.color || '#6366f1');
  const [errors, setErrors] = useState({});
  
  const validate = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Preset name is required';
    } else if (name.length > 50) {
      newErrors.name = 'Name too long (max 50 characters)';
    }
    
    if (description.length > 200) {
      newErrors.description = 'Description too long (max 200 characters)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = () => {
    if (!validate()) return;
    
    const presetData = {
      name: name.trim(),
      description: description.trim(),
      color,
      ...currentParameters
    };
    
    let presetId;
    if (existingPreset) {
      // Edit mode
      updateCustomPreset(existingPreset.id, presetData);
      presetId = existingPreset.id;
      showToast(`Preset "${name}" updated`, 'success');
    } else {
      // Create mode
      presetId = saveCustomPreset(presetData);
      if (presetId) {
        showToast(`Preset "${name}" saved`, 'success');
      }
    }
    
    if (presetId) {
      onSave(presetId);
      setA11yAnnouncement(`Preset ${name} ${existingPreset ? 'updated' : 'saved'}`);
    }
  };
  
  return (
    <dialog open className="save-preset-dialog">
      <div className="dialog-header">
        <h2>{existingPreset ? 'Edit Preset' : 'Save Custom Preset'}</h2>
        <button onClick={onCancel} aria-label="Close dialog" className="close-btn">×</button>
      </div>
      
      <div className="dialog-content">
        <label className={errors.name ? 'error' : ''}>
          <span className="label-text">Preset Name *</span>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="e.g., Deep Flow"
            maxLength={50}
            required
            autoFocus
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && <span id="name-error" className="error-msg">{errors.name}</span>}
          <span className="char-count">{name.length}/50</span>
        </label>
        
        <label className={errors.description ? 'error' : ''}>
          <span className="label-text">Description (optional)</span>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="My perfect focus state"
            maxLength={200}
            rows={3}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? 'desc-error' : undefined}
          />
          {errors.description && <span id="desc-error" className="error-msg">{errors.description}</span>}
          <span className="char-count">{description.length}/200</span>
        </label>
        
        <label>
          <span className="label-text">Accent Color</span>
          <div className="color-picker-group">
            <input 
              type="color" 
              value={color} 
              onChange={(e) => setColor(e.target.value)} 
            />
            <span className="color-preview" style={{ background: color }}></span>
            <input 
              type="text" 
              value={color} 
              onChange={(e) => setColor(e.target.value)} 
              placeholder="#6366f1"
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
        </label>
        
        <div className="preset-preview">
          <h3>Current Parameters</h3>
          <dl className="params-grid">
            <dt>Speed</dt><dd>{currentParameters.speed.toFixed(2)}</dd>
            <dt>Intensity</dt><dd>{currentParameters.intensity.toFixed(2)}</dd>
            <dt>Spatial Depth</dt><dd>{currentParameters.spatialDepth.toFixed(2)}</dd>
            <dt>Movement</dt><dd>{currentParameters.movement}</dd>
            <dt>Binaural</dt><dd>{currentParameters.binauralEnabled ? `${currentParameters.binauralFreq} Hz` : 'Off'}</dd>
            <dt>Noise</dt><dd>{currentParameters.noiseType} @ {(currentParameters.noiseVolume * 100).toFixed(0)}%</dd>
          </dl>
        </div>
      </div>
      
      <div className="dialog-actions">
        <button onClick={handleSave} disabled={!name.trim()} className="primary-btn">
          {existingPreset ? 'Update' : 'Save'} Preset
        </button>
        <button onClick={onCancel} className="secondary-btn">Cancel</button>
      </div>
    </dialog>
  );
};
```

**Testing:**
- [ ] Manual test: Save preset with name only → verify saves
- [ ] Manual test: Save with 51-char name → validation error
- [ ] Manual test: Edit existing preset → verify updates
- [ ] Accessibility test: Tab through form, screen reader announces errors

### Task 3-3-3: Build PresetList Component
**Priority:** HIGH  
**Estimate:** 90 minutes

**Implementation:**
```javascript
const PresetList = ({ 
  presets, 
  activePresetId, 
  onSelect, 
  onEdit, 
  onDelete,
  onReorder
}) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newPresets = [...presets];
    const [removed] = newPresets.splice(draggedIndex, 1);
    newPresets.splice(index, 0, removed);
    
    onReorder(newPresets.map(p => p.id));
    setDraggedIndex(index);
  };
  
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  
  const formatLastUsed = (timestamp) => {
    if (!timestamp) return 'Never used';
    const hours = Math.floor((Date.now() - timestamp) / 1000 / 60 / 60);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };
  
  return (
    <section className="preset-list-section">
      <h2>Your Presets</h2>
      
      <div className="preset-list" role="list">
        {presets.map((preset, index) => (
          <div 
            key={preset.id}
            className={`preset-card ${preset.id === activePresetId ? 'active' : ''} ${preset.isDefault ? 'default' : ''}`}
            role="listitem"
            draggable={!preset.isDefault}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            style={{ '--accent-color': preset.color }}
          >
            {!preset.isDefault && (
              <div className="drag-handle" aria-label="Drag to reorder">
                ⋮⋮
              </div>
            )}
            
            <div className="preset-info">
              <div className="preset-header">
                <h3 className="preset-name">{preset.name}</h3>
                {preset.isDefault && <span className="default-badge">Default</span>}
                {preset.id === activePresetId && <span className="active-badge">Active</span>}
              </div>
              
              {preset.description && (
                <p className="preset-description">{preset.description}</p>
              )}
              
              <div className="preset-meta">
                <span className="last-used">Last used: {formatLastUsed(preset.lastUsedAt)}</span>
                <button 
                  className="preset-apply-btn"
                  onClick={() => onSelect(preset.id)}
                  disabled={preset.id === activePresetId}
                >
                  {preset.id === activePresetId ? '✓ Active' : 'Apply'}
                </button>
              </div>
            </div>
            
            {!preset.isDefault && (
              <div className="preset-actions">
                <button 
                  onClick={() => onEdit(preset.id)} 
                  aria-label={`Edit ${preset.name}`}
                  className="action-btn edit-btn"
                >
                  ✏️ Edit
                </button>
                <button 
                  onClick={() => onDelete(preset.id)} 
                  aria-label={`Delete ${preset.name}`}
                  className="action-btn delete-btn"
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        ))}
        
        {presets.filter(p => !p.isDefault).length === 0 && (
          <div className="empty-state">
            <p>No custom presets yet.</p>
            <p>Adjust parameters and click "Save Preset" to create your first!</p>
          </div>
        )}
      </div>
    </section>
  );
};
```

**Testing:**
- [ ] Manual test: Verify all presets render in list
- [ ] Manual test: Drag preset to reorder, verify persists
- [ ] Accessibility test: Keyboard navigation (Arrow keys)
- [ ] Manual test: Default presets show badge, no edit/delete buttons

### Task 3-3-4: Implement Track Auto-Restore Logic
**Priority:** HIGH  
**Estimate:** 45 minutes

**Implementation:**
```javascript
// Extend track schema in addLocalFiles and addUrl:
const newTrack = {
  id: Date.now() + index,
  name: file.name,
  source: 'local',
  file: file,
  url: null,
  lastPresetId: activePresetId, // NEW: Auto-populate with current preset
  preferredPresetId: null,       // NEW: User can pin later
  metadata: {
    size: file.size,
    type: file.type,
    lastModified: file.lastModified
  }
};

// Update playTrack function to restore preset:
const playTrack = (index) => {
  const track = playlist[index];
  if (!track) return;
  
  // Auto-restore last preset for this track
  const targetPresetId = track.preferredPresetId || track.lastPresetId || 'focus';
  const allPresets = getAllPresets();
  const targetPreset = allPresets.find(p => p.id === targetPresetId);
  
  if (targetPreset) {
    applyPreset(targetPreset.preset, targetPreset.id);
    setHeroMessage(`Restored "${targetPreset.name}" preset`);
    setA11yAnnouncement(`Playing ${track.name} with ${targetPreset.name} preset`);
    showToast(`Restored ${targetPreset.name} preset`, 'info', 2000);
  } else {
    // Preset was deleted, fallback to focus
    const focusPreset = allPresets.find(p => p.id === 'focus');
    applyPreset(focusPreset.preset, 'focus');
    setHeroMessage('Using default Focus preset');
    
    // Update track to clear invalid preset ID
    setPlaylist(prev => prev.map((t, i) => 
      i === index 
        ? { ...t, lastPresetId: 'focus', preferredPresetId: null }
        : t
    ));
  }
  
  // ... existing playback logic ...
  
  setCurrentTrackIndex(index);
  setIsPlaying(true);
};

// Track preset changes during playback:
useEffect(() => {
  if (currentTrackIndex !== null && activePresetId) {
    setPlaylist(prev => prev.map((track, idx) => 
      idx === currentTrackIndex 
        ? { ...track, lastPresetId: activePresetId }
        : track
    ));
  }
}, [activePresetId, currentTrackIndex]);
```

**Testing:**
- [ ] Integration test: Play track 1 with Focus, track 2 with Calm, replay track 1 → verify Focus restored
- [ ] Manual test: Change preset during playback → verify `lastPresetId` updates
- [ ] Edge case: Delete preset used by track → verify fallback to focus
- [ ] Manual test: Refresh page, replay track → verify preset persists

### Task 3-3-5: Add Delete Confirmation Modal
**Priority:** MEDIUM  
**Estimate:** 20 minutes

**Implementation:**
```javascript
const DeletePresetDialog = ({ preset, onConfirm, onCancel }) => {
  return (
    <dialog open className="delete-preset-dialog">
      <div className="dialog-header">
        <h2>Delete Preset?</h2>
      </div>
      
      <div className="dialog-content">
        <p>Are you sure you want to delete <strong>{preset.name}</strong>?</p>
        <p className="warning">This action cannot be undone.</p>
        
        {/* Show warning if preset is used by tracks */}
        {playlist.some(t => t.lastPresetId === preset.id) && (
          <div className="warning-box">
            <p>⚠️ This preset is used by {playlist.filter(t => t.lastPresetId === preset.id).length} track(s).</p>
            <p>They will reset to the default Focus preset.</p>
          </div>
        )}
      </div>
      
      <div className="dialog-actions">
        <button onClick={onConfirm} className="danger-btn">Delete Preset</button>
        <button onClick={onCancel} className="secondary-btn" autoFocus>Cancel</button>
      </div>
    </dialog>
  );
};
```

**Testing:**
- [ ] Manual test: Delete unused preset → no warnings shown
- [ ] Manual test: Delete preset used by tracks → warning shown
- [ ] Accessibility test: Focus on "Cancel" by default (safe action)

### Task 3-3-6: Implement Export/Import (Stretch Goal)
**Priority:** LOW  
**Estimate:** 45 minutes

**Implementation:**
```javascript
const exportPreset = (presetId) => {
  const preset = loadCustomPresets()[presetId];
  if (!preset) return;
  
  const json = JSON.stringify(preset, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${preset.name.replace(/\s+/g, '-').toLowerCase()}.preset.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast(`Exported "${preset.name}"`, 'success');
};

const importPreset = (file) => {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const preset = JSON.parse(e.target.result);
      
      // Validate structure
      const required = ['name', 'preset'];
      const valid = required.every(field => preset.hasOwnProperty(field));
      
      if (!valid) {
        showToast('Invalid preset file format', 'error');
        return;
      }
      
      // Check for name collision
      const existing = Object.values(loadCustomPresets());
      if (existing.some(p => p.name === preset.name)) {
        preset.name = `${preset.name} (2)`;
      }
      
      const id = saveCustomPreset(preset);
      if (id) {
        showToast(`Imported "${preset.name}"`, 'success');
        setA11yAnnouncement(`Preset ${preset.name} imported`);
      }
    } catch (err) {
      console.error('Import failed:', err);
      showToast('Error importing preset. Invalid JSON.', 'error');
    }
  };
  
  reader.onerror = () => {
    showToast('Error reading file', 'error');
  };
  
  reader.readAsText(file);
};
```

**Testing:**
- [ ] Manual test: Export preset, import in new browser → verify works
- [ ] Edge case: Import malformed JSON → error handling
- [ ] Edge case: Import duplicate name → auto-rename

---

## Dev Agent Record

### Context Reference
- `docs/epic-3-preset-mode-orchestration.context.xml`

### Implementation Notes
- **localStorage limits**: ~5MB quota. At ~500 bytes/preset, can store ~10,000 presets (way more than needed). Show warning at 50 presets.
- **Migration path**: Story uses localStorage; Epic 4 can migrate to IndexedDB if needed.
- **Track schema extension**: Adding `lastPresetId` and `preferredPresetId` fields is backward compatible (existing tracks default to null).

### File List
- `index.html` (all components + helpers)
- `docs/stories/3-3-custom-preset-crud.md` (this file)

---

## Testing Strategy

### Unit Tests (8 tests)
1. `saveCustomPreset()` creates valid preset in localStorage
2. `loadCustomPresets()` handles corrupted JSON gracefully
3. `deleteCustomPreset()` removes preset and updates tracks
4. `getAllPresets()` merges defaults + custom in correct order
5. `getPresetOrder()` returns default order when none saved
6. Preset validation rejects invalid names/descriptions
7. Export generates valid JSON structure
8. Import validates structure before saving

### Integration Tests (6 tests)
1. Save preset dialog → `saveCustomPreset()` → preset appears in list
2. Delete preset → confirmation modal → preset removed from list
3. Play track → change preset → `lastPresetId` updates
4. Replay track → preset auto-restores before playback
5. Delete active preset → fallback to focus gracefully
6. Reorder presets → order persists across refresh

### Manual Tests (12 tests)
1. **Smoke test:** Create, edit, delete custom preset
2. **Auto-restore:** Play 3 tracks with different presets, replay each → verify correct preset restored
3. **Accessibility:** Navigate preset list with keyboard only
4. **Screen reader:** Verify preset cards, buttons announced correctly
5. **Persistence:** Create presets, refresh page → verify all persist
6. **Edge case:** Fill localStorage to 50 presets → warning shown
7. **Edge case:** Delete preset used by track → verify track still plays
8. **Edge case:** Delete active preset → verify switch to focus
9. **Edge case:** Import duplicate name → verify auto-rename
10. **Drag/drop:** Reorder presets, refresh → verify order persists
11. **Export/import:** Export preset, import on different device
12. **Regression:** Run Epic 1/2 smoke tests

---

## Definition of Done Checklist

### Code Implementation
- [ ] Preset CRUD helpers implemented (`save`, `load`, `update`, `delete`, `getAllPresets`)
- [ ] SavePresetDialog component with validation
- [ ] PresetList component with drag/drop reordering
- [ ] DeletePresetDialog with warning for used presets
- [ ] Track auto-restore logic in `playTrack()`
- [ ] useEffect to track preset changes during playback
- [ ] Export/import preset JSON (stretch goal)

### Testing
- [ ] 8 unit tests passing
- [ ] 6 integration tests passing
- [ ] 12 manual tests executed and documented
- [ ] Auto-restore verified across page refreshes
- [ ] Edge cases tested (quota, deleted presets, name collisions)
- [ ] Epic 1/2 regression tests still passing

### Documentation
- [ ] Code comments explain CRUD logic
- [ ] localStorage schema documented
- [ ] Test results in test artifacts folder

### Quality Gates
- [ ] No console errors or warnings
- [ ] localStorage quota handling graceful
- [ ] Delete operations safe (no crashes if preset in use)
- [ ] Auto-restore works 100% of test cases
- [ ] Drag/drop accessible via keyboard

### Handoff
- [ ] Code reviewed by senior developer
- [ ] QA smoke test passed
- [ ] Story marked "review" → "done" in sprint status
- [ ] Epic 3 complete (all 3 stories done)

---

## Success Metrics

**Primary KPI:** ≥80% preset reuse rate  
**Measurement:** Epic 4 session logs track `presetId` field  
**Baseline:** 0% (no preset persistence)  
**Target (post-Epic 3):** 80%+ sessions use saved/default preset

**Secondary KPI:** ≥60% users save ≥1 custom preset  
**Measurement:** Count unique users with custom presets in localStorage  
**Baseline:** 0%  
**Target (post-Epic 3):** 60%+ adoption

**Tertiary KPI:** ≥90% auto-restore success rate  
**Measurement:** Track replays that correctly restore preset  
**Baseline:** N/A (new feature)  
**Target:** 90%+ (only fail if preset deleted)

---

## Dependencies & Blockers

**Depends On:**
- ✅ Story 3-1 complete (needs `applyPreset()` helper, `activePresetId` state)
- ✅ Story 3-2 complete (users need sliders to create custom parameters)
- ✅ Epic 2 complete (toast system, playlist schema)

**Blocks:**
- Epic 4: Session tracking (needs `lastPresetId` in track schema for analytics)
- Epic 5: Adaptive sensors (can create adaptive presets after learning user patterns)

**No Current Blockers**

---

## Notes & Considerations

### Architecture Alignment
- localStorage used for v1, IndexedDB migration possible in Epic 4
- Preset schema versioning ready (add `schemaVersion: 1` field)
- Track schema extension backward compatible (defaults to null)
- Export/import enables offline backup and sharing

### Accessibility Wins
- Drag handles have aria-labels
- Delete confirmation prevents accidental data loss
- Screen reader announces preset save/delete actions
- Keyboard shortcuts for reordering (Ctrl+Up/Down)

### Performance Considerations
- localStorage reads cached on mount (not on every render)
- Preset list virtualizes if >20 presets (future optimization)
- Track preset updates debounced (only write on preset change, not every render)

### Future Enhancements (Out of Scope)
- Preset tags/categories for organization
- Search/filter preset list
- Preset effectiveness scoring (Epic 4 analytics)
- Cloud sync of presets across devices (requires backend)
- Preset sharing gallery (community feature)
