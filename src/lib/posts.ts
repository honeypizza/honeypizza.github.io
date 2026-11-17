import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE } from '../consts';
import { tagSlug } from './tag-slug';

export type Post = CollectionEntry<'posts'>;
export type Category = Post['data']['category'];

export const CATEGORIES: Record<Category, { label: string; href: string; description: string }> = {
  daily: { label: '일상', href: '/posts/daily/', description: '사진과 짧은 글로 남기는 하루하루의 기록' },
  study: { label: '공부', href: '/posts/study/', description: '배우고 익힌 것을 차근차근 정리하는 공부 기록' },
};

/**
 * 최신순. 날짜(시각)까지 같으면 주소(id) 순으로 고정해서, 빌드할 때마다 목록과 이전/다음 글 순서가 바뀌지 않게 한다.
 * 같은 날 쓴 글의 순서를 정하고 싶으면 date에 시각을 적는다 (2026-11-10 21:30).
 */
export function comparePosts(a: Post, b: Post) {
  return b.data.date.valueOf() - a.data.date.valueOf() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * 최신순으로 정렬한 글 목록.
 * draft 글은 `npm run dev`에서는 보이고, build(배포)에서는 빠진다.
 */
export async function getPosts(category?: Category): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => {
    if (import.meta.env.PROD && data.draft) return false;
    return category ? data.category === category : true;
  });
  return posts.sort(comparePosts);
}

export function postHref(post: Post) {
  return `/posts/${post.id}/`;
}

export { tagSlug };

export function tagHref(tag: string) {
  return `/tags/${tagSlug(tag)}/`;
}

/** 태그별로 글을 묶는다. 표기는 처음 나온(가장 최근 글의) 태그 이름을 따른다. */
export function groupByTag(posts: Post[]) {
  const map = new Map<string, { slug: string; label: string; posts: Post[] }>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const slug = tagSlug(tag);
      const group = map.get(slug) ?? { slug, label: tag.trim(), posts: [] };
      // 한 글에 같은 태그가 다른 표기로 두 번 있어도(C# / c#) 한 번만 넣는다.
      if (group.posts.at(-1) !== post) group.posts.push(post);
      map.set(slug, group);
    }
  }
  return [...map.values()].sort((a, b) => b.posts.length - a.posts.length || a.label.localeCompare(b.label, 'ko'));
}

/** 날짜는 어디서 빌드하든 한국 시간(SITE.timeZone) 기준으로 읽는다. */
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: SITE.timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dateParts(date: Date) {
  const parts = dateFormatter.formatToParts(date);
  const get = (type: 'year' | 'month' | 'day') => parts.find((part) => part.type === type)?.value ?? '';
  return { y: get('year'), m: get('month'), d: get('day') };
}

export function yearOf(date: Date) {
  return Number(dateParts(date).y);
}

/** 연도별로 묶는다. 최신 연도가 먼저 온다. (posts는 최신순이어야 한다) */
export function groupByYear(posts: Post[]) {
  const groups: { year: number; posts: Post[] }[] = [];
  for (const post of posts) {
    const year = yearOf(post.data.date);
    const last = groups.at(-1);
    if (last?.year === year) last.posts.push(post);
    else groups.push({ year, posts: [post] });
  }
  return groups;
}

/**
 * - long:  2026년 11월 17일
 * - dot:   2026.11.17
 * - short: 11.17 (연도별 목록 안에서)
 */
export function formatDate(date: Date, style: 'long' | 'dot' | 'short' = 'long') {
  const { y, m, d } = dateParts(date);
  if (style === 'dot') return `${y}.${m}.${d}`;
  if (style === 'short') return `${m}.${d}`;
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

/** 날짜를 <time datetime>에 넣을 YYYY-MM-DD 형식으로. */
export function isoDate(date: Date) {
  const { y, m, d } = dateParts(date);
  return `${y}-${m}-${d}`;
}

/** 한글은 1분에 약 500자, 영문·숫자 단어는 1분에 약 200단어를 읽는다고 본다. */
const HANGUL_PER_MINUTE = 500;
const WORDS_PER_MINUTE = 200;

/** 본문을 코드 블록(``` 또는 ~~~ 사이)과 나머지로 나눈다. */
function splitCode(body: string) {
  const prose: string[] = [];
  const code: string[] = [];
  let fence = '';
  for (const line of body.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (!fence && marker) fence = marker[1];
    else if (fence && marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = '';
    else (fence ? code : prose).push(line);
  }
  return { prose: prose.join('\n'), code: code.join('\n') };
}

/**
 * 읽는 시간(분). MDX의 import/export 줄, 주석, component·HTML tag, 링크·이미지 주소는 세지 않는다.
 * 코드는 단어로 센다. 사진·동영상은 장마다 12초에서 1초씩 줄여(최소 3초) 더한다 (주석·코드 안의 예시는 빼고).
 */
export function readingMinutes(body = '') {
  const { prose, code } = splitCode(body.replace(/\{\/\*[\s\S]*?\*\/\}|<!--[\s\S]*?-->/g, ' '));
  const media = prose.match(/!\[[^\]]*\]\([^)]*\)|<(?:Figure|Video|YouTube)\b/g)?.length ?? 0;
  const text = `${prose}\n${code}`
    .replace(/^(?:import|export)\s[^\n]*(?:\n(?![ \t]*$)[^\n]*)*/gm, ' ')
    .replace(/!\[[^\]]*\]\(\s*\S+(?:\s+"([^"]*)")?\s*\)/g, ' $1 ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<\/?[A-Za-z][^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ');
  const hangul = text.match(/[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu)?.length ?? 0;
  const words =
    text.replace(/[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu, ' ').match(/[\p{L}\p{N}]+/gu)
      ?.length ?? 0;
  let seconds = (hangul / HANGUL_PER_MINUTE + words / WORDS_PER_MINUTE) * 60;
  for (let i = 0; i < media; i++) seconds += Math.max(12 - i, 3);
  return Math.max(1, Math.round(seconds / 60));
}
