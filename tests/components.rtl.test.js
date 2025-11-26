/**
 * React Testing Library Component Tests
 * Tests for component lifecycle, user interactions, and state management
 * Added in Epic 6 retrospective to fulfill action item carried since Epic 2
 */
import React, { useState, useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ============================================
// Test Components (mirror app patterns)
// ============================================

/**
 * Toggle Component - mirrors accessibility toggles in index.html
 * Tests: mounting, user interaction, state persistence
 */
function Toggle({ label, storageKey, defaultValue = false, onChange }) {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === 'true' : defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, String(enabled));
    if (onChange) onChange(enabled);
  }, [enabled, storageKey, onChange]);

  return (
    <label data-testid="toggle-container">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => setEnabled(e.target.checked)}
        aria-label={label}
        data-testid="toggle-input"
      />
      <span data-testid="toggle-label">{label}</span>
      <span data-testid="toggle-status">{enabled ? 'ON' : 'OFF'}</span>
    </label>
  );
}

/**
 * Banner Component - mirrors offline/update banners in index.html
 * Tests: conditional rendering, ARIA attributes, auto-dismiss
 */
function Banner({ show, message, type = 'info', onDismiss, autoDismiss = false }) {
  useEffect(() => {
    if (show && autoDismiss && onDismiss) {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, autoDismiss, onDismiss]);

  if (!show) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="banner"
      className={`banner banner-${type}`}
    >
      <span data-testid="banner-message">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          data-testid="banner-dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}

/**
 * TabPanel Component - mirrors debug panel tabs in index.html
 * Tests: tab switching, keyboard navigation, content updates
 */
function TabPanel({ tabs, defaultTab = 0 }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      setActiveTab((index + 1) % tabs.length);
    } else if (e.key === 'ArrowLeft') {
      setActiveTab((index - 1 + tabs.length) % tabs.length);
    }
  };

  return (
    <div data-testid="tab-panel">
      <div role="tablist" data-testid="tab-list">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`panel-${tab.id}`}
            data-testid={`tab-${tab.id}`}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            tabIndex={activeTab === index ? 0 : -1}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== index}
          data-testid={`panel-${tab.id}`}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

// ============================================
// Test Suites
// ============================================

describe('Toggle Component Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('mounts with default value when no stored preference', () => {
    render(<Toggle label="Test Toggle" storageKey="test_toggle" defaultValue={false} />);

    expect(screen.getByTestId('toggle-input')).not.toBeChecked();
    expect(screen.getByTestId('toggle-status')).toHaveTextContent('OFF');
  });

  test('mounts with stored preference from localStorage', () => {
    localStorage.getItem.mockReturnValue('true');

    render(<Toggle label="Test Toggle" storageKey="test_toggle" />);

    expect(localStorage.getItem).toHaveBeenCalledWith('test_toggle');
    expect(screen.getByTestId('toggle-input')).toBeChecked();
    expect(screen.getByTestId('toggle-status')).toHaveTextContent('ON');
  });

  test('persists initial state to localStorage on mount', () => {
    localStorage.getItem.mockReturnValue(null);

    render(
      <Toggle label="Test Toggle" storageKey="test_toggle" defaultValue={false} />
    );

    // useEffect should have persisted the initial state to localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('test_toggle', 'false');
  });

  test('calls onChange callback when toggled', () => {
    const handleChange = jest.fn();
    render(
      <Toggle
        label="Test Toggle"
        storageKey="test_toggle"
        defaultValue={false}
        onChange={handleChange}
      />
    );

    fireEvent.click(screen.getByTestId('toggle-input'));

    expect(handleChange).toHaveBeenCalledWith(true);
  });

  test('has proper accessibility attributes', () => {
    render(<Toggle label="Reduced Motion" storageKey="reduced_motion" />);

    const input = screen.getByTestId('toggle-input');
    expect(input).toHaveAttribute('aria-label', 'Reduced Motion');
  });
});

