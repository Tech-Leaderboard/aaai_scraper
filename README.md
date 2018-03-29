1. with node, spacy installed
```
node script.js
python3 fix-spacy.py aaai_raw.csv > aaai.csv 2>log.txt
```
fix the data in log.txt manually
```
python3 split_fname.py aaai_fixed.csv > aaai_f.csv 2>log2.txt
```
