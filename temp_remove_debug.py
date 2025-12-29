from pathlib import Path
path = Path('src/app/dashboard/(with-shell)/compliance/page.tsx')
text = path.read_text()
start = text.index('        <section className= rounded-3xl border border-amber-200 bg-amber-50/60 px-5 py-5 shadow-sm>')
end = text.index('        {report && report.byPosition.length > 0', start)
path.write_text(text[:start] + text[end:], 'utf8')
