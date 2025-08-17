# How to Create Screenshots for README

## Quick Screenshot Creation

### Step 1: Open Preview
1. Open `preview.html` in your browser
2. The page should load with a beautiful gradient background and the timer card

### Step 2: Set Up the Card
1. Click **"Workday Preset"** to activate some timer segments
2. The card should now show green active segments
3. Wait a moment for the card to fully render

### Step 3: Take Screenshot
1. **Windows**: Press `Windows + Shift + S` to open Snipping Tool
2. **Mac**: Press `Cmd + Shift + 4` to start screenshot
3. **Linux**: Press `PrtSc` or use your screenshot tool

### Step 4: Crop and Save
1. Crop the image to show just the card area (approximately 400x400px)
2. Save as `preview.png` in the `images/` folder
3. Optionally optimize the image size

## Replace Placeholder in README

Once you have a real screenshot:

1. Upload the image to GitHub in the `images/` folder
2. Replace this line in README.md:
   ```markdown
   ![Timer 24H Card Preview](https://via.placeholder.com/600x400/667eea/ffffff?text=🕐+Timer+24H+Card+Preview)
   ```
   
   With:
   ```markdown
   ![Timer 24H Card Preview](https://raw.githubusercontent.com/davidss20/timer-24h-card/main/images/preview.png)
   ```

## Pro Tips

- **Best time to screenshot**: After clicking "Workday Preset" to show active segments
- **Good lighting**: The gradient background makes screenshots look professional
- **Multiple angles**: Try different browser sizes for various screenshots
- **Mobile view**: Use browser dev tools to simulate mobile for mobile screenshots

## Alternative: Use Browser Extensions

For even better screenshots, consider using browser extensions like:
- **Awesome Screenshot** (Chrome/Firefox)
- **Lightshot** (Cross-platform)
- **Nimbus Screenshot** (Chrome/Firefox)

These tools allow for precise cropping and instant editing.

## Current Status

✅ **Placeholder images** are working in README  
⏳ **Real screenshots** - Create when ready  
📱 **Mobile screenshots** - Optional enhancement  
🎨 **Multiple themes** - Optional for variety  

The README looks great with placeholders, but real screenshots will make it even more impressive!
