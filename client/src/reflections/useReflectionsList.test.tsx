import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useReflectionsList } from './useReflectionsList';

describe('useReflectionsList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns loading: true initially then reflections on success', async () => {
    const mockReflections = [
      { id: 'r1', session_id: 's1', type: 'session', period_number: null, focus_rating: 4, answers: {}, tasks_snapshot: [], created_at: '2026-05-30T19:00:00Z' },
    ];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ reflections: mockReflections }), { status: 200 }),
    );

    const { result } = renderHook(() => useReflectionsList({}));
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.reflections).toEqual(mockReflections);
    expect(result.current.error).toBeNull();
  });

  it('sets error on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useReflectionsList({}));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).not.toBeNull();
    expect(result.current.reflections).toEqual([]);
  });

  it('sets error on non-200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }));

    const { result } = renderHook(() => useReflectionsList({}));
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.error).not.toBeNull();
  });

  it('serializes filters into query string', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ reflections: [] }), { status: 200 }),
    );

    renderHook(() =>
      useReflectionsList({
        from: '2026-01-01',
        to: '2026-12-31',
        focus_rating: 3,
        task_name: 'reading',
      }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('from=2026-01-01');
    expect(url).toContain('to=2026-12-31');
    expect(url).toContain('focus_rating=3');
    expect(url).toContain('task_name=reading');
  });

  it('omits empty / undefined filters from the query string', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ reflections: [] }), { status: 200 }),
    );
    renderHook(() => useReflectionsList({ task_name: '' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).not.toContain('task_name=');
  });
});
