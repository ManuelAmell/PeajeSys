import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

class MockStorage implements Storage {
  private store: Record<string, string> = {};

  get length() {
    return Object.keys(this.store).length;
  }

  clear() {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

const mockLocal = new MockStorage();
const mockSession = new MockStorage();

Object.defineProperty(window, 'localStorage', {
  value: mockLocal,
  writable: true,
});
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocal,
  writable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSession,
  writable: true,
});
Object.defineProperty(globalThis, 'sessionStorage', {
  value: mockSession,
  writable: true,
});

afterEach(() => {
  cleanup();
  mockLocal.clear();
  mockSession.clear();
});

// Mock de matchMedia para pruebas en jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock de ResizeObserver si no existe en jsdom
if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock de scrollTo
window.scrollTo = vi.fn();
