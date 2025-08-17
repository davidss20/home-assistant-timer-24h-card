# 🔄 Timer Synchronization Setup Guide
## מדריך הגדרת סינכרון הטיימר

### 🎯 Problem Solved
This guide helps you sync timer settings across all your devices (phone, tablet, computer) using Home Assistant storage instead of browser-only localStorage.

### 🏠 Setup Home Assistant Entities

#### Step 1: Add Input Text Entities
Add this to your `configuration.yaml`:

```yaml
input_text:
  # Replace 'lighting_timer' with your card title (lowercase, underscores only)
  timer_24h_card_lighting_timer:
    name: "Lighting Timer State"
    max: 10000
    
  # If you have multiple timer cards, add one for each:
  timer_24h_card_bedroom_timer:
    name: "Bedroom Timer State"  
    max: 10000
    
  timer_24h_card_garden_timer:
    name: "Garden Timer State"
    max: 10000
```

#### Step 2: Restart Home Assistant
After adding the entities, restart Home Assistant to create them.

#### Step 3: Configure Your Timer Card
Update your timer card configuration:

```yaml
type: custom:timer-24h-card
title: "Lighting Timer"  # This determines the entity name
save_state: true
save_to_ha: true  # Enable Home Assistant sync
home_sensors:
  - person.john_doe
entities:
  - light.living_room
```

### 🔧 Entity Name Generation Rules

The system automatically creates entity names based on your card title:

| Card Title | Generated Entity ID |
|------------|-------------------|
| "Lighting Timer" | `input_text.timer_24h_card_lighting_timer` |
| "Bedroom Lights" | `input_text.timer_24h_card_bedroom_lights` |
| "Garden System" | `input_text.timer_24h_card_garden_system` |
| "Main Timer" | `input_text.timer_24h_card_main_timer` |

**Rule**: Lowercase, spaces become underscores, special characters removed.

### 📱 How It Works

#### Before (Browser Only):
```
📱 Phone: Timer settings saved locally
💻 Computer: Different timer settings  
📟 Tablet: No timer settings
```

#### After (Home Assistant Sync):
```
📱 Phone: ✅ Timer settings synced
💻 Computer: ✅ Same timer settings
📟 Tablet: ✅ Same timer settings
🏠 Home Assistant: Central storage
```

### 🛠️ Configuration Options

```yaml
type: custom:timer-24h-card
title: "My Timer"
save_state: true      # Enable saving (default: true)
save_to_ha: true      # Use HA sync (default: true)
# ... other options
```

| Option | Default | Description |
|--------|---------|-------------|
| `save_state` | `true` | Enable timer state saving |
| `save_to_ha` | `true` | Use Home Assistant storage |

### 🔍 Troubleshooting

#### Timer Settings Not Syncing?

1. **Check Console Messages** (F12):
   ```
   ✅ Timer Card: State saved to Home Assistant entity: input_text.timer_24h_card_my_timer
   ```

2. **Entity Missing Error**:
   ```
   ⚠️ Timer Card: Entity not found: input_text.timer_24h_card_my_timer
   📝 Please create this entity in configuration.yaml:
   ```

3. **Create Missing Entity**:
   - Copy the suggested configuration from console
   - Add to `configuration.yaml`
   - Restart Home Assistant

#### Fallback to localStorage:
If Home Assistant sync fails, the card automatically falls back to browser storage with this message:
```
💾 Timer Card: State saved to localStorage (fallback)
```

### 🌐 Multi-Device Testing

1. **Set up timer on Device 1**:
   - Configure some time slots
   - Check console for sync success

2. **Open on Device 2**:
   - Timer should show same configuration
   - Changes sync automatically

3. **Verify in Home Assistant**:
   - Go to Developer Tools → States
   - Find your `input_text.timer_24h_card_*` entity
   - See the JSON data stored

### 📊 Storage Format

The timer data is stored as JSON in the input_text entity:

```json
{
  "timeSlots": [
    {"hour": 18, "minute": 0, "isActive": true},
    {"hour": 18, "minute": 30, "isActive": true},
    {"hour": 22, "minute": 0, "isActive": false}
  ],
  "timestamp": 1704067200000
}
```

### 🚀 Migration from localStorage

The system automatically handles migration:

1. **First load**: Checks Home Assistant storage
2. **Not found**: Falls back to localStorage
3. **Found localStorage**: Migrates to Home Assistant
4. **Future loads**: Uses Home Assistant storage

### ✨ Benefits

- **🔄 Cross-device sync**: Same settings everywhere
- **☁️ Cloud backup**: Settings stored in Home Assistant
- **🔒 Secure**: Data stays in your Home Assistant
- **📱 Mobile friendly**: Works on all devices
- **🔄 Automatic fallback**: Works even if HA is down

---

## 🇮🇱 Hebrew Instructions / הוראות בעברית

### שלב 1: הוספת entities ל-Home Assistant

הוסף ל-`configuration.yaml`:

```yaml
input_text:
  timer_24h_card_lighting_timer:
    name: "מצב טיימר תאורה"
    max: 10000
```

### שלב 2: הגדרת הכרטיס

```yaml
type: custom:timer-24h-card
title: "טיימר תאורה"
save_state: true
save_to_ha: true  # סינכרון עם Home Assistant
language: he
```

### שלב 3: אתחול Home Assistant

אחרי ההוספה, אתחל את Home Assistant.

---

**🎉 Now your timer settings will sync perfectly across all devices!**
