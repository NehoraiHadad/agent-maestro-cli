# 🤖 Agent Execution Prompts

**מסמך זה מכיל את כל הפרומפטים המוכנים לשימוש עם סוכנים.**

העתק את הפרומפט הרלוונטי ושלח אותו לסוכן. הסוכן יקרא את הקובץ המתאים ויבצע את המשימות.

---

## 📊 מעקב התקדמות

**קובץ המעקב המרכזי:** `docs/IMPLEMENTATION_TRACKER.md`

עדכן את הקובץ הזה אחרי כל phase שמסתיים.

---

## ⚠️ הוראות חשובות

### לפני שמתחילים:
1. ✅ ודא ש-Phase הקודם הסתיים בהצלחה
2. ✅ בדוק ש-`npm run build` עובד
3. ✅ עדכן את `IMPLEMENTATION_TRACKER.md` לפני המעבר ל-Phase הבא

### אחרי כל Phase:
1. ✅ הרץ `npm run build` לוודא שאין שגיאות
2. ✅ עדכן את `IMPLEMENTATION_TRACKER.md`
3. ✅ בצע commit
4. ✅ **מחק את קובץ ה-Phase** שהסתיים

---

## 🚀 Phase 1: תיקוני אבטחה קריטיים

**מצב ביצוע:** ✅ PARALLEL (כל המשימות במקביל)
**זמן משוער:** ~5 דקות

### הפרומפט:

```
בצע את כל המשימות מהקובץ docs/tasks/phase-1-security-fixes.md במקביל.

הקובץ מכיל 3 משימות קריטיות:
1. תיקון Command Injection
2. תיקון Session ID Generation
3. הוספת Graceful Shutdown

אחרי שתסיים:
- הרץ npm run build
- עדכן את docs/IMPLEMENTATION_TRACKER.md
- סמן Phase 1 כ-✅ Completed
- מחק את הקובץ docs/tasks/phase-1-security-fixes.md
```

---

## 🔧 Phase 2: יצירת Utility Classes

**מצב ביצוע:** ✅ PARALLEL (כל המשימות במקביל)
**זמן משוער:** ~10 דקות
**תלות:** Phase 1 חייב להיות מסוים

### הפרומפט:

```
בצע את כל המשימות מהקובץ docs/tasks/phase-2-utilities.md במקביל.

הקובץ מכיל 5 משימות ליצירת utility classes:
1. SessionIdExtractor
2. TIMEOUTS constants
3. RetryManager
4. CircuitBreaker
5. ConfigValidationError

אחרי שתסיים:
- הרץ npm run build
- עדכן את docs/IMPLEMENTATION_TRACKER.md
- סמן Phase 2 כ-✅ Completed
- מחק את הקובץ docs/tasks/phase-2-utilities.md
```

---

## 🏗️ Phase 3: רפקטורינג ארכיטקטוני

**מצב ביצוע:** ⚠️ SEQUENTIAL (חובה לרוץ בסדר: 3.1 → 3.2 → 3.3 → 3.4)
**זמן משוער:** ~15 דקות
**תלות:** Phase 2 חייב להיות מסוים

### הפרומפט:

```
בצע את כל המשימות מהקובץ docs/tasks/phase-3-refactoring.md בסדר טורי.

⚠️ חשוב מאוד: המשימות חייבות לרוץ בסדר המדויק הזה:
1. שימוש ב-SessionIdExtractor ב-Maestro
2. שימוש ב-TIMEOUTS constants
3. אכיפת validation ב-ConfigManager
4. הוספת Dependency Injection ל-Maestro

אחרי כל משימה, ודא שהקוד עובר build לפני שממשיכים הלאה.

אחרי שתסיים את כל 4 המשימות:
- הרץ npm run build
- עדכן את docs/IMPLEMENTATION_TRACKER.md
- סמן Phase 3 כ-✅ Completed
- מחק את הקובץ docs/tasks/phase-3-refactoring.md
```

---

## 📝 Phase 4: שיפורי איכות קוד

**מצב ביצוע:** ✅ PARALLEL (כל המשימות במקביל)
**זמן משוער:** ~10 דקות
**תלות:** Phase 3 חייב להיות מסוים

### הפרומפט:

```
בצע את כל המשימות מהקובץ docs/tasks/phase-4-code-quality.md במקביל.

הקובץ מכיל 5 משימות:
1. החלפת console.log ב-LoggingManager
2. שיפור TypeScript types
3. הוספת JSDoc מקיף
4. המרת tests ל-TypeScript
5. שיפור error messages

אחרי שתסיים:
- הרץ npm run build
- הרץ npm test
- עדכן את docs/IMPLEMENTATION_TRACKER.md
- סמן Phase 4 כ-✅ Completed
- מחק את הקובץ docs/tasks/phase-4-code-quality.md
```

---

## 🚀 Phase 5: Features חדשים

**מצב ביצוע:** ✅ PARALLEL (כל המשימות במקביל)
**זמן משוער:** ~10 דקות
**תלות:** Phase 3 חייב להיות מסוים

### הפרומפט:

