import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ControlPlaneSimulationStore } from './simulation';

describe('ControlPlaneSimulationStore', () => {
  let store: ControlPlaneSimulationStore;

  beforeEach(() => {
    // We use fake timers since startSimulation uses setInterval and tick uses Date
    vi.useFakeTimers();
    // We create a fresh instance of the store for each test to isolate tests
    store = new ControlPlaneSimulationStore();
  });

  afterEach(() => {
    // Clean up interval and restore timers
    store.stopSimulation();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('subscribes and calls listeners when notify is triggered (e.g. via triggerManualRun)', () => {
    const listener = vi.fn();

    // Subscribe to store updates
    const unsubscribe = store.subscribe(listener);

    // Initial state: listener not called
    expect(listener).not.toHaveBeenCalled();

    // Trigger a change that calls notify()
    store.triggerManualRun('Test intent');

    // Listener should be called once after triggerManualRun
    expect(listener).toHaveBeenCalledTimes(1);

    // Unsubscribe from store updates
    unsubscribe();

    // Trigger another change
    store.triggerManualRun('Another intent');

    // Listener should still only have been called once
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('starts and stops the simulation tick interval properly', () => {
    const listener = vi.fn();
    store.subscribe(listener);

    // Initial listener call count is 0
    expect(listener).not.toHaveBeenCalled();

    // The store automatically starts the simulation in other places (the module exports a running store),
    // but we can test explicit stop and start

    // Stop simulation first if it was started
    store.stopSimulation();

    // Fast forward time, listener shouldn't be called because simulation is stopped
    vi.advanceTimersByTime(2000);
    expect(listener).not.toHaveBeenCalled();

    // Start simulation explicitly
    store.startSimulation();

    // Tick interval is 1800ms, fast forward 1800ms
    vi.advanceTimersByTime(1800);

    // The tick method calls notify(), so listener should be called
    expect(listener).toHaveBeenCalledTimes(1);

    // Fast forward another 1800ms
    vi.advanceTimersByTime(1800);
    expect(listener).toHaveBeenCalledTimes(2);

    // Stop the simulation
    store.stopSimulation();

    // Fast forward time, listener shouldn't be called anymore
    vi.advanceTimersByTime(2000);
    expect(listener).toHaveBeenCalledTimes(2); // Still 2
  });

  it('prevents starting multiple intervals if startSimulation is called consecutively', () => {
    const listener = vi.fn();
    store.subscribe(listener);

    store.stopSimulation(); // Ensure it's stopped first
    expect(listener).not.toHaveBeenCalled();

    store.startSimulation();
    store.startSimulation(); // Second call shouldn't create a new interval

    // Fast forward one tick interval
    vi.advanceTimersByTime(1800);

    // If there were two intervals, it might have been called twice, but it should be once
    expect(listener).toHaveBeenCalledTimes(1);
  });

});
