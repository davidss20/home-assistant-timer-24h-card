# 🚀 Advanced Server-Side Synchronization Setup
## מדריך התקנה מתקדם לסינכרון שרתי

### 🎯 The Ultimate Solution
This setup provides **true server-side storage** with **real-time synchronization** across all devices using a custom Home Assistant component.

## 📦 Installation Steps

### Step 1: Install Custom Component

#### Option A: HACS Installation (Coming Soon)
```yaml
# Will be available in HACS custom repositories
```

#### Option B: Manual Installation

1. **Create custom component directory**:
   ```bash
   mkdir -p /config/custom_components/timer_card_storage
   ```

2. **Copy the component file**:
   ```bash
   # Copy timer_card_storage.py to:
   /config/custom_components/timer_card_storage/__init__.py
   ```

3. **Create manifest file**:
   ```json
   {
     "domain": "timer_card_storage",
     "name": "Timer Card Storage",
     "version": "1.0.0",
     "documentation": "https://github.com/davidss20/home-assistant-timer-24h-card",
     "dependencies": [],
     "codeowners": ["@davidss20"],
     "requirements": []
   }
   ```

### Step 2: Enable Component

Add to your `configuration.yaml`:
```yaml
# Enable Timer Card Storage
timer_card_storage:
```

### Step 3: Restart Home Assistant

After adding the component, restart Home Assistant completely.

### Step 4: Configure Timer Card

Update your timer card configuration:
```yaml
type: custom:timer-24h-card
title: "Lighting Timer"
save_to_ha: true        # Enable server storage
save_state: true        # Enable saving
# ... other options
```

## 🔧 How It Works

### Server-Side Storage
```
📁 /config/timer_card_storage/
├── lighting_timer.json      # Main timer data
├── bedroom_lights.json      # Bedroom timer
└── garden_system.json       # Garden timer
```

### Real-Time Synchronization
```
📱 Phone: Changes timer → 🏠 Server saves → 💻 Computer updates instantly
💻 Computer: Changes timer → 🏠 Server saves → 📟 Tablet updates instantly
```

### JSON Storage Format
```json
{
  "card_id": "lighting_timer",
  "data": {
    "timeSlots": [
      {"hour": 18, "minute": 0, "isActive": true},
      {"hour": 18, "minute": 30, "isActive": true},
      {"hour": 22, "minute": 0, "isActive": false}
    ],
    "timestamp": 1704067200000
  },
  "timestamp": "2024-01-01T12:00:00",
  "version": "1.0"
}
```

## 🛠️ Available Services

### `timer_card_storage.save`
Save timer data to server:
```yaml
service: timer_card_storage.save
data:
  card_id: "lighting_timer"
  data:
    timeSlots: [...]
```

### `timer_card_storage.load`
Load timer data from server:
```yaml
service: timer_card_storage.load
data:
  card_id: "lighting_timer"
```

### `timer_card_storage.list`
List all saved timer cards:
```yaml
service: timer_card_storage.list
```

## 🔍 Troubleshooting

### Component Not Loading?

1. **Check logs**:
   ```bash
   tail -f /config/home-assistant.log | grep timer_card
   ```

2. **Verify file structure**:
   ```
   /config/custom_components/timer_card_storage/
   ├── __init__.py        # The Python component
   └── manifest.json      # Component metadata
   ```

3. **Check configuration**:
   ```yaml
   # In configuration.yaml
   timer_card_storage:
   ```

### Storage Not Working?

Check console messages (F12):
```
✅ Timer Card: State saved to server storage: lighting_timer
🔄 Timer Card: Syncing from another device: lighting_timer
```

### Real-Time Sync Issues?

1. **WebSocket connection**: Ensure Home Assistant WebSocket is working
2. **Network**: Check if devices are on same network
3. **Events**: Look for `timer_card_data_saved` events in Developer Tools

## 🌐 Multi-Device Testing

### Test Scenario:
1. **Device 1** (Phone): Set timer 18:00-22:00
2. **Device 2** (Computer): Should show same timer instantly
3. **Device 3** (Tablet): Should sync when opened

### Debug Console Messages:
```
Device 1: ✅ Timer Card: State saved to server storage: lighting_timer
Device 2: 🔄 Timer Card: Syncing from another device: lighting_timer
Device 3: ✅ Timer Card: State loaded from server storage: lighting_timer
```

## 📊 Storage Management

### View Stored Data
```yaml
# In Developer Tools > Services
service: timer_card_storage.list
```

### Manual Data Access
Files are stored in: `/config/timer_card_storage/`
- Human-readable JSON format
- Automatic backups with timestamps
- Easy migration and export

### Storage Size
- Each timer card: ~1-5 KB
- 100 timer cards: ~500 KB
- Negligible impact on system

## 🔒 Security & Privacy

- **Local Storage**: All data stays on your Home Assistant server
- **No Cloud**: No external services or internet required
- **Encrypted**: Uses Home Assistant's security model
- **Access Control**: Respects Home Assistant user permissions

## 🚀 Performance Benefits

### Before (localStorage):
```
📱 Phone: Local data only
💻 Computer: Different data
📟 Tablet: No data
❌ No sync between devices
```

### After (Server Storage):
```
📱 Phone: ✅ Real-time sync
💻 Computer: ✅ Real-time sync  
📟 Tablet: ✅ Real-time sync
🏠 Server: Central storage
⚡ Instant updates
```

## 🔄 Migration

The component automatically handles migration:
1. **First install**: Creates storage directory
2. **Existing localStorage**: Automatically migrates to server
3. **Fallback**: Still works if component fails

## 🎉 Benefits Summary

- **🔄 True Real-Time Sync**: Changes appear instantly on all devices
- **🏠 Server Storage**: Data stored safely on your Home Assistant
- **📱 Multi-Device**: Perfect sync across phone, tablet, computer
- **🔒 Secure**: No external dependencies or cloud services
- **⚡ Fast**: Optimized JSON storage with WebSocket events
- **🛡️ Reliable**: Automatic fallbacks and error handling
- **📊 Manageable**: Easy to backup, restore, and manage

---

## 🇮🇱 Hebrew Setup / הגדרה בעברית

### שלב 1: התקנת הקומפוננט

1. **יצירת תיקייה**:
   ```bash
   mkdir -p /config/custom_components/timer_card_storage
   ```

2. **העתקת הקבצים**:
   - `timer_card_storage.py` → `/config/custom_components/timer_card_storage/__init__.py`
   - `manifest.json` → `/config/custom_components/timer_card_storage/manifest.json`

### שלב 2: הפעלה ב-configuration.yaml

```yaml
timer_card_storage:
```

### שלב 3: הגדרת הכרטיס

```yaml
type: custom:timer-24h-card
title: "טיימר תאורה"
save_to_ha: true
language: he
```

---

**🎯 Now you have enterprise-grade timer synchronization!**