describe('Banner Component Lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('does not render when show is false', () => {
    render(<Banner show={false} message="Test message" />);

    expect(screen.queryByTestId('banner')).not.toBeInTheDocument();
  });

  test('renders with correct content when show is true', () => {
    render(<Banner show={true} message="You are offline" type="warning" />);

    const banner = screen.getByTestId('banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('role', 'alert');
    expect(banner).toHaveClass('banner-warning');
    expect(screen.getByTestId('banner-message')).toHaveTextContent('You are offline');
  });

  test('calls onDismiss when dismiss button clicked', () => {
    const handleDismiss = jest.fn();
    render(<Banner show={true} message="Test" onDismiss={handleDismiss} />);

    fireEvent.click(screen.getByTestId('banner-dismiss'));

    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  test('auto-dismisses after timeout when autoDismiss is true', () => {
    const handleDismiss = jest.fn();
    render(
      <Banner
        show={true}
        message="Auto dismiss"
        onDismiss={handleDismiss}
        autoDismiss={true}
      />
    );

    expect(handleDismiss).not.toHaveBeenCalled();

    jest.advanceTimersByTime(3000);

    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  test('cleans up timer on unmount', () => {
    const handleDismiss = jest.fn();
    const { unmount } = render(
      <Banner
        show={true}
        message="Test"
        onDismiss={handleDismiss}
        autoDismiss={true}
      />
    );

    unmount();
    jest.advanceTimersByTime(3000);

    // Should not have been called because component unmounted
    expect(handleDismiss).not.toHaveBeenCalled();
  });

  test('has proper ARIA attributes for screen readers', () => {
    render(<Banner show={true} message="Alert message" onDismiss={() => {}} />);

    const banner = screen.getByTestId('banner');
    expect(banner).toHaveAttribute('role', 'alert');
    expect(banner).toHaveAttribute('aria-live', 'polite');

    const dismissBtn = screen.getByTestId('banner-dismiss');
    expect(dismissBtn).toHaveAttribute('aria-label', 'Dismiss');
  });
});

describe('TabPanel Component Lifecycle', () => {
  const mockTabs = [
    { id: 'audio', label: 'Audio', content: 'Audio content here' },
    { id: 'sensor', label: 'Sensor', content: 'Sensor content here' },
    { id: 'session', label: 'Session', content: 'Session content here' },
    { id: 'pwa', label: 'PWA', content: 'PWA content here' },
  ];

  test('renders all tabs and shows first tab content by default', () => {
    render(<TabPanel tabs={mockTabs} />);

    expect(screen.getByTestId('tab-audio')).toBeInTheDocument();
    expect(screen.getByTestId('tab-sensor')).toBeInTheDocument();
    expect(screen.getByTestId('tab-session')).toBeInTheDocument();
    expect(screen.getByTestId('tab-pwa')).toBeInTheDocument();

    expect(screen.getByTestId('panel-audio')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('panel-sensor')).toHaveAttribute('hidden');
  });

  test('switches content when tab is clicked', () => {
    render(<TabPanel tabs={mockTabs} />);

    fireEvent.click(screen.getByTestId('tab-sensor'));

    expect(screen.getByTestId('panel-audio')).toHaveAttribute('hidden');
    expect(screen.getByTestId('panel-sensor')).not.toHaveAttribute('hidden');
    expect(screen.getByTestId('panel-sensor')).toHaveTextContent('Sensor content here');
  });

  test('supports keyboard navigation with arrow keys', () => {
    render(<TabPanel tabs={mockTabs} />);

    const audioTab = screen.getByTestId('tab-audio');
    fireEvent.keyDown(audioTab, { key: 'ArrowRight' });

    expect(screen.getByTestId('tab-sensor')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('panel-sensor')).not.toHaveAttribute('hidden');
  });

  test('wraps around when navigating past last tab', () => {
    render(<TabPanel tabs={mockTabs} defaultTab={3} />);

    const pwaTab = screen.getByTestId('tab-pwa');
    fireEvent.keyDown(pwaTab, { key: 'ArrowRight' });

    expect(screen.getByTestId('tab-audio')).toHaveAttribute('aria-selected', 'true');
  });

  test('has proper ARIA attributes for accessibility', () => {
    render(<TabPanel tabs={mockTabs} />);

    expect(screen.getByTestId('tab-list')).toHaveAttribute('role', 'tablist');

    const audioTab = screen.getByTestId('tab-audio');
    expect(audioTab).toHaveAttribute('role', 'tab');
    expect(audioTab).toHaveAttribute('aria-selected', 'true');
    expect(audioTab).toHaveAttribute('aria-controls', 'panel-audio');

    const audioPanel = screen.getByTestId('panel-audio');
    expect(audioPanel).toHaveAttribute('role', 'tabpanel');
    expect(audioPanel).toHaveAttribute('aria-labelledby', 'tab-audio');
  });

  test('manages focus with roving tabindex', () => {
    render(<TabPanel tabs={mockTabs} />);

    expect(screen.getByTestId('tab-audio')).toHaveAttribute('tabIndex', '0');
    expect(screen.getByTestId('tab-sensor')).toHaveAttribute('tabIndex', '-1');

    fireEvent.click(screen.getByTestId('tab-sensor'));

    expect(screen.getByTestId('tab-audio')).toHaveAttribute('tabIndex', '-1');
    expect(screen.getByTestId('tab-sensor')).toHaveAttribute('tabIndex', '0');
  });
});
