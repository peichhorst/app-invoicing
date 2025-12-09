from pathlib import Path
text=Path('src/app/dashboard/invoices/new/page.tsx').read_text(encoding='utf-8').splitlines()
for i,line in enumerate(text):
    if 'issueDate' in line or 'dueDate' in line:
        print(f"{i+1}: {line}")
