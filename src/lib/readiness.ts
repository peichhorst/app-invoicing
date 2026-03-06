import { readFile } from 'fs/promises';
import path from 'path';

type TaskCount = {
  total: number;
  completed: number;
  pending: number;
};

export type ReadinessSection = TaskCount & {
  name: string;
  percent: number;
};

export type ReadinessSummary = {
  todoSections: ReadinessSection[];
  qaSections: ReadinessSection[];
  qaTotals: TaskCount;
  signoffs: { pass: number; fail: number };
  releaseReadiness: number;
  releaseStage: 'Beta' | 'Release Candidate' | 'Production Ready';
};

const CHECKBOX_RE = /^\s*-\s*\[([ xX])\]\s+/;

const percent = (completed: number, total: number) => (total > 0 ? Math.round((completed / total) * 100) : 0);

function parseSections(markdown: string, targetHeadings?: string[]): ReadinessSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: ReadinessSection[] = [];
  let currentName: string | null = null;
  let current: TaskCount = { total: 0, completed: 0, pending: 0 };
  const allowList = targetHeadings ? new Set(targetHeadings.map((x) => x.toLowerCase())) : null;

  const flush = () => {
    if (!currentName) return;
    if (allowList && !allowList.has(currentName.toLowerCase())) return;
    sections.push({
      name: currentName,
      ...current,
      percent: percent(current.completed, current.total),
    });
  };

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      flush();
      currentName = heading[1].trim();
      current = { total: 0, completed: 0, pending: 0 };
      continue;
    }

    const task = line.match(CHECKBOX_RE);
    if (task) {
      const checked = task[1].toLowerCase() === 'x';
      current.total += 1;
      if (checked) current.completed += 1;
      else current.pending += 1;
    }
  }

  flush();
  return sections.filter((s) => s.total > 0);
}

function sumCounts(sections: ReadinessSection[]): TaskCount {
  return sections.reduce(
    (acc, item) => {
      acc.total += item.total;
      acc.completed += item.completed;
      acc.pending += item.pending;
      return acc;
    },
    { total: 0, completed: 0, pending: 0 },
  );
}

function parseSignoffs(markdown: string): { pass: number; fail: number } {
  const lines = markdown.split(/\r?\n/);
  let pass = 0;
  let fail = 0;
  for (const line of lines) {
    const m = line.match(/^- Result:\s*(Pass|Fail)\s*$/i);
    if (!m) continue;
    if (m[1].toLowerCase() === 'pass') pass += 1;
    if (m[1].toLowerCase() === 'fail') fail += 1;
  }
  return { pass, fail };
}

export async function getReadinessSummary(): Promise<ReadinessSummary> {
  const root = process.cwd();
  const [todoMd, qaMd] = await Promise.all([
    readFile(path.join(root, 'docs', 'TODO.md'), 'utf8'),
    readFile(path.join(root, 'docs', 'QA-CHECKLIST.md'), 'utf8'),
  ]);

  const todoSections = parseSections(todoMd, ['Now', 'Next', 'Later']);
  const qaSections = parseSections(qaMd).filter(
    (section) => !section.name.toLowerCase().includes('session sign-off'),
  );
  const qaTotals = sumCounts(qaSections);
  const signoffs = parseSignoffs(qaMd);

  const todoTotals = sumCounts(todoSections);
  const todoCoverage = todoTotals.total > 0 ? todoTotals.completed / todoTotals.total : 0;
  const qaCoverage = qaTotals.total > 0 ? qaTotals.completed / qaTotals.total : 0;
  const signoffQuality =
    signoffs.pass + signoffs.fail > 0 ? signoffs.pass / (signoffs.pass + signoffs.fail) : 0.5;

  const releaseReadiness = Math.round(todoCoverage * 40 + qaCoverage * 40 + signoffQuality * 20);
  const releaseStage =
    releaseReadiness >= 85 ? 'Production Ready' : releaseReadiness >= 60 ? 'Release Candidate' : 'Beta';

  return {
    todoSections,
    qaSections,
    qaTotals,
    signoffs,
    releaseReadiness,
    releaseStage,
  };
}
