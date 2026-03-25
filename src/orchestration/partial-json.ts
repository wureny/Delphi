export interface CompletedSectionContent {
  sectionKey: string;
  content: string;
}

export function extractCompletedSectionContents(
  rawText: string,
  sectionKeys: readonly string[],
  emittedSectionKeys: ReadonlySet<string>,
): CompletedSectionContent[] {
  const completed: CompletedSectionContent[] = [];

  for (const sectionKey of sectionKeys) {
    if (emittedSectionKeys.has(sectionKey)) {
      continue;
    }

    const match = rawText.match(
      new RegExp(
        `"${escapeRegExp(sectionKey)}"\\s*:\\s*\\{[\\s\\S]*?"content"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`,
        "m",
      ),
    );

    if (!match?.[1]) {
      continue;
    }

    try {
      completed.push({
        sectionKey,
        content: JSON.parse(`"${match[1]}"`) as string,
      });
    } catch {
      continue;
    }
  }

  return completed;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
