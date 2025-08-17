# 🕐 Timer 24H Card

A custom Lovelace card for Home Assistant that provides a 24-hour circular timer with automatic entity control based on schedule and home presence.

## ✨ Features

- **🕐 24-hour circular timer** with half-hour precision
- **🏠 Smart home presence detection** using multiple sensors
- **⚡ Automatic entity control** according to your schedule
- **🌍 Multi-language support** (English/Hebrew) with RTL support
- **📱 Responsive design** that works on all devices
- **⚙️ Visual configuration editor** - no YAML needed
- **💾 Settings persistence** in browser storage
- **📡 Multiple update channels** (Stable/Beta/Development)

## 🚀 Latest Version Features

### 🌍 Multi-Language Support
- Automatic language detection from Home Assistant
- Full Hebrew translation with RTL support
- Browser language fallback

### 🎯 Smart Automation Status
- Real-time indication if entities will activate
- Center circle shows current automation status
- Sensor-based blocking (e.g., Shabbat mode)

### 🎨 Modern UI
- Clean, minimal design
- Optimized spacing and typography
- Responsive layout for all screen sizes
- Professional visual configuration editor

## 📦 Installation

### Via HACS (Recommended)
1. Add custom repository: `https://github.com/davidss20/timer-24h-card`
2. Choose your update channel (Stable/Beta)
3. Install and restart Home Assistant

### Manual Installation
1. Download the latest release
2. Copy files to `config/www/timer-24h-card/`
3. Add to Lovelace resources

## 🔧 Configuration

Use the visual editor (recommended) or YAML:

```yaml
type: custom:timer-24h-card
title: "My Timer"
home_sensors:
  - person.john_doe
  - binary_sensor.home_occupied
home_logic: OR
entities:
  - light.living_room
  - switch.garden_lights
save_state: true
```

## 📡 Update Channels

- **🟢 Stable**: Tested releases (recommended)
- **🟡 Beta**: Latest features, pre-release
- **🔴 Development**: Daily builds, cutting edge

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/davidss20/timer-24h-card/issues)
- **Discussions**: [GitHub Discussions](https://github.com/davidss20/timer-24h-card/discussions)
- **Documentation**: [Full Guide](https://github.com/davidss20/timer-24h-card/blob/main/README.md)
