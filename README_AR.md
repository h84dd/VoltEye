# VoltEye AI+ Dataset Export

## ماذا أضيف في هذه النسخة؟
- حفظ Dataset محلية تلقائيًا عند تأكيد التوقع أو تصحيحه.
- تصدير النتائج بصيغة JSON.
- تصدير النتائج بصيغة CSV.
- عداد لDataset Records Count داخل الواجهة.

## كيف يعمل الحفظ؟
- عند الضغط على **Prediction is Correct** يتم حفظ الحالة كعينة مؤكدة.
- عند الضغط على **Correct Prediction** ثم الحفظ يتم تخزين الحالة بالتصحيح الصحيح.
- يتم حفظ البيانات داخل LocalStorage تحت مفتاح `volteye-dataset-records`.

## كيف أستخدم JSON؟
- اضغط `Export JSON`.
- سيُنزّل ملف اسمه `volteye_dataset.json`.
- يمكن فتحه في أي محرر، أو استخدامه في Python أو Node.js.

## كيف أستخدم CSV؟
- اضغط `Export CSV`.
- سيُنزّل ملف اسمه `volteye_dataset.csv`.
- افتحه في Excel أو Google Sheets أو Python Pandas.

## أهم الحقول داخل البيانات
- `predictedFaultType`
- `predictedDevice`
- `predictedLocation`
- `actualFaultType`
- `actualDevice`
- `actualLocation`
- `isPredictionCorrect`
- `dI`, `dLeak`, `dTHD`, `dPF`, `dV`

## كيف أحلل النتائج بعد جمعها؟
### Excel / Google Sheets
- احسب نسبة النجاح من `isPredictionCorrect`
- اعمل Pivot Table حسب:
  - `predictedFaultType`
  - `actualFaultType`
  - `predictedDevice`
  - `actualDevice`

### Python
مثال سريع:
```python
import pandas as pd

df = pd.read_csv('volteye_dataset.csv')
print(df['isPredictionCorrect'].value_counts())
print(df.groupby(['actualDevice','predictedDevice']).size())
print(df.groupby(['actualFaultType','predictedFaultType']).size())
```

## ماذا أفعل بعد جمع 100 إلى 500 حالة؟
- راقب أكثر جهاز يتم الخلط بينه وبين غيره.
- راقب أكثر نوع fault يتم الخطأ فيه.
- عدّل `faultProfile` و `faultImpact` في `js/data.js`.
- إذا زادت البيانات كثيرًا، استخدم نسخة Backend للتخزين الدائم.
