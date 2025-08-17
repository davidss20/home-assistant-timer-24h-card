/**
 * Timer 24H Storage Frontend Helper
 * 
 * TypeScript helper for interacting with the Timer 24H Storage integration
 * via Home Assistant's WebSocket connection.
 */

export interface Timer24HSchedule {
  version: number;
  tz: string;
  resolution_minutes: number;
  mask: string;
  entities: string[];
  created_at: string;
  updated_at: string;
}

export interface Timer24HResponse {
  timer_id: string;
  schedule: Timer24HSchedule;
  success: boolean;
}

export interface Timer24HListResponse {
  schedules: Record<string, Timer24HSchedule>;
  count: number;
  success: boolean;
}

export interface Timer24HSummary {
  exists: boolean;
  timer_id: string;
  active_slots?: number;
  total_slots?: number;
  entities_count?: number;
  updated_at?: string;
  resolution_minutes?: number;
}

export interface Timer24HConnection {
  sendMessagePromise: (message: any) => Promise<any>;
  subscribeEvents: (callback: (event: any) => void, eventType?: string) => () => void;
}

declare global {
  interface Window {
    hassConnection?: Timer24HConnection;
  }
}

/**
 * Timer 24H Storage Client
 * 
 * Provides easy access to server-side timer storage through WebSocket API.
 */
export class Timer24HStorageClient {
  private connection: Timer24HConnection;
  private eventListeners: (() => void)[] = [];

  constructor(connection?: Timer24HConnection) {
    this.connection = connection || window.hassConnection!;
    
    if (!this.connection) {
      throw new Error('Home Assistant connection not available');
    }
  }

  /**
   * Get a timer schedule by ID.
   * Creates a default schedule if it doesn't exist.
   */
  async get(timerId: string): Promise<Timer24HSchedule> {
    const response = await this.connection.sendMessagePromise({
      type: 'timer_24h/get',
      timer_id: timerId,
    });

    if (!response.success) {
      throw new Error(`Failed to get timer ${timerId}: ${response.error}`);
    }

    return response.schedule;
  }

  /**
   * Set/update a timer schedule.
   */
  async set(
    timerId: string,
    options: {
      mask?: string;
      entities?: string[];
      resolution_minutes?: number;
    } = {}
  ): Promise<Timer24HSchedule> {
    const message: any = {
      type: 'timer_24h/set',
      timer_id: timerId,
    };

    if (options.mask !== undefined) {
      message.mask = options.mask;
    }
    if (options.entities !== undefined) {
      message.entities = options.entities;
    }
    if (options.resolution_minutes !== undefined) {
      message.resolution_minutes = options.resolution_minutes;
    }

    const response = await this.connection.sendMessagePromise(message);

    if (!response.success) {
      throw new Error(`Failed to set timer ${timerId}: ${response.error}`);
    }

    return response.schedule;
  }

  /**
   * Ensure a timer exists with default values.
   * Returns existing schedule if found, creates default if not.
   */
  async ensure(timerId: string): Promise<Timer24HSchedule> {
    return this.get(timerId); // get() automatically creates default if not exists
  }

  /**
   * Delete a timer schedule.
   */
  async delete(timerId: string): Promise<boolean> {
    const response = await this.connection.sendMessagePromise({
      type: 'timer_24h/delete',
      timer_id: timerId,
    });

    if (!response.success) {
      throw new Error(`Failed to delete timer ${timerId}: ${response.error}`);
    }

    return response.deleted;
  }

  /**
   * List all timer schedules.
   */
  async list(summaryOnly: boolean = false): Promise<Record<string, Timer24HSchedule | Timer24HSummary>> {
    const response = await this.connection.sendMessagePromise({
      type: 'timer_24h/list',
      summary_only: summaryOnly,
    });

    if (!response.success) {
      throw new Error(`Failed to list timers: ${response.error}`);
    }

    return response.schedules;
  }

  /**
   * Subscribe to timer schedule updates.
   * Returns unsubscribe function.
   */
  onScheduleUpdated(callback: (timerId: string, schedule: Timer24HSchedule) => void): () => void {
    const unsubscribe = this.connection.subscribeEvents((event: any) => {
      if (event.event_type === 'timer_24h_schedule_updated') {
        callback(event.data.timer_id, event.data.schedule);
      }
    });

    this.eventListeners.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to timer schedule deletions.
   * Returns unsubscribe function.
   */
  onScheduleDeleted(callback: (timerId: string) => void): () => void {
    const unsubscribe = this.connection.subscribeEvents((event: any) => {
      if (event.event_type === 'timer_24h_schedule_deleted') {
        callback(event.data.timer_id);
      }
    });

    this.eventListeners.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Clean up all event listeners.
   */
  destroy(): void {
    this.eventListeners.forEach(unsubscribe => unsubscribe());
    this.eventListeners = [];
  }
}

/**
 * Utility functions for working with timer masks.
 */
export class Timer24HMaskUtils {
  /**
   * Create a default mask with all slots off.
   */
  static createDefault(resolutionMinutes: number = 30): string {
    const slotsPerDay = (24 * 60) / resolutionMinutes;
    return '0'.repeat(slotsPerDay);
  }

  /**
   * Set a specific time slot in the mask.
   */
  static setSlot(mask: string, slotIndex: number, active: boolean): string {
    if (slotIndex < 0 || slotIndex >= mask.length) {
      throw new Error(`Slot index ${slotIndex} out of range`);
    }
    
    const chars = mask.split('');
    chars[slotIndex] = active ? '1' : '0';
    return chars.join('');
  }

  /**
   * Get the state of a specific time slot.
   */
  static getSlot(mask: string, slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= mask.length) {
      throw new Error(`Slot index ${slotIndex} out of range`);
    }
    
    return mask[slotIndex] === '1';
  }

  /**
   * Convert time (hours, minutes) to slot index.
   */
  static timeToSlotIndex(hours: number, minutes: number, resolutionMinutes: number = 30): number {
    const totalMinutes = hours * 60 + minutes;
    return Math.floor(totalMinutes / resolutionMinutes);
  }

  /**
   * Convert slot index to time (hours, minutes).
   */
  static slotIndexToTime(slotIndex: number, resolutionMinutes: number = 30): { hours: number; minutes: number } {
    const totalMinutes = slotIndex * resolutionMinutes;
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return { hours, minutes };
  }

  /**
   * Count active slots in a mask.
   */
  static countActiveSlots(mask: string): number {
    return (mask.match(/1/g) || []).length;
  }

  /**
   * Get all active time ranges from a mask.
   */
  static getActiveRanges(mask: string, resolutionMinutes: number = 30): Array<{
    start: { hours: number; minutes: number };
    end: { hours: number; minutes: number };
  }> {
    const ranges: Array<{
      start: { hours: number; minutes: number };
      end: { hours: number; minutes: number };
    }> = [];
    
    let rangeStart: number | null = null;
    
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === '1' && rangeStart === null) {
        rangeStart = i;
      } else if (mask[i] === '0' && rangeStart !== null) {
        ranges.push({
          start: this.slotIndexToTime(rangeStart, resolutionMinutes),
          end: this.slotIndexToTime(i, resolutionMinutes),
        });
        rangeStart = null;
      }
    }
    
    // Handle range that extends to end of day
    if (rangeStart !== null) {
      ranges.push({
        start: this.slotIndexToTime(rangeStart, resolutionMinutes),
        end: { hours: 24, minutes: 0 },
      });
    }
    
    return ranges;
  }
}

// Export a default instance for convenience
export const timer24hStorage = new Timer24HStorageClient();
