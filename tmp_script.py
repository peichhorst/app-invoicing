from pathlib import Path
path = Path('src/lib/email.ts')
text = path.read_text()
start = text.index('const html = `')
end = text.index('const subject =', start)
print(text[start:end])
