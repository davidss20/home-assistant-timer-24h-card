# Timer 24H Storage Integration

A Home Assistant custom integration that provides **automatic server-side storage for 24-hour timer schedules** without requiring manual configuration or helper entities.

## Features

- **Zero Configuration**: Install and use immediately - no manual setup required
- **Automatic Storage**: Uses `homeassistant.helpers.storage.Store` for persistent data storage
- **WebSocket API**: Real-time communication between frontend and backend
- **Cross-Device Sync**: Changes are instantly available on all connected devices
- **TypeScript Support**: Complete TypeScript definitions and helper classes
- **React Components**: Ready-to-use React components with TailwindCSS styling

## Installation

### 1. Copy Integration Files

Copy the `custom_components/timer_24h/` directory to your Home Assistant `custom_components` folder:

```
custom_components/
└── timer_24h/
    ├── __init__.py
    ├── const.py
    ├── manifest.json
    ├── storage.py
    └── websocket.py
```

### 2. Restart Home Assistant

Restart Home Assistant to load the integration.

### 3. Verify Installation

Check the Home Assistant logs for:
```
Timer 24H Storage integration setup complete
Timer 24H WebSocket API handlers registered
```

## Storage Format

Timer schedules are stored in `.storage/timer_24h.json` with the following structure:

```json
{
  "lighting_timer": {
    "version": 1,
    "tz": "America/New_York",
    "resolution_minutes": 30,
    "mask": "000000001111111111110000000000000000000000000000",
    "entities": ["light.living_room", "light.kitchen"],
    "created_at": "2024-01-15T10:30:00.000000+00:00",
    "updated_at": "2024-01-15T15:45:00.000000+00:00"
  }
}
```

### Field Descriptions

- **`version`**: Storage format version (currently 1)
- **`tz`**: Timezone string
- **`resolution_minutes`**: Time slot resolution in minutes (default: 30)
- **`mask`**: Binary string representing active/inactive time slots ("1" = active, "0" = inactive)
- **`entities`**: Array of Home Assistant entity IDs to control
- **`created_at`**: ISO timestamp when timer was first created
- **`updated_at`**: ISO timestamp when timer was last modified

## WebSocket API

The integration provides four WebSocket commands:

### `timer_24h/get`

Retrieve a timer schedule by ID. Creates a default schedule if it doesn't exist.

```javascript
await hass.connection.sendMessagePromise({
  type: 'timer_24h/get',
  timer_id: 'my_timer'
});
```

**Response:**
```javascript
{
  timer_id: 'my_timer',
  schedule: { /* Timer24HSchedule object */ },
  success: true
}
```

### `timer_24h/set`

Create or update a timer schedule.

```javascript
await hass.connection.sendMessagePromise({
  type: 'timer_24h/set',
  timer_id: 'my_timer',
  mask: '000011110000...', // Optional
  entities: ['light.living_room'], // Optional
  resolution_minutes: 30 // Optional
});
```

**Response:**
```javascript
{
  timer_id: 'my_timer',
  schedule: { /* Updated Timer24HSchedule object */ },
  success: true
}
```

### `timer_24h/delete`

Delete a timer schedule.

```javascript
await hass.connection.sendMessagePromise({
  type: 'timer_24h/delete',
  timer_id: 'my_timer'
});
```

**Response:**
```javascript
{
  timer_id: 'my_timer',
  deleted: true,
  success: true
}
```

### `timer_24h/list`

List all timer schedules.

```javascript
await hass.connection.sendMessagePromise({
  type: 'timer_24h/list',
  summary_only: false // Optional: true for summaries only
});
```

**Response:**
```javascript
{
  schedules: { /* Record<string, Timer24HSchedule> */ },
  count: 5,
  success: true
}
```

## TypeScript Frontend Helper

### Installation

Include the TypeScript helper in your project:

```typescript
import { Timer24HStorageClient, Timer24HMaskUtils } from './timer-24h-storage';
```

### Basic Usage

```typescript
// Create client
const client = new Timer24HStorageClient();

// Get/create a timer schedule
const schedule = await client.ensure('my_timer');

// Update the schedule
await client.set('my_timer', {
  mask: '000011110000111100000000000000000000000000000000',
  entities: ['light.living_room', 'light.kitchen']
});

// Subscribe to updates
const unsubscribe = client.onScheduleUpdated((timerId, schedule) => {
  console.log(`Timer ${timerId} updated:`, schedule);
});

// Clean up
unsubscribe();
client.destroy();
```

