# VoltEye Auto Dataset + Auto Validation

## ماذا أضيف في هذه النسخة؟
- في **Simulation Mode**:
  - يتحقق النظام تلقائيًا هل التحNight صحيح أم لا
  - يحفظ **Correct Device** و**Correct Fault Type** و**المكان الصحيح** تلقائيًا
  - يضيف الحالة إلى Dataset محلية بدون تدخل يدوي
  - يعلّم النظام نفسه تلقائيًا من حالات Simulation

- في **Real Reading Mode**:
  - يبقى التحNight ذاتيًا من البيانات الموجودة
  - لكن التأكيد أو التصحيح اليدوي يظل اختياريًا، لأن المتصفح لا يعرف الحقيقة الأرضية للقراءة الحقيقية وحده

## كيف يعمل التحNight الآن؟
1. يقرأ البيانات من Simulation أو من مصدر القراءة
2. يشغّل `analysis.js`
3. إذا كان Mode **Simulation**:
   - يقارن التوقع مع `currentFault`
   - يعرف تلقائيًا إذا كان Prediction is Correctًا أو خاطئًا
   - يحفظ النتيجة في الـ Dataset
   - يعدّل التعلم تلقائيًا

## هل يحتاج موقع JSON خارجي؟
**لا**.
التطبيق يحلل **بنفسه** من البيانات التي يقرؤها ومن الحالات المخزنة داخل `localStorage`.

## متى أحتاج JSON أو CSV؟
تحتاج التصدير فقط إذا أردت:
- تحNight النتائج في Excel أو Google Sheets
- تدريب نموذج خارجي في Python
- رفع البيانات لاحقًا إلى Backend

## كيف أربطه مع برامج التحNight؟
### Excel / Google Sheets
- اضغط **Export CSV**
- افتح الملف في Excel
- استخدم Pivot Table أو فرز وتجميع

### Python / Pandas
- اضغط **Export JSON** أو **Export CSV**
- ثم اقرأ الملف في Python:

```python
import pandas as pd
df = pd.read_csv("volteye_dataset.csv")
print(df.head())
print(df["isPredictionCorrect"].value_counts())
```

## هل يجب Start “موقع JSON”؟
لا.
- التطبيق لا يحتاج موقع JSON لكي يحلل
- يعمل محليًا من البيانات الحالية والذاكرة المتعلمة
- JSON/CSV فقط للتصدير والتحNight الخارجي أو للتخزين طويل المدى

## متى أحتاج Backend؟
عندما تريد:
- حفظ دائم خارج المتصفح
- مشاركة البيانات بين أكثر من جهاز
- ربط جهاز فعلي
- تحNight تاريخي كبير
- تدريب نموذج ML لاحقًا
