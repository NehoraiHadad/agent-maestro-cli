# 📁 Task Files Directory

**תיקייה זו מכילה קבצי משימות מפורטים לכל Phase.**

---

## 📋 קבצים בתיקייה

כל Phase מיוצג על ידי קובץ נפרד:

1. **phase-1-security-fixes.md** - תיקוני אבטחה קריטיים (PARALLEL)
2. **phase-2-utilities.md** - יצירת Utility Classes (PARALLEL)
3. **phase-3-refactoring.md** - רפקטורינג ארכיטקטוני (SEQUENTIAL)
4. **phase-4-code-quality.md** - שיפורי איכות קוד (PARALLEL)
5. **phase-5-features.md** - Features חדשים (PARALLEL)
6. **phase-6-testing.md** - בדיקות ותיעוד (PARALLEL)

---

## 🚀 איך משתמשים

### שלב 1: קרא את המדריך המרכזי
ראשית, קרא את `docs/AGENT_PROMPTS.md` - זה המסמך המרכזי עם כל הפרומפטים.

### שלב 2: שלח פרומפט לסוכן
העתק את הפרומפט המתאים מ-`AGENT_PROMPTS.md` ושלח לסוכן.

לדוגמה:
```
בצע את כל המשימות מהקובץ docs/tasks/phase-1-security-fixes.md במקביל.
```

### שלב 3: הסוכן מבצע
הסוכן יקרא את קובץ ה-Phase הרלוונטי ויבצע את כל המשימות.

### שלב 4: מחק את הקובץ
כשהסוכן מסיים, הוא ימחק את קובץ ה-Phase (חלק מההוראות בקובץ).

---

## ⚠️ כללים חשובים

### ❌ אל תערוך את הקבצים באופן ידני
הקבצים נועדו להיקרא על ידי סוכנים בלבד.

### ✅ מחק קבצים שהסתיימו
כל Phase שמסתיים - הקובץ שלו נמחק. זה עוזר לעקוב אחרי ההתקדמות.

### ✅ עדכן את Tracker
אחרי כל Phase, עדכן את `docs/IMPLEMENTATION_TRACKER.md`.

---

## 📊 מבנה קובץ Phase

כל קובץ Phase מכיל:

```markdown
# Phase X: [כותרת]

**Execution Mode:** PARALLEL/SEQUENTIAL
**Estimated Time:** X minutes

---

## Task X.1: [שם משימה]
[הוראות מפורטות]

**Status:** [ ] Completed

---

## Task X.2: [שם משימה]
[הוראות מפורטות]

**Status:** [ ] Completed

---

## Post-Completion Checklist
- [ ] Build passes
- [ ] Update tracker
- [ ] Delete this file
```

---

## 🔄 מעקב התקדמות

### איך לדעת איפה אתה:

1. **בדוק את התיקייה הזו** - קבצים שנמחקו = Phases שהסתיימו
2. **בדוק את `docs/IMPLEMENTATION_TRACKER.md`** - טבלת סטטוס מלאה
3. **ספור קבצים:**
   - 6 קבצים = לא התחלת
   - 3 קבצים = באמצע
   - 0 קבצים = סיימת! 🎉

---

## 📁 מבנה תיקיות הפרויקט

```
docs/
├── IMPLEMENTATION_TRACKER.md    ← מסמך מעקב מרכזי
├── AGENT_PROMPTS.md            ← פרומפטים מוכנים לשליחה
└── tasks/                       ← התיקייה שאתה נמצא בה עכשיו
    ├── README.md                ← הקובץ הזה
    ├── phase-1-security-fixes.md
    ├── phase-2-utilities.md
    ├── phase-3-refactoring.md
    ├── phase-4-code-quality.md
    ├── phase-5-features.md
    └── phase-6-testing.md
```

---

## 🎯 כשסיימת הכל

כשכל 6 קבצי ה-Phase נמחקו:

1. ✅ המעקב ב-`IMPLEMENTATION_TRACKER.md` מראה 100%
2. ✅ תיקיית `tasks/` ריקה (מלבד README זה)
3. ✅ גרסה 2.1.0 ב-package.json
4. ✅ CHANGELOG.md קיים
5. ✅ כל הבדיקות עוברות

**אז אפשר גם למחק תיקייה זו!** (אופציונלי)

---

**נוצר:** 2025-01-17
**מטרה:** ניהול משימות מסודר לשדרוג AgentMaestro
