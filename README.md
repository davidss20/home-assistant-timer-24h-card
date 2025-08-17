# Timer 24H Card - 24 Hour Timer Card

A custom card for Home Assistant that allows you to set a daily schedule with automatic entity control.

![Timer 24H Card](https://via.placeholder.com/600x400/10b981/ffffff?text=Timer+24H+Card)

## ✨ Features

- **🕐 24-hour circular timer** with half-hour segments
- **🏠 Home presence detection** - entities will only be activated when you are at home
- **🔧 Automatic entity control** according to the schedule
- **💾 Settings persistence** in browser
- **🌍 Multi-language support** with RTL support
- **⚙️ Graphical configuration editor** easy to use

## 📥 Installation

### Via HACS (Recommended)

1. Open HACS in Home Assistant
2. Go to "Frontend" 
3. Click "+" and choose "Add custom repository"
4. Add the link: `https://github.com/davidss20/home-assistant-timer-card`
5. Choose category: "Lovelace"
6. Install "Timer 24H Card"
7. **Restart Home Assistant**

### Manual Installation

1. Download `timer-24h-card.js` and `timer-24h-card-editor.js`
2. Copy the files to `config/www/timer-24h-card/` folder
3. Add to `configuration.yaml`:

```yaml
lovelace:
  mode: yaml
  resources:
    - url: /local/timer-24h-card/timer-24h-card.js
      type: module
    - url: /local/timer-24h-card/timer-24h-card-editor.js
      type: module
```

4. **Restart Home Assistant**

## 🚀 Usage

### Adding the Card

#### Via Graphical Interface
1. Go to Lovelace edit mode
2. Click "Add Card"
3. Search for "Timer 24H Card"
4. Configure the card through the graphical interface

#### Via YAML
```yaml
type: custom:timer-24h-card
title: "Lighting Timer"
home_sensors:
  - person.john
  - binary_sensor.home_occupancy
home_logic: OR  # or AND
entities:
  - light.living_room
  - switch.garden_lights
  - fan.bedroom
save_state: true
```

## ⚙️ Configuration Options

| Name | Type | Required | Default | Description |
|----|-----|------|-------------|-------|
| `title` | string | ❌ | "24 Hour Timer" | Card title |
| `home_sensors` | list | ❌ | `[]` | List of sensors for presence detection |
| `home_logic` | string | ❌ | "OR" | Detection logic: OR or AND |
| `entities` | list | ❌ | `[]` | Entities for automatic control |
| `save_state` | boolean | ❌ | `true` | Save settings in browser |

### Supported Sensor Types for Presence Detection:
- `person.*` - People
- `device_tracker.*` - Device tracking
- `binary_sensor.*` - Binary sensors
- `sensor.*` - General sensors
- `input_boolean.*` - Virtual switches

### Supported Entity Types for Control:
- `light.*` - Lights
- `switch.*` - Switches
- `fan.*` - Fans
- `climate.*` - Climate control
- `media_player.*` - Media players
- `cover.*` - Covers and blinds
- `input_boolean.*` - Virtual switches

## 📋 Examples

### Basic Lighting Timer
```yaml
type: custom:timer-24h-card
title: "Automatic Lighting"
entities:
  - light.living_room
  - light.kitchen
  - light.bedroom
```

### Advanced Timer with Presence Detection
```yaml
type: custom:timer-24h-card
title: "Smart Home System"
home_sensors:
  - person.john
  - person.jane
  - binary_sensor.motion_entrance
home_logic: OR
entities:
  - light.all_lights
  - switch.water_heater
  - climate.living_room
  - fan.bedroom
save_state: true
```

### Multi-System Control
```yaml
type: custom:timer-24h-card
title: "Full Automation"
home_sensors:
  - device_tracker.john_phone
  - input_boolean.home_mode
home_logic: AND
entities:
  - switch.garden_irrigation
  - light.outdoor_lights
  - media_player.living_room_tv
  - cover.main_blinds
  - climate.main_ac
save_state: true
```

## 🎯 How It Works

1. **🎨 Setting Times**: Click on segments in the circle or on the pointing triangle
   - **Outer circle**: Full hours (00:00, 01:00, etc.)
   - **Inner circle**: Half hours (00:30, 01:30, etc.)

2. **🏠 Presence Detection**: The card checks the configured sensors every minute
   - **OR**: At least one sensor must be active
   - **AND**: All sensors must be active

3. **🔧 Entity Control**: If you are at home and the time is active, entities will be turned on automatically

4. **💾 Persistence**: Settings are saved in the browser (if enabled)

## 🎨 Card Appearance

- **🟢 Green**: Active segments
- **⚪ Gray**: Inactive segments  
- **🔵 Blue**: Current segment (blue border)
- **🔴 Red**: Triangle when current time is inactive
- **🟢 Green**: Triangle when current time is active

## 🔧 Troubleshooting

### Card Doesn't Appear
1. Make sure files are copied correctly
2. Verify resources are added to `configuration.yaml`
3. Restart Home Assistant
4. Clear browser cache (Ctrl+F5)

### Entities Don't Activate
1. Verify entities exist and are available
2. Check that sensors return correct values
3. Make sure you are "at home" according to sensors
4. Check Home Assistant logs

### Settings Don't Save
1. Verify `save_state: true` in configuration
2. Check that browser allows Local Storage
3. Try refreshing the page

## 🆘 Support

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/YOUR-USERNAME/timer-24h-card/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/YOUR-USERNAME/timer-24h-card/discussions)
- **📖 Additional Documentation**: [Wiki](https://github.com/YOUR-USERNAME/timer-24h-card/wiki)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ for the Home Assistant community** 