from pathlib import Path
text=Path('src/app/dashboard/invoices/new/page.tsx').read_text(encoding='utf-8').splitlines()
for i,line in enumerate(text):
    if 'issueDate' in line and '<input' in line:
        for j in range(i-5,i+10):
            if 0<=j<len(text):
                print(f"{j+1}: {text[j]}")
        break
