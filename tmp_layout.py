from pathlib import Path
text=Path('src/app/layout.tsx').read_text(encoding='utf-8').splitlines()
for i,line in enumerate(text):
    if 'flex items-center gap-2' in line:
        for j in range(i, i+30):
            print(f"{j+1}: {text[j]}")
        break
