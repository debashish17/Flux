import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
    cleanup();
});

// Default Supabase env vars so the singleton client doesn't throw on import
import.meta.env.VITE_SUPABASE_URL ||= 'https://test.supabase.co';
import.meta.env.VITE_SUPABASE_ANON_KEY ||= 'test-anon-key';

// Stub window.matchMedia (some libs use it)
window.matchMedia ||= vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
}));
