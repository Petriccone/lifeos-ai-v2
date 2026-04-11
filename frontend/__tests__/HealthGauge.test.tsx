import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import HealthGauge from '@/components/HealthGauge';

// HealthGauge delays its animated value by 300ms via setTimeout; tests use fake
// timers to advance past that so the final score is rendered deterministically.
describe('HealthGauge', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders the provided score of 84', () => {
    vi.useFakeTimers();
    render(<HealthGauge score={84} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText('84')).toBeTruthy();
  });

  it('renders a score of 0', () => {
    vi.useFakeTimers();
    render(<HealthGauge score={0} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('renders a score of 100', () => {
    vi.useFakeTimers();
    render(<HealthGauge score={100} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText('100')).toBeTruthy();
  });

  it('renders an SVG at the default size of 200', () => {
    vi.useFakeTimers();
    const { container } = render(<HealthGauge score={50} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('width')).toBe('200');
    expect(svg?.getAttribute('height')).toBe('200');
  });

  it('respects a custom size prop', () => {
    vi.useFakeTimers();
    const { container } = render(<HealthGauge score={50} size={180} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('180');
    expect(svg?.getAttribute('height')).toBe('180');
  });
});
