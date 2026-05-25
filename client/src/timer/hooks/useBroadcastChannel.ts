import { useEffect, useState } from 'react';

const CHANNEL_NAME = 'simplidoro_timer';

type Message = { type: 'session_started' | 'session_ended' };

interface UseBroadcastChannelOptions {
  isRunning: boolean;
}

export function useBroadcastChannel({ isRunning }: UseBroadcastChannelOptions): { otherTabRunning: boolean } {
  const [otherTabRunning, setOtherTabRunning] = useState<boolean>(false);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL_NAME);

    function handler(ev: MessageEvent<Message>) {
      if (ev.data.type === 'session_started') setOtherTabRunning(true);
      if (ev.data.type === 'session_ended') setOtherTabRunning(false);
    }
    channel.addEventListener('message', handler);

    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
    };
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: isRunning ? 'session_started' : 'session_ended' } satisfies Message);
    channel.close();
  }, [isRunning]);

  return { otherTabRunning };
}
