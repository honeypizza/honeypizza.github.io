import type { MarkdownHeading } from 'astro';

export interface TocItem {
  slug: string;
  text: string;
  /** 01, 02 / 하위 항목은 02.1 */
  num: string;
  children: TocItem[];
}

/**
 * H2 → 01, 02… / H3 → 02.1, 02.2… 로 번호를 붙인다.
 * 각주 제목(footnote-label)과 첫 H2보다 앞선 H3는 뺀다. 빈 배열이면 목차를 보이지 않는다.
 */
export function buildToc(headings: MarkdownHeading[]): TocItem[] {
  const items: TocItem[] = [];
  for (const { depth, slug, text } of headings) {
    if (slug === 'footnote-label') continue;
    if (depth === 2) {
      items.push({ slug, text, num: String(items.length + 1).padStart(2, '0'), children: [] });
    } else if (depth === 3 && items.length > 0) {
      const parent = items.at(-1)!;
      parent.children.push({ slug, text, num: `${parent.num}.${parent.children.length + 1}`, children: [] });
    }
  }
  return items;
}
