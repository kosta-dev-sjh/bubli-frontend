import {
  deriveRealtimeTopicKey,
  parseRealtimeEvent,
  toRealtimeTopicKey,
} from "@/lib/realtime/events";
import type { BubliRealtimeEvent, RealtimeEventType, RealtimeTopic } from "@/types/realtime";

export type RealtimeEventHandler<TEvent extends BubliRealtimeEvent = BubliRealtimeEvent> = (
  event: TEvent,
) => void;

export type RealtimeDispatcherOptions = {
  dedupeLimit?: number;
};

export type RealtimeDispatcher = {
  clear: () => void;
  dispatch: (input: unknown) => BubliRealtimeEvent | null;
  subscribe: (handler: RealtimeEventHandler) => () => void;
  subscribeToEventType: <TType extends RealtimeEventType>(
    eventType: TType,
    handler: RealtimeEventHandler<Extract<BubliRealtimeEvent, { eventType: TType }>>,
  ) => () => void;
  subscribeToTopic: (topic: RealtimeTopic, handler: RealtimeEventHandler) => () => void;
};

const DEFAULT_DEDUPE_LIMIT = 500;

export function createRealtimeDispatcher(
  options: RealtimeDispatcherOptions = {},
): RealtimeDispatcher {
  const allHandlers = new Set<RealtimeEventHandler>();
  const typeHandlers = new Map<RealtimeEventType, Set<RealtimeEventHandler>>();
  const topicHandlers = new Map<string, Set<RealtimeEventHandler>>();
  const seenEventIds = new Set<string>();
  const seenQueue: string[] = [];
  const dedupeLimit = options.dedupeLimit ?? DEFAULT_DEDUPE_LIMIT;

  function remember(eventId: string): boolean {
    if (seenEventIds.has(eventId)) {
      return false;
    }
    seenEventIds.add(eventId);
    seenQueue.push(eventId);
    if (seenQueue.length > dedupeLimit) {
      const oldest = seenQueue.shift();
      if (oldest) {
        seenEventIds.delete(oldest);
      }
    }
    return true;
  }

  function notify(handlers: Set<RealtimeEventHandler> | undefined, event: BubliRealtimeEvent) {
    handlers?.forEach((handler) => handler(event));
  }

  return {
    clear() {
      seenEventIds.clear();
      seenQueue.length = 0;
    },
    dispatch(input) {
      const event = parseRealtimeEvent(input);
      if (!event || !remember(event.eventId)) {
        return null;
      }

      notify(allHandlers, event);
      notify(typeHandlers.get(event.eventType), event);
      notify(topicHandlers.get(deriveRealtimeTopicKey(event)), event);

      return event;
    },
    subscribe(handler) {
      allHandlers.add(handler);
      return () => {
        allHandlers.delete(handler);
      };
    },
    subscribeToEventType(eventType, handler) {
      const handlers = typeHandlers.get(eventType) ?? new Set<RealtimeEventHandler>();
      handlers.add(handler as RealtimeEventHandler);
      typeHandlers.set(eventType, handlers);
      return () => {
        handlers.delete(handler as RealtimeEventHandler);
        if (handlers.size === 0) {
          typeHandlers.delete(eventType);
        }
      };
    },
    subscribeToTopic(topic, handler) {
      const topicKey = toRealtimeTopicKey(topic);
      const handlers = topicHandlers.get(topicKey) ?? new Set<RealtimeEventHandler>();
      handlers.add(handler);
      topicHandlers.set(topicKey, handlers);
      return () => {
        handlers.delete(handler);
        if (handlers.size === 0) {
          topicHandlers.delete(topicKey);
        }
      };
    },
  };
}
