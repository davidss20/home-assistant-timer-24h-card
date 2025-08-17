# איך לראות תצוגה מקדימה

## דרך 1: פתיחה ישירה בדפדפן
1. פתח את הקובץ `preview.html` בכל דפדפן
2. תראה את הכרטיס עובד מיד
3. תוכל ללחוץ על סגמנטים ולראות שינויים

## דרך 2: עם Live Server
```bash
# התקנה (פעם אחת):
npm install -g live-server

# הפעלה:
live-server

# פתח: http://localhost:8080/preview.html
```

## דרך 3: עם Python
```bash
# Python 3:
python -m http.server 8000

# פתח: http://localhost:8000/preview.html
```

## מה תראה בתצוגה המקדימה:
- ✅ הכרטיס המלא עם הכותרת
- ✅ העיגול עם הסגמנטים
- ✅ אפשרות לחיצה על סגמנטים
- ✅ לוגים בקונסול (F12)
- ✅ סימולציה של Home Assistant

## עריכה בזמן אמת:
1. ערוך את `timer-24h-card.js`
2. רענן את הדף
3. תראה את השינויים מיד

## דיבוג:
- פתח Developer Tools (F12)
- לך ל-Console לראות לוגים
- לך ל-Elements לבדוק את ה-DOM
