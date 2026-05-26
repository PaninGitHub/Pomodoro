import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure the DOM is reset between tests (testing-library auto-cleanup needs globals=true,
// but we keep globals=false for clarity, so we wire cleanup manually).
afterEach(() => cleanup());
