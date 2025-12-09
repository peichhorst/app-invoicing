from pathlib import Path
text=Path('src/app/dashboard/invoices/new/page.tsx').read_text(encoding='utf-8').splitlines()
for i,line in enumerate(text):
    if "Make recurring" in line:
        for j in range(i-20, i+120):
            if 0<=j<len(text):
                print(f"{j+1}: {text[j]}")
        break
