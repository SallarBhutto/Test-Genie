
interface SyncEvent {
  id: string;
  timestamp: Date;
  type: 'webhook_received' | 'sync_success' | 'sync_error';
  workItemId?: number;
  defectId?: string;
  message: string;
  error?: string;
}

class EventLogger {
  private events: SyncEvent[] = [];
  private maxEvents = 100; // Keep last 100 events

  logEvent(event: Omit<SyncEvent, 'id' | 'timestamp'>) {
    const syncEvent: SyncEvent = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...event
    };

    this.events.unshift(syncEvent);
    
    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    console.log(`📝 Event logged: ${event.type} - ${event.message}`);
  }

  getRecentEvents(limit: number = 20): SyncEvent[] {
    return this.events.slice(0, limit);
  }

  getEventsByType(type: SyncEvent['type'], limit: number = 10): SyncEvent[] {
    return this.events.filter(event => event.type === type).slice(0, limit);
  }

  clearEvents() {
    this.events = [];
    console.log("📝 Event log cleared");
  }
}

export const eventLogger = new EventLogger();
export type { SyncEvent };
