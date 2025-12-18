from pathlib import Path
text = Path('src/app/dashboard/tools/ToolSnapshotPanel.tsx').read_text()
start = text.index('              <article className= rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm>\n                <p className=text-xs font-semibold uppercase tracking-[0.3em] text-purple-500>Weather</p>')
end = text.index('              <article className=rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm>', start+1)
print(text[start:end])
