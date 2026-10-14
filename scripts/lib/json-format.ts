/**
 * Mise en forme stable des fichiers de contenu : en-tête et groupes indentés, une question par ligne.
 * Lisible pour un humain qui ajoute des questions, et compact pour le dépôt Git.
 */
export function formatContentFile(data: Record<string, unknown>): string {
  const { groups, questions, ...head } = data as { groups?: unknown[]; questions: unknown[] };
  const lines: string[] = ['{'];
  const headEntries = Object.entries(head);
  headEntries.forEach(([k, v]) => lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)},`));
  if (groups && groups.length) {
    lines.push('  "groups": [');
    groups.forEach((g, i) => {
      const body = JSON.stringify(g, null, 2)
        .split('\n')
        .map((l) => '    ' + l)
        .join('\n');
      lines.push(body + (i < groups.length - 1 ? ',' : ''));
    });
    lines.push('  ],');
  }
  lines.push('  "questions": [');
  questions.forEach((q, i) => lines.push(`    ${JSON.stringify(q)}${i < questions.length - 1 ? ',' : ''}`));
  lines.push('  ]');
  lines.push('}');
  return lines.join('\n') + '\n';
}
