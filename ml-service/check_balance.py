import requests
import pandas as pd

response = requests.get("http://localhost:8080/stocks/NVDA/training-data")
df = pd.DataFrame(response.json())

print("Total examples:", len(df))
print()
print(df['target'].value_counts())
print()
print(df['target'].value_counts(normalize=True))