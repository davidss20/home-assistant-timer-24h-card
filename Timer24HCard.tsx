/**
 * Timer 24H Card React Component
 * 
 * Example React component using the Timer 24H Storage integration
 * with TailwindCSS styling.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Timer24HStorageClient, Timer24HSchedule, Timer24HMaskUtils } from './timer-24h-storage';

interface Timer24HCardProps {
  timerId: string;
  title?: string;
  entities?: string[];
  resolutionMinutes?: number;
  className?: string;
}

interface TimeSlot {
  index: number;
  hours: number;
  minutes: number;
  active: boolean;
}

export const Timer24HCard: React.FC<Timer24HCardProps> = ({
  timerId,
  title = '24H Timer',
  entities = [],
  resolutionMinutes = 30,
  className = '',
}) => {
  const [schedule, setSchedule] = useState<Timer24HSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageClient] = useState(() => new Timer24HStorageClient());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Initialize and load schedule
  useEffect(() => {
    const loadSchedule = async () => {
      try {
        setLoading(true);
        const loadedSchedule = await storageClient.ensure(timerId);
        setSchedule(loadedSchedule);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schedule');
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [timerId, storageClient]);

  // Convert schedule mask to time slots
  useEffect(() => {
    if (!schedule) return;

    const slots: TimeSlot[] = [];
    for (let i = 0; i < schedule.mask.length; i++) {
      const { hours, minutes } = Timer24HMaskUtils.slotIndexToTime(i, schedule.resolution_minutes);
      slots.push({
        index: i,
        hours,
        minutes,
        active: schedule.mask[i] === '1',
      });
    }
    setTimeSlots(slots);
  }, [schedule]);

  // Subscribe to schedule updates
  useEffect(() => {
    const unsubscribe = storageClient.onScheduleUpdated((updatedTimerId, updatedSchedule) => {
      if (updatedTimerId === timerId) {
        setSchedule(updatedSchedule);
      }
    });

    return unsubscribe;
  }, [timerId, storageClient]);

  // Toggle time slot
  const toggleSlot = useCallback(async (slotIndex: number) => {
    if (!schedule) return;

    try {
      const newMask = Timer24HMaskUtils.setSlot(
        schedule.mask,
        slotIndex,
        !Timer24HMaskUtils.getSlot(schedule.mask, slotIndex)
      );

      const updatedSchedule = await storageClient.set(timerId, {
        mask: newMask,
        entities,
      });

      setSchedule(updatedSchedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update schedule');
    }
  }, [schedule, timerId, entities, storageClient]);

  // Format time for display
  const formatTime = (hours: number, minutes: number): string => {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Calculate active slots count
  const activeCount = schedule ? Timer24HMaskUtils.countActiveSlots(schedule.mask) : 0;
  const totalCount = timeSlots.length;

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-300 rounded"></div>
            <div className="h-3 bg-gray-300 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <div className="text-sm text-blue-100">
            {activeCount}/{totalCount} slots active
          </div>
        </div>
      </div>

      {/* Timer Grid */}
      <div className="p-6">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
          {timeSlots.map((slot) => (
            <button
              key={slot.index}
              onClick={() => toggleSlot(slot.index)}
              className={`
                relative p-2 rounded-md text-xs font-medium transition-all duration-200
                hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${slot.active
                  ? 'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
              title={`${formatTime(slot.hours, slot.minutes)} - ${slot.active ? 'Active' : 'Inactive'}`}
            >
              <div className="text-center">
                <div className="font-semibold">
                  {formatTime(slot.hours, slot.minutes)}
                </div>
                {slot.active && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full transform translate-x-1 -translate-y-1"></div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Active Ranges Display */}
        {schedule && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Active Time Ranges</h4>
            {(() => {
              const ranges = Timer24HMaskUtils.getActiveRanges(schedule.mask, schedule.resolution_minutes);
              if (ranges.length === 0) {
                return <p className="text-sm text-gray-500">No active time ranges</p>;
              }
              return (
                <div className="space-y-1">
                  {ranges.map((range, index) => (
                    <div key={index} className="text-sm text-gray-700">
                      <span className="font-medium">
                        {formatTime(range.start.hours, range.start.minutes)} - {formatTime(range.end.hours, range.end.minutes)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Entities */}
        {entities.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Controlled Entities</h4>
            <div className="space-y-1">
              {entities.map((entity, index) => (
                <div key={index} className="text-sm text-blue-700 font-mono">
                  {entity}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div>Resolution: {schedule?.resolution_minutes}min</div>
            <div>Updated: {schedule && new Date(schedule.updated_at).toLocaleTimeString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timer24HCard;
