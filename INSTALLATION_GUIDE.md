# Timer 24H Storage Integration - Installation Guide

This guide walks you through installing and setting up the Timer 24H Storage integration for automatic server-side timer synchronization.

## Prerequisites

- Home Assistant 2023.1 or later
- Access to Home Assistant configuration files
- Basic knowledge of Home Assistant custom integrations

## Installation Steps

### Step 1: Download Integration Files

Create the integration directory structure in your Home Assistant configuration:

```
config/
└── custom_components/
    └── timer_24h/
        ├── __init__.py
        ├── const.py
        ├── manifest.json
        ├── storage.py
        └── websocket.py
```

### Step 2: Copy Files

Copy all the integration files from this repository to your `custom_components/timer_24h/` directory.

### Step 3: Restart Home Assistant

Restart Home Assistant to load the new integration. You can do this through:

- **Settings** → **System** → **Restart**
- Or use the restart service in Developer Tools

### Step 4: Verify Installation

Check the Home Assistant logs for successful installation:

1. Go to **Settings** → **System** → **Logs**
2. Look for these messages:
   ```
   Timer 24H Storage integration setup complete
   Timer 24H WebSocket API handlers registered
   ```

If you see error messages, check the troubleshooting section below.

### Step 5: Test WebSocket API

Test the integration using Developer Tools:

1. Go to **Developer Tools** → **Services**
2. Switch to the **WebSocket** tab
3. Send a test command:
   ```json
   {
     "type": "timer_24h/get",
     "timer_id": "test_timer"
   }
   ```
4. You should receive a response with a default timer schedule

## Updating Existing Timer Card

If you have an existing timer card using localStorage, update it to use the new integration:

### Option 1: Automatic Integration (Recommended)

The updated timer card will automatically detect and use the Timer 24H Storage integration. No configuration changes needed.

### Option 2: Manual Configuration

Add the integration preference to your card configuration:

```yaml
type: custom:timer-24h-card
title: "My Timer"
entities:
  - light.living_room
save_state: true
save_to_ha: true  # Enable Timer 24H Storage (default: true)
```

## Frontend Integration

### For TypeScript/JavaScript Projects

1. Copy `timer-24h-storage.ts` to your project
2. Import and use the client:

```typescript
import { Timer24HStorageClient } from './timer-24h-storage';

const client = new Timer24HStorageClient();
const schedule = await client.ensure('my_timer');
```

### For React Projects

1. Copy both `timer-24h-storage.ts` and `Timer24HCard.tsx`
2. Install TailwindCSS if not already installed
3. Use the component:

```tsx
import { Timer24HCard } from './Timer24HCard';

<Timer24HCard
  timerId="living_room_lights"
  title="Living Room Schedule"
  entities={['light.living_room']}
/>
```

## Configuration Options

The integration works without configuration, but you can customize behavior:

### Card Configuration

```yaml
type: custom:timer-24h-card
title: "Kitchen Timer"           # Required - creates unique timer ID
entities:                        # Optional - entities to control
  - light.kitchen
  - switch.coffee_maker
save_state: true                 # Enable saving (default: true)
save_to_ha: true                 # Use Timer 24H Storage (default: true)
resolution_minutes: 30           # Time slot resolution (default: 30)
```

### Storage Location

Timer data is automatically stored in:
```
config/.storage/timer_24h.json
```

This file is managed automatically - no manual editing required.

## Migration from localStorage

If you're upgrading from a localStorage-based timer card:

### Automatic Migration

The updated timer card will:
1. Try to load from Timer 24H Storage first
2. Fall back to localStorage if integration not available
3. Gradually migrate data as you use the timers

### Manual Migration

To force migration of existing data:

1. Open browser console (F12)
2. Export existing data:
   ```javascript
   const oldData = localStorage.getItem('timer-24h-My Timer');
   console.log('Old data:', oldData);
   ```
3. The new card will automatically create server-side storage when you make changes

## Troubleshooting

### Integration Not Loading

**Symptoms**: No log messages about Timer 24H Storage

**Solutions**:
1. Check file permissions in `custom_components/timer_24h/`
2. Verify all Python files are present and valid
3. Restart Home Assistant completely
4. Check for Python syntax errors in logs

### WebSocket Commands Failing

**Symptoms**: Error messages when using timer cards

**Solutions**:
1. Verify integration loaded successfully in logs
2. Check WebSocket connection in Developer Tools
3. Test API manually using WebSocket tab
4. Ensure Home Assistant version compatibility

### Data Not Persisting

**Symptoms**: Timer settings reset after restart

**Solutions**:
1. Check Home Assistant has write permissions to `.storage/`
2. Verify sufficient disk space
3. Look for storage errors in Home Assistant logs
4. Check `.storage/timer_24h.json` file exists and is readable

### Cross-Device Sync Issues

**Symptoms**: Changes not appearing on other devices

**Solutions**:
1. Ensure all devices connect to same Home Assistant instance
2. Check WebSocket connections are active
3. Verify timer IDs are consistent across devices
4. Test with Developer Tools WebSocket API

### Performance Issues

**Symptoms**: Slow response or high CPU usage

**Solutions**:
1. Use summary mode for listing: `list(true)`
2. Limit number of concurrent timer cards
3. Check `.storage/timer_24h.json` file size
4. Monitor Home Assistant logs for excessive API calls

## Advanced Configuration

### Custom Resolution

Change time slot resolution for specific timers:

```yaml
type: custom:timer-24h-card
title: "High Resolution Timer"
resolution_minutes: 15  # 15-minute slots instead of 30
```

### Multiple Timer Cards

Use different timer IDs for separate schedules:

```yaml
# Living Room Timer
type: custom:timer-24h-card
title: "Living Room Lights"
entities: [light.living_room]

# Kitchen Timer  
type: custom:timer-24h-card
title: "Kitchen Automation"
entities: [light.kitchen, switch.coffee_maker]
```

### Event-Based Automation

Create automations that respond to timer changes:

```yaml
automation:
  - alias: "Timer Schedule Updated"
    trigger:
      platform: event
      event_type: timer_24h_schedule_updated
    action:
      service: persistent_notification.create
      data:
        message: "Timer {{ trigger.event.data.timer_id }} was updated"
```

## Backup and Restore

### Backup

Timer data is stored in `.storage/timer_24h.json`. Include this file in your Home Assistant backups.

### Restore

1. Restore `.storage/timer_24h.json` from backup
2. Restart Home Assistant
3. Timer schedules will be automatically available

## Development and Debugging

### Enable Debug Logging

Add to `configuration.yaml`:

```yaml
logger:
  default: info
  logs:
    custom_components.timer_24h: debug
```

### API Testing

Use the WebSocket API directly for testing:

```javascript
// Get timer
hass.callWS({type: 'timer_24h/get', timer_id: 'test'})

// Set timer
hass.callWS({
  type: 'timer_24h/set', 
  timer_id: 'test',
  mask: '000011110000111100000000000000000000000000000000'
})

// List all timers
hass.callWS({type: 'timer_24h/list', summary_only: true})
```

### Storage Format

Direct inspection of storage file:

```bash
cat config/.storage/timer_24h.json | jq .
```

## Support

For issues and questions:

1. Check Home Assistant logs first
2. Test WebSocket API manually
3. Verify file permissions and disk space
4. Create issue with logs and configuration details

## Next Steps

After successful installation:

1. Update existing timer cards to use the integration
2. Test cross-device synchronization
3. Consider creating React components for advanced UIs
4. Set up event-based automations if needed

The Timer 24H Storage integration provides a robust foundation for synchronized timer schedules across all your Home Assistant devices!
