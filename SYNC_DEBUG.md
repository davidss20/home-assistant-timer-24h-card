# 🔄 מדריך פתרון בעיות סינכרון - Timer 24H Card

## 🧪 איך לבדוק שהסינכרון עובד

### שלב 1: פתח את Developer Tools (F12)
1. לחץ F12 בדפדפן
2. עבור ללשונית "Console"
3. נקה את הקונסול (Ctrl+L)

### שלב 2: רענן את הדף ובדוק הודעות
אתה אמור לראות הודעות כאלה:
```
Timer Card: Loading saved state...
Timer Card: Looking for entity: input_text.timer_24h_card_[name]
✅ Timer Card: State loaded from Home Assistant entity: input_text.timer_24h_card_[name]
```

### שלב 3: בדוק איזה entity נוצר
1. עבור ל-Developer Tools → States
2. חפש entities שמתחילים ב-`input_text.timer_24h_card_`
3. תראה את הנתונים השמורים שם

### שלב 4: בדוק סינכרון בין דפדפנים
1. **בדפדפן A**: שנה משהו בטיימר
2. **בקונסול**: תראה הודעה `✅ Timer Card: State successfully saved`
3. **בדפדפן B**: רענן את הדף
4. **בקונסול של B**: תראה הודעה `Timer Card: Syncing data from another device`

## 🔧 פתרון בעיות נפוצות

### ❌ אין entity ב-Home Assistant
**תסמינים:**
```
Timer Card: Entity input_text.timer_24h_card_[name] not found in Home Assistant
```

**פתרון:**
1. עבור ל-Settings → Devices & Services → Helpers
2. לחץ "Create Helper" → "Text"
3. שם: `Timer 24H Card - [שם הכרטיס]`
4. Entity ID: `timer_24h_card_[שם_מנוקה]`
5. Maximum length: 10000

### ❌ שגיאת שמירה
**תסמינים:**
```
❌ Timer Card: Failed to save to Home Assistant
```

**פתרון:**
1. בדוק שה-entity קיים ב-Developer Tools → States
2. נסה לשנות את הערך ידנית דרך Developer Tools
3. אם זה לא עובד, יצור entity חדש

### ❌ אין סינכרון בין דפדפנים
**תסמינים:**
- שינויים בדפדפן אחד לא מופיעים באחר

**פתרון:**
1. **רענן את שני הדפדפנים**
2. **בדוק בקונסול** שיש הודעות שמירה וטעינה
3. **השתמש בכפתור "🔄 סנכרן עכשיו"** בעורך
4. **בדוק ב-Developer Tools → States** שהנתונים מתעדכנים

## 🔍 בדיקות מתקדמות

### בדיקת Entity ב-Home Assistant
```yaml
# Developer Tools → States
# חפש: input_text.timer_24h_card_[name]
# הערך צריך להיות JSON עם timeSlots
```

### בדיקת שמירה ידנית
```javascript
// בקונסול של הדפדפן:
document.querySelector('timer-24h-card').saveState()
```

### בדיקת טעינה ידנית
```javascript
// בקונסול של הדפדפן:
document.querySelector('timer-24h-card').loadSavedState()
```

## 📞 קבלת עזרה

אם הסינכרון עדיין לא עובד:

1. **צלם screenshot** של הקונסול עם ההודעות
2. **העתק את שם ה-entity** שנוצר
3. **בדוק ב-Developer Tools → States** אם ה-entity קיים
4. **פתח issue** ב-GitHub עם כל המידע

## ✅ סימנים שהסינכרון עובד

- ✅ רואה הודעות ירוקות בקונסול
- ✅ ה-entity קיים ב-Home Assistant States  
- ✅ שינויים בדפדפן אחד מופיעים באחר אחרי רענון
- ✅ הכפתור "🔄 סנכרן עכשיו" עובד

---

**💡 טיפ:** הסינכרון לוקח עד 2 דקות. אם אתה רוצה סינכרון מיידי, רענן את הדף או השתמש בכפתור הסינכרון בעורך.
