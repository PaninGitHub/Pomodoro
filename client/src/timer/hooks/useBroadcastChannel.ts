import { useEffect, useRef, useState } from 'react';

const CHANNEL_NAME = 'simplidoro_timer';

type Message = { type: 'session_started' | 'session_ended' };

interface UseBroadcastChannelOptions {
  isRunning: boolean;
}

/**
 * Two-tab detection via BroadcastChannel.
 *
 * Implementation note: a tab does NOT receive messages it posts on the SAME
 * BroadcastChannel object, but it DOES receive messages from DIFFERENT
 * BroadcastChannel objects in the same tab. So we must hold a single shared
 * channel reference and use it for both listening and posting — previously
 * we created a second channel just for posting, which caused every tab to
 * see its own messages and falsely flag "other tab running".
 */
export function useBroadcastChannel({ isRunning }: UseBroadcastChannelOptions): { otherTabRunning: boolean } {
  const [otherTabRunning, setOtherTabRunning] = useState<boolean>(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    function handler(ev: MessageEvent<Message>) {
      if (ev.data.type === 'session_started') setOtherTabRunning(true);
      if (ev.data.type === 'session_ended') setOtherTabRunning(false);
    }
    channel.addEventListener('message', handler);

    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel) return;
    channel.postMessage({ type: isRunning ? 'session_started' : 'session_ended' } satisfies Message);
  }, [isRunning]);

  return { otherTabRunning };
}