```
בצע את כל המשימות מהקובץ docs/tasks/phase-5-features.md במקביל.

הקובץ מכיל 4 משימות:
1. שילוב RetryManager ב-PTYManager
2. שילוב CircuitBreaker ב-AgentRepository
3. יצירת MetricsCollector class
4. שילוב MetricsCollector ב-Maestro

אחרי שתסיים:
- הרץ npm run build
- עדכן את docs/IMPLEMENTATION_TRACKER.md
- סמן Phase 5 כ-✅ Completed
- מחק את הקובץ docs/tasks/phase-5-features.md
```

**💡 הערה:** Phase 4 ו-Phase 5 יכולים לרוץ במקביל (שניהם תלויים רק ב-Phase 3).

---

## 📚 Phase 6: בדיקות ותיעוד

**מצב ביצוע:** ✅ PARALLEL (כל המשימות במקביל)
**זמן משוער:** ~5 דקות
**תלות:** כל ה-Phases הקודמים חייבים להיות מסוימים

### הפרומפט:

```
בצע את כל המשימות מהקובץ docs/tasks/phase-6-testing.md במקביל.

הקובץ מכיל 4 משימות:
1. הרצת build ובדיקת compilation
2. הרצת כל הבדיקות
3. עדכון README
4. יצירת CHANGELOG

אחרי שתסיים:
- עדכן את docs/IMPLEMENTATION_TRACKER.md לסטטוס 100% השלמה
- עדכן package.json version ל-2.1.0
- בצע commit סופי
- צור git tag: v2.1.0
- מחק את הקובץ docs/tasks/phase-6-testing.md
- מחק את כל קבצי המשימות מ-docs/tasks/
- דחוף לריפוזיטורי
```

---

## 📋 אסטרטגיית ביצוע מומלצת

### אופציה 1: שלב אחר שלב (מומלץ למתחילים)

```
1. שלח: "בצע Phase 1" → המתן לסיום → בדוק build
2. שלח: "בצע Phase 2" → המתן לסיום → בדוק build
3. שלח: "בצע Phase 3" → המתן לסיום → בדוק build
4. שלח: "בצע Phase 4" → המתן לסיום → בדוק build
5. שלח: "בצע Phase 5" → המתן לסיום → בדוק build
6. שלח: "בצע Phase 6" → המתן לסיום → בדיקות מלאות
```

### אופציה 2: מקסימום מקביליות (מומלץ למתקדמים)

```
1. Phase 1 (PARALLEL)
2. Phase 2 (PARALLEL)
3. Phase 3 (SEQUENTIAL - חובה!)
4. Phase 4 + Phase 5 במקביל:
   שלח שני פרומפטים נפרדים:
   - סוכן 1: "בצע Phase 4"
   - סוכן 2: "בצע Phase 5"
   המתן שכל שניהם יסיימו
5. Phase 6 (PARALLEL)
```

---

## 🔍 פתרון בעיות

### אם build נכשל:
```
הסבר לסוכן:
"ה-build נכשל. בדוק את השגיאות, תקן אותן, והרץ שוב npm run build"
```

### אם משימה נכשלה:
```
הסבר לסוכן:
"המשימה X נכשלה. קרא שוב את ההוראות בקובץ הרלוונטי ונסה שוב"
```

### אם צריך לעצור ולהמשיך מאוחר יותר:
1. בדוק את `docs/IMPLEMENTATION_TRACKER.md` לראות איפה עצרת
2. ודא שה-Phase האחרון שהסתיים מסומן ב-✅
3. המשך מה-Phase הבא

---

## ✅ Checklist כללי

לפני שמתחילים:
- [ ] הריפוזיטורי נמצא על branch נקי
- [ ] `npm install` הורץ
- [ ] `npm run build` עובד

במהלך הביצוע:
- [ ] עדכן `IMPLEMENTATION_TRACKER.md` אחרי כל Phase
- [ ] הרץ `npm run build` אחרי כל Phase
- [ ] מחק קבצי משימות שהסתיימו

אחרי שמסיימים הכל:
- [ ] כל 6 ה-Phases מסומנים ✅
- [ ] `npm run build` עובר בהצלחה
- [ ] `npm test` עובר בהצלחה
- [ ] Version ב-package.json: 2.1.0
- [ ] CHANGELOG.md קיים
- [ ] README.md מעודכן
- [ ] Git tag v2.1.0 נוצר
- [ ] שינויים נדחפו לריפוזיטורי

---

## 📊 זמנים משוערים

| Phase | זמן | סוג ביצוע |
|-------|-----|-----------|
| Phase 1 | 5 דקות | PARALLEL |
| Phase 2 | 10 דקות | PARALLEL |
| Phase 3 | 15 דקות | SEQUENTIAL |
| Phase 4 | 10 דקות | PARALLEL |
| Phase 5 | 10 דקות | PARALLEL |
| Phase 6 | 5 דקות | PARALLEL |
| **סה"כ** | **~55 דקות** | |

אם מריצים Phase 4+5 במקביל: **~50 דקות**

---

## 🎯 הצלחה!

כשכל ה-Phases מסומנים ✅ ב-`IMPLEMENTATION_TRACKER.md` - סיימת!

הפרויקט עבר שדרוג מלא עם:
- ✅ תיקוני אבטחה קריטיים
- ✅ ארכיטקטורה משופרת
- ✅ Features חדשים
- ✅ איכות קוד גבוהה
- ✅ תיעוד מלא

---

**נוצר:** 2025-01-17
**גרסה:** 1.0
**עבור:** AgentMaestro v2.1.0 Implementation
