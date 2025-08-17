# Timer 24H Card - Grid Layout Guide

## 🔧 Grid Layout Support

This card supports both the new **Sections Grid** layout and the legacy **Masonry** layout in Home Assistant.

### 📏 Default Grid Settings

- **Rows**: 2
- **Columns**: 6  
- **Minimum Rows**: 2
- **Minimum Columns**: 3

## 🎯 How to Use Grid Layout

### Method 1: Automatic Detection
Home Assistant will automatically use the grid settings when you add the card to a Sections dashboard.

### Method 2: Manual Configuration
1. Add the card to your dashboard
2. Click **"Edit Card"**
3. Go to the **"Layout"** tab
4. Adjust the grid size as needed

### Method 3: YAML Configuration
```yaml
type: custom:timer-24h-card
title: "Lighting Timer"
# ... other config options
layout_options:
  grid_columns: 6
  grid_rows: 2
```

## 📐 Recommended Grid Sizes

### Small Card (3x2)
```yaml
layout_options:
  grid_columns: 3
  grid_rows: 2
```
- Good for simple timers
- Compact display

### Medium Card (4x2) 
```yaml
layout_options:
  grid_columns: 4
  grid_rows: 2
```
- Balanced size
- Good readability

### Large Card (6x2)
```yaml
layout_options:
  grid_columns: 6
  grid_rows: 2
```
- Full detail display
- Best user experience

### Extra Large (6x3)
```yaml
layout_options:
  grid_columns: 6
  grid_rows: 3
```
- Maximum space
- Best for large screens

## 🔄 Responsive Behavior

The card automatically adapts to different grid sizes:

- **Text scaling** based on available space
- **SVG scaling** to fit container
- **Container queries** for optimal display

## 🐛 Troubleshooting Grid Issues

### Grid Settings Not Working?

1. **Check Home Assistant Version**
   - Sections Grid requires HA 2024.2+
   - Update if needed

2. **Verify Dashboard Type**
   - Only works on Sections dashboards
   - Legacy dashboards use Masonry

3. **Clear Browser Cache**
   ```bash
   Ctrl + Shift + R  # Windows/Linux
   Cmd + Shift + R   # Mac
   ```

4. **Check Console for Errors**
   - Press F12 → Console
   - Look for card registration messages

### Card Too Small/Large?

1. **Adjust Grid Size**
   - Use Layout tab in card editor
   - Or modify YAML configuration

2. **Check Container**
   - Ensure parent container has space
   - Verify no CSS conflicts

## 📱 Mobile Responsiveness

The card adapts to mobile screens:

- **Auto-scaling** text and elements
- **Touch-friendly** interaction areas
- **Optimized** for small screens

## 🎨 Custom Styling

You can override the grid behavior with custom CSS:

```yaml
type: custom:timer-24h-card
card_mod:
  style: |
    ha-card {
      min-height: 300px !important;
      aspect-ratio: 2/1 !important;
    }
```

## 📊 Grid vs Masonry Comparison

| Feature | Grid Layout | Masonry Layout |
|---------|-------------|----------------|
| **Precision** | Exact sizing | Approximate |
| **Flexibility** | High | Medium |
| **Performance** | Better | Good |
| **Browser Support** | Modern | All |
| **HA Version** | 2024.2+ | All versions |

## 🚀 Best Practices

1. **Use recommended sizes** for optimal display
2. **Test on mobile** devices
3. **Consider content** when choosing size
4. **Use minimum sizes** to prevent too-small cards
5. **Enable responsive** features in your theme
