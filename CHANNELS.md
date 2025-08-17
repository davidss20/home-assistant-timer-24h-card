# 📡 ערוצי עדכונים - Timer 24H Card

## 🎯 סקירת ערוצים

### 🟢 **ערוץ יציב (Stable)**
- **מומלץ למשתמשים רגילים**
- ✅ גרסאות נבדקות ויציבות
- 🏷️ תגיות רשמיות: `v1.0.0`, `v1.1.0`, `v2.0.0`
- 📅 עדכונים: כשמוכן, בדרך כלל פעם בחודש
- 🔗 **Branch**: `main`

### 🟡 **ערוץ בטא (Beta)**  
- **למשתמשים מתקדמים שרוצים תכונות חדשות**
- 🧪 תכונות חדשות לפני השחרור הרשמי
- 🏷️ תגיות בטא: `v1.1.0-beta`, `v1.2.0-beta.1`
- 📅 עדכונים: כשיש תכונות חדשות מוכנות
- 🔗 **Branch**: `beta`

### 🔴 **ערוץ פיתוח (Development)**
- **למפתחים ובודקים בלבד**
- ⚡ הקוד החדש ביותר
- 🏷️ תגיות יומיות: `v2024.01.15-dev.a1b2c3d`
- 📅 עדכונים: אוטומטי עם כל commit
- ⚠️ **אזהרה**: עלול להיות לא יציב!

---

## 🚀 איך להתקין

### 📦 דרך HACS (מומלץ)

#### ערוץ יציב:
```yaml
# 1. הוסף repository מותאם אישית ב-HACS
https://github.com/davidss20/timer-24h-card

# 2. בחר "Stable" או השאר ברירת מחדל
# 3. התקן בדרך הרגילה
```

#### ערוץ בטא:
```yaml
# 1. הוסף repository מותאם אישית ב-HACS
https://github.com/davidss20/timer-24h-card

# 2. הפעל "Show beta versions" בהגדרות HACS
# 3. בחר גרסת בטא מהרשימה
```

#### ערוץ פיתוח:
```yaml
# 1. Clone/Download מ-main branch
# 2. התקנה ידנית (ראה למטה)
```

---

### 🛠️ התקנה ידנית

#### שלב 1: הורדה
```bash
# ערוץ יציב
wget https://github.com/davidss20/timer-24h-card/releases/latest/download/timer-24h-card-latest.zip

# ערוץ בטא
wget https://github.com/davidss20/timer-24h-card/releases/download/v1.1.0-beta/timer-24h-card-v1.1.0-beta.zip

# ערוץ פיתוח
git clone -b main https://github.com/davidss20/timer-24h-card.git
```

#### שלב 2: העתקה
```bash
# חלץ לתיקיית www
unzip timer-24h-card-*.zip -d /config/www/timer-24h-card/
```

#### שלב 3: הוספה ל-Lovelace
```yaml
# configuration.yaml או דרך UI
lovelace:
  resources:
    - url: /local/timer-24h-card/timer-24h-card.js
      type: module
    - url: /local/timer-24h-card/timer-24h-card-editor.js  
      type: module
```

---

## 🔄 מעבר בין ערוצים

### מיציב לבטא:
1. 🟢→🟡 הפעל "Show beta versions" ב-HACS
2. עדכן לגרסת בטא
3. אתחל Home Assistant

### מבטא ליציב:
1. 🟡→🟢 כבה "Show beta versions" ב-HACS  
2. התקן גרסה יציבה
3. אתחל Home Assistant

### מפיתוח לכל ערוץ אחר:
1. 🔴→🟢/🟡 הסר התקנה ידנית
2. התקן דרך HACS
3. הגדר מחדש

---

## 📋 השוואת ערוצים

| תכונה | 🟢 יציב | 🟡 בטא | 🔴 פיתוח |
|--------|---------|--------|----------|
| **יציבות** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **תכונות חדשות** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **תדירות עדכונים** | חודשי | שבועי | יומי |
| **תמיכה** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **מומלץ עבור** | כולם | מתקדמים | מפתחים |

---

## 🆘 תמיכה ובאגים

### דיווח באגים:
- **🟢 יציב**: [Issues](https://github.com/davidss20/timer-24h-card/issues) עם תג `stable`
- **🟡 בטא**: [Issues](https://github.com/davidss20/timer-24h-card/issues) עם תג `beta`  
- **🔴 פיתוח**: [Discussions](https://github.com/davidss20/timer-24h-card/discussions)

### מידע לדיווח:
```yaml
# כלול במידע:
- גרסה: v1.1.0-beta
- ערוץ: Beta
- Home Assistant: 2024.1.0
- דפדפן: Chrome 120
- שגיאה: [העתק מה-console]
```

---

## 🎉 תודות

תודה שאתם עוזרים לנו לשפר את Timer 24H Card! 

**המלצה**: התחילו עם הערוץ היציב, ואם אתם רוצים תכונות חדשות - עברו לבטא! 🚀
