import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ReflectionPromptsProvider } from './ReflectionContext';
import { useReflectionPrompts } from './useReflectionPrompts';
import { AuthContext, type AuthState } from '../auth/AuthContext';

function makeWrapper(authState: AuthState) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider
        value={{
          state: authState,
          refresh: async () => {},
          logout: async () => {},
        }}
      >
        <ReflectionPromptsProvider>{children}</ReflectionPromptsProvider>
      </AuthContext.Provider>
    );
  };
}

const signedInState: AuthState = {
  kind: 'signed_in',
  user: {
    id: 'u1',
    email: 'u@x.com',
    display_name: 'User',
    avatar_url: null,
  },
};

describe('useReflectionPrompts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns defaults synchronously, then merges DB prompts after fetch', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ prompts: { did_well: 'Custom did_well from DB' } }), { status: 200 }),
    );
    const { result } = renderHook(() => useReflectionPrompts(), {
      wrapper: makeWrapper(signedInState),
    });

    // Synchronous default (from config) — first render must already have text.
    expect(result.current.prompts.did_well).toBe('What did you do well?');

    // After fetch, custom value wins.
    await waitFor(() => {
      expect(result.current.prompts.did_well).toBe('Custom did_well from DB');
    });

    // Untouched keys still defaults.
    expect(result.current.prompts.do_better).toBe('What can you do better?');
    expect(fetchMock).toHaveBeenCalledWith('/api/prompts', expect.objectContaining({ credentials: 'include' }));
  });

  it('keeps defaults when user is signed_out (no fetch)', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }));
    const { result } = renderHook(() => useReflectionPrompts(), {
      wrapper: makeWrapper({ kind: 'signed_out' }),
    });
    expect(result.current.prompts.did_well).toBe('What did you do well?');
    // Give any potential effect a chance to run.
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps defaults when fetch fails (network error)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useReflectionPrompts(), {
      wrapper: makeWrapper(signedInState),
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current.prompts.did_well).toBe('What did you do well?');
  });

  it('keeps defaults when server returns 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }));
    const { result } = renderHook(() => useReflectionPrompts(), {
      wrapper: makeWrapper(signedInState),
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current.prompts.did_well).toBe('What did you do well?');
  });
});