### Mask Utilities

The `Timer24HMaskUtils` class provides helpful utilities for working with timer masks:

```typescript
// Create default mask (all slots off)
const defaultMask = Timer24HMaskUtils.createDefault(30); // 30-minute resolution

// Set a specific time slot
const newMask = Timer24HMaskUtils.setSlot(mask, 10, true); // Activate slot 10

// Convert time to slot index
const slotIndex = Timer24HMaskUtils.timeToSlotIndex(9, 30, 30); // 9:30 AM with 30min resolution

// Get active time ranges
const ranges = Timer24HMaskUtils.getActiveRanges(mask, 30);
// Returns: [{ start: { hours: 9, minutes: 0 }, end: { hours: 12, minutes: 0 } }, ...]
```

## React Component Example

Use the provided React component with TailwindCSS:

```tsx
import { Timer24HCard } from './Timer24HCard';

function MyDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Timer24HCard
        timerId="living_room_lights"
        title="Living Room Schedule"
        entities={['light.living_room', 'light.kitchen']}
        resolutionMinutes={30}
        className="col-span-1"
      />
      <Timer24HCard
        timerId="bedroom_lights"
        title="Bedroom Schedule"
        entities={['light.bedroom']}
        resolutionMinutes={15}
        className="col-span-1"
      />
    </div>
  );
}
```

## Integration with Existing Timer Card

To integrate with your existing timer card, replace the localStorage-based storage with the Timer 24H Storage client:

```typescript
// Old localStorage approach
localStorage.setItem('timer-data', JSON.stringify(timerData));

// New server-side storage approach
const client = new Timer24HStorageClient();
await client.set('my_timer', {
  mask: timerMaskString,
  entities: controlledEntities
});
```

## Events

The integration fires Home Assistant events for real-time synchronization:

- **`timer_24h_schedule_updated`**: Fired when a schedule is updated
- **`timer_24h_schedule_deleted`**: Fired when a schedule is deleted

Subscribe to these events to keep your UI synchronized across all connected clients.

## Error Handling

All WebSocket commands include error handling:

```typescript
try {
  const schedule = await client.get('my_timer');
} catch (error) {
  console.error('Failed to get timer:', error.message);
  // Handle error (show notification, fallback behavior, etc.)
}
```

## Performance Considerations

- **Efficient Storage**: Only changed data is written to storage
- **Minimal Network Traffic**: WebSocket commands are lightweight
- **Automatic Cleanup**: Event listeners are properly managed
- **Summary Mode**: Use `list(true)` for performance when you only need summaries

## Development

### Adding New Features

1. **Backend**: Add new WebSocket commands in `websocket.py`
2. **Storage**: Extend storage methods in `storage.py`
3. **Frontend**: Update TypeScript interfaces and client methods
4. **Components**: Create/update React components as needed

### Testing

Test the integration using Home Assistant's Developer Tools:

1. Go to **Developer Tools** → **Services**
2. Use the WebSocket API tab to send commands manually
3. Check `.storage/timer_24h.json` for data persistence
4. Verify cross-device synchronization

## Troubleshooting

### Integration Not Loading

1. Check Home Assistant logs for errors
2. Verify file permissions in `custom_components/timer_24h/`
3. Ensure all required Python dependencies are available

### WebSocket Commands Failing

1. Check that the integration is properly loaded
2. Verify WebSocket connection is active
3. Check command syntax and required parameters

### Data Not Persisting

1. Verify Home Assistant has write permissions to `.storage/`
2. Check for storage-related errors in logs
3. Ensure sufficient disk space is available

### Cross-Device Sync Issues

1. Verify all devices are connected to the same Home Assistant instance
2. Check WebSocket connection status
3. Ensure event listeners are properly registered

## Migration from localStorage

If you're migrating from a localStorage-based solution:

1. Export existing timer data from localStorage
2. Convert to the Timer 24H Storage format
3. Use the `set` API to import data
4. Update frontend code to use the new client
5. Remove localStorage-based code

## License

This integration is provided under the same license as your Home Assistant installation.
