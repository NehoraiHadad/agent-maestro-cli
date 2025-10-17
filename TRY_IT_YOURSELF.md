# AgentMaestro - נסה בעצמך / Try It Yourself

## הרצה בסיסית / Basic Usage

### 1. בדיקה מהירה של Delegation Handler

הרץ את הבדיקה הישירה של ה-delegation handler:

```bash
node test-delegation-direct.js
```

**מה זה עושה:**
- שולח משימה פשוטה ל-Gemini: "What is 5 + 3?"
- Gemini עונה: "8"
- מציג את התוצאה המעוצבת

**זמן ריצה:** ~8 שניות

---

### 2. בדיקה מלאה עם מספר סוכנים

הרץ בדיקה מקיפה עם Gemini וClaude:

```bash
node test-full-delegation-flow.js
```

**מה זה עושה:**
- מבחן 1: Gemini מחשב 15 × 7
- מבחן 2: Claude כותב 5 מילים
- מבחן 3: Gemini עונה על שאלה

**זמן ריצה:** ~25 שניות

---

### 3. הפעלת Maestro עם סוכן ראשי

#### אפשרות א': עם Gemini

```bash
node src/index.js --agent gemini
```

#### אפשרות ב': עם Claude

```bash
node src/index.js --agent claude
```

#### אפשרות ג': תפריט אינטראקטיבי

```bash
node src/index.js
```

יופיע תפריט:
```
? Select primary agent:
  ❯ Claude Code - Best for codebase navigation
    Gemini CLI - Best for automation and web search
    OpenAI Codex - Best for code generation
```

---

## דוגמת שימוש עם Delegation / Delegation Example

### תרחיש: הרצת Maestro ובקשת האצלה ידנית

כשתפעיל את Maestro, הסוכן הראשי ירוץ באופן אינטראקטיבי. כדי לבדוק delegation, תצטרך להגיד לסוכן הראשי להאציל משימה.

**דוגמה:**

1. **הפעל Maestro עם Claude:**
```bash
node src/index.js --agent claude
```

2. **שלח הוראה ל-Claude:**
```
Use Gemini to calculate what is 100 divided by 4, then explain the result
```

3. **Claude אמור להוציא:**
```
MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "Calculate 100 divided by 4"}
```

4. **Maestro יתפוס את זה ויריץ:**
```bash
gemini -p "Calculate 100 divided by 4"
```

5. **התוצאה תחזור ל-Claude:**
```
[MAESTRO_RESULT]
Agent: Gemini CLI
============================================================
25
============================================================
```

6. **Claude ימשיך:**
```
According to Gemini's calculation, 100 ÷ 4 = 25. This means...
```

---

## בדיקה ישירה של סוכן / Direct Agent Test

אם אתה רוצה לראות שהסוכן עצמו עובד:

### Gemini

```bash
gemini -p "What is the capital of Israel?"
```

**תשובה צפויה:** `Jerusalem` או `Tel Aviv` (תלוי בהקשר)

### Claude

```bash
claude -p "Say hello in 3 words"
```

**תשובה צפויה:** משהו כמו `Hello, how are?` או `Hey there friend`

---

## בעיות נפוצות / Common Issues

### בעיה: "command not found"

**פתרון:**
```bash
# בדוק שהסוכנים מותקנים
which gemini
which claude

# אם לא, התקן
npm install -g @google/gemini-cli
npm install -g @anthropic-ai/claude-code
```

### בעיה: Timeout

**סיבות אפשריות:**
1. Rate limiting - יותר מדי קריאות רצוף
2. הסוכן לא מחובר (צריך authentication)
3. הסוכן תקוע במצב אינטראקטיבי

**פתרון:**
- חכה 30 שניות בין קריאות
- בדוק authentication: `gemini --help` או `claude --help`
- נסה בדיקה ישירה קודם: `gemini -p "test"`

### בעיה: "process.stdin.setRawMode is not a function"

**זה תוקן!** הקוד עכשיו בודק אם יש TTY לפני שמשתמש ב-raw mode.

אם עדיין קורה:
```bash
# הרץ עם TTY
script -q -c "node src/index.js --agent gemini" /dev/null
```

---

## סקריפטים מוכנים / Ready Scripts

### בדיקה מהירה של כל הסוכנים

```bash
# Gemini
echo "Testing Gemini..."
gemini -p "Say hello"

# Claude (אם מותקן)
echo "Testing Claude..."
claude -p "Say hello"
```

### בדיקת Delegation עם טיימר

```bash
echo "Starting delegation test..."
time node test-delegation-direct.js
```

זה יראה כמה זמן זה לקח.

---

## מה לנסות / What to Try

### קל 🟢

```bash
# הרץ בדיקה פשוטה
node test-delegation-direct.js
```

### בינוני 🟡

```bash
# הרץ בדיקה מקיפה
node test-full-delegation-flow.js
```

### מתקדם 🔴

```bash
# הפעל Maestro ונסה לגרום לסוכן הראשי להאציל
node src/index.js --agent claude

# ואז שלח:
# "Use Gemini to research Flask security best practices"
```

---

## טיפים / Tips

1. **התחל קטן**: הרץ קודם `test-delegation-direct.js` כדי לוודא שהכל עובד

2. **בדוק לוגים**: שים לב לצבעים והאמוג'ים בפלט - הם מראים מה קורה

3. **שים לב לזמנים**: delegation לוקח בדרך כלל 7-10 שניות

4. **אם זה תקוע**: Ctrl+C יציא נקי (יש cleanup טוב)

5. **לא בטוח מה קורה?**: הוסף `--verbose` להרצת Maestro:
   ```bash
   node src/index.js --agent gemini --verbose
   ```

---

## Debug Mode

אם משהו לא עובד והאת רוצה לראות מה קורה:

```bash
# הפעל עם debug logs
DEBUG=* node test-delegation-direct.js
```

או:

```bash
# הפעל maestro עם verbose
node src/index.js --agent gemini --verbose
```

---

## שאלות נפוצות / FAQ

**ש: איך אני יודע שהסוכן קיבל את ההאצלה?**

ת: אתה תראה בלוג:
```
  ↳ [Gemini CLI] Starting task
- Gemini CLI is working...
```

**ש: כמה זמן זה אמור לקחת?**

ת: 7-10 שניות לdelegation רגיל.

**ש: מה אם זה timeout?**

ת: נסה שוב - יכול להיות rate limiting. או הגדל timeout:
```bash
node src/index.js --agent gemini --timeout 120000
```

**ש: איך אני יודע שזה עבד?**

ת: אתה תראה:
```
[MAESTRO_RESULT]
Agent: Gemini CLI
============================================================
[התשובה כאן]
============================================================
```

---

## Next Steps / הצעדים הבאים

אחרי שבדקת שהכל עובד:

1. ✅ נסה delegation פשוט
2. ✅ נסה עם כמה סוכנים
3. ✅ הפעל Maestro באופן אינטראקטיבי
4. 🚀 התחל להשתמש בזה לפרויקטים אמיתיים!

---

**מוכן להתחיל? הרץ:**

```bash
node test-delegation-direct.js
```

🎭 **Happy orchestrating!**
