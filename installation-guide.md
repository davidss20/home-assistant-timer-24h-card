# Detailed Installation Guide - Timer 24H Card

## 📋 Prerequisites

- Home Assistant version 2021.3.0 and above
- Lovelace UI (default in Home Assistant)
- Access to Home Assistant configuration files

## 🔧 Manual Installation (Step by Step)

### Step 1: Prepare Files

1. Create a new folder at: `config/www/timer-24h-card/`
2. Copy the following files to the folder:
   - `timer-24h-card.js`
   - `timer-24h-card-editor.js`

### Step 2: Add Resources

1. Open the `configuration.yaml` file
2. Add the following section (or update if it already exists):

```yaml
lovelace:
  mode: yaml
  resources:
    - url: /local/timer-24h-card/timer-24h-card.js
      type: module
    - url: /local/timer-24h-card/timer-24h-card-editor.js
      type: module
```

**Note**: If you're using UI mode (not YAML), go to step 3.

### Step 3: Add Resources in UI Mode

1. Go to **Settings** → **Lovelace Dashboards** → **Resources**
2. Click **"Add Resource"**
3. Enter:
   - **URL**: `/local/timer-24h-card/timer-24h-card.js`
   - **Resource Type**: `JavaScript Module`
4. Click **"Create"**
5. Repeat the process for:
   - **URL**: `/local/timer-24h-card/timer-24h-card-editor.js`
   - **Resource Type**: `JavaScript Module`

### Step 4: Restart Home Assistant

1. Go to **Settings** → **System** → **Restart**
2. Click **"Restart"**
3. Wait for complete restart

### Step 5: Verify Installation

1. Open Developer Tools (F12)
2. In the console, look for the message:
   ```
   TIMER-24H-CARD Version 1.0.0
   ```

## 🎨 Adding the Card for the First Time

### Via Graphical Interface (Recommended for Beginners)

1. Go to Lovelace edit mode (click the pencil)
2. Click **"Add Card"**
3. In search type: `Timer 24H`
4. Choose **"Custom: Timer 24H Card"**
5. Use the graphical interface for configuration

### Via YAML (For Advanced Users)

1. Go to Lovelace edit mode
2. Click **"Raw configuration editor"**
3. Add to card:

```yaml
type: custom:timer-24h-card
title: "My Timer"
```

## ⚙️ Initial Configuration

### Setting Up Home Presence Sensors

1. In the card editor, under **"Home Presence Settings"**
2. Select relevant sensors:
   - `person.your_name` - Your location
   - `device_tracker.your_phone` - Your phone
   - `binary_sensor.motion_entrance` - Motion sensor at entrance

### Setting Up Entities to Control

1. Under **"Entity Control"**
2. Select entities you want to control:
   - `light.living_room` - Living room light
   - `switch.garden_lights` - Garden lights
   - `fan.bedroom` - Bedroom fan

### Setting Up Presence Logic

- **OR**: At least one sensor must be active (recommended for most cases)
- **AND**: All sensors must be active (for special cases)

## 🔍 Functionality Check

### Check 1: Card is Displayed
- [ ] Card appears without errors
- [ ] Current time is displayed correctly
- [ ] Triangle points to current time

### Check 2: Clicks Work
- [ ] Clicking on segment changes its color
- [ ] Clicking on triangle changes current segment
- [ ] Summary updates after changes

### Check 3: Presence Detection
- [ ] "At Home/Away" status is displayed correctly
- [ ] Location change updates status

### Check 4: Entity Control
- [ ] When at home and time is active - entities turn on
- [ ] When away from home - entities don't change
- [ ] When time is inactive - entities turn off

## 🐛 Common Troubleshooting

### Error: "Custom element doesn't exist"

**Solution:**
1. Make sure files are in the correct path
2. Verify resources are added to configuration.yaml
3. Restart Home Assistant
4. Clear browser cache (Ctrl+Shift+R)

### Card Doesn't Respond to Clicks

**Solution:**
1. Open Developer Tools (F12)
2. Look for JavaScript errors in console
3. Verify entities exist and are accessible

### Settings Don't Save

**Solution:**
1. Verify `save_state: true` in configuration
2. Check that browser allows Local Storage
3. Try in incognito mode - if it works, clear cookies

### Entities Don't Change

**Solution:**
1. Check that sensors return correct values
2. Verify Home Assistant permissions allow control
3. Check the logs: Settings → System → Logs

## 📝 Complete Configuration Examples

### Example 1: Single Family Home
```yaml
type: custom:timer-24h-card
title: "Automatic Lighting"
home_sensors:
  - person.dad
  - person.mom
  - device_tracker.dad_phone
home_logic: OR
entities:
  - light.living_room
  - light.kitchen
  - light.entrance
  - switch.garden_lights
save_state: true
```

### Example 2: Apartment with Roommates
```yaml
type: custom:timer-24h-card
title: "Shared Systems"
home_sensors:
  - binary_sensor.motion_entrance
  - input_boolean.manual_home_mode
home_logic: OR
entities:
  - switch.water_heater
  - climate.living_room
  - light.hallway
save_state: true
```

### Example 3: Full Smart Home
```yaml
type: custom:timer-24h-card
title: "Complete Automation"
home_sensors:
  - person.john
  - device_tracker.john_car
  - binary_sensor.garage_door
home_logic: AND
entities:
  - light.all_lights
  - switch.irrigation_system
  - media_player.whole_house_audio
  - cover.all_blinds
  - climate.main_ac
save_state: true
```

## 📞 Getting Help

If you encounter problems:

1. **Read the errors** in Developer Tools
2. **Check the logs** of Home Assistant
3. **Open an issue** on GitHub with problem details
4. **Join the community** of Home Assistant users

---

**Good luck with your new card! 🎉** 