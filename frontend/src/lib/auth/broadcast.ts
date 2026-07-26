import { AUTH_BROADCAST_CHANNEL } from "@/lib/auth/constants";

export type AuthBroadcastEvent =
  | { type: "logout"; at: number }
  | { type: "session-updated"; at: number };

function hasBrowserApi() {
  return typeof window !== "undefined";
}

export function broadcastAuthEvent(event: AuthBroadcastEvent) {
  if (!hasBrowserApi() || typeof BroadcastChannel === "undefined") {
    return;
  }

  const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
  channel.postMessage(event);
  channel.close();
}

export function subscribeAuthEvents(handler: (event: AuthBroadcastEvent) => void) {
  if (!hasBrowserApi() || typeof BroadcastChannel === "undefined") {
    return () => undefined;
  }

  const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);

  channel.onmessage = (message: MessageEvent<AuthBroadcastEvent>) => {
    if (!message.data?.type) {
      return;
    }

    handler(message.data);
  };

  return () => channel.close();
}
