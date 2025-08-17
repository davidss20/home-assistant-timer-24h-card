# Quick Installation Instructions

## 📁 Preparing Files

1. **Create a folder** in Home Assistant:
   ```
   config/www/timer-24h-card/
   ```

2. **Copy the files**:
   - `timer-24h-card.js`
   - `timer-24h-card-editor.js`

## ⚙️ Home Assistant Configuration

### If you're using YAML mode:

Add to `configuration.yaml`:
```yaml
lovelace:
  mode: yaml
  resources:
    - url: /local/timer-24h-card/timer-24h-card.js
      type: module
    - url: /local/timer-24h-card/timer-24h-card-editor.js
      type: module
```

### If you're using UI mode:

1. Go to: **Settings** → **Lovelace Dashboards** → **Resources**
2. Add new resource:
   - URL: `/local/timer-24h-card/timer-24h-card.js`
   - Type: `JavaScript Module`
3. Add another resource:
   - URL: `/local/timer-24h-card/timer-24h-card-editor.js`
   - Type: `JavaScript Module`

## 🔄 Restart

**Restart Home Assistant** (Settings → System → Restart)

## ✅ Adding the Card

1. Go to Lovelace edit mode
2. Click "Add Card"
3. Search for "Timer 24H Card"
4. Configure as needed

## 🎯 Basic Configuration

```yaml
type: custom:timer-24h-card
title: "My Timer"
home_sensors:
  - person.your_name
entities:
  - light.living_room
save_state: true
```

## 🆘 Problems?

- Make sure files are in the correct path
- Clear browser cache (Ctrl+F5)
- Check for errors in Developer Tools (F12)

---

**That's it! The card should work now 🎉** 