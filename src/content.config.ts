import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { tagSlug } from './lib/tag-slug';

/** /posts/daily/, /posts/study/ 페이지와 주소가 겹치거나 헷갈리므로 글 주소로 쓸 수 없다. */
const RESERVED_SLUGS = new Set(['daily', 'study', 'index']);

/**
 * 파일 경로에서 글 주소(slug)를 만든다.
 *   daily/autumn-walk/index.mdx → autumn-walk
 *   study/hello.md              → hello
 *   daily/첫눈 온 날/index.md     → 첫눈-온-날
 * 대문자는 소문자로, 공백은 하이픈(-)으로 바꾸고 그 밖의 기호는 뺀다.
 * category 폴더는 정리용일 뿐이고, 실제 분류는 frontmatter의 category가 정한다.
 */
function postSlug(entry: string) {
  const parts = entry.replace(/\.mdx?$/i, '').split(/[\\/]/);
  const last = parts.at(-1);
  const name = last?.toLowerCase() === 'index' ? parts.at(-2) : last;
  const slug = (name ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{M}\p{N}_-]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw new Error(`글 주소를 만들 수 없습니다. 폴더 이름을 확인해 주세요: ${entry}`);
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error(`"${slug}"는 예약된 주소라 글 폴더·파일 이름으로 쓸 수 없습니다: ${entry}`);
  }
  return slug;
}

/** 글 주소 → 파일. 두 글이 같은 주소를 쓰면 한 글이 조용히 사라지므로 빌드를 멈춘다. */
const slugOwners = new Map<string, string>();

function claimSlug(slug: string, entry: string, base: URL) {
  const owner = slugOwners.get(slug);
  // 폴더를 옮기거나 이름을 바꾼 경우(dev 서버 실행 중)에는 예전 파일이 이미 없다.
  if (owner && owner !== entry && existsSync(join(fileURLToPath(base), owner))) {
    throw new Error(`글 주소가 겹칩니다: "${slug}" (${owner}, ${entry}). 폴더 이름 하나를 바꿔 주세요.`);
  }
  slugOwners.set(slug, entry);
}

/**
 * date 값을 읽는다. 시간대를 적지 않은 날짜·시각은 한국 시간으로 본다.
 *   2026-11-10          → 2026년 11월 10일 (YAML이 읽은 UTC 0시 = 한국 오전 9시, 어느 쪽이든 같은 날)
 *   2026-11-10 21:30    → 한국 시간 21:30  (2026.11.10, 2026/11/10 형식도 된다)
 *   2026-11-10T21:30:00+09:00 처럼 시간대를 적으면 그대로 따른다.
 * 주의: 초까지 적고 시간대를 빼면(2026-11-10 21:30:00) YAML이 UTC로 읽는다.
 */
const DATE_PATTERN =
  /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})\.?(?:(?:T|\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;

function parsePostDate(value: unknown) {
  if (typeof value !== 'string') return value;
  const match = value.trim().match(DATE_PATTERN);
  if (!match) return value;
  const [, y, mo, d, h, mi, s, zone] = match;
  const [year, month, day] = [Number(y), Number(mo), Number(d)];
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return new Date(NaN);
  if (h === undefined) return calendar;
  if (Number(h) > 23) return new Date(NaN);
  const pad = (n: string | number) => String(n).padStart(2, '0');
  const offset = !zone ? '+09:00' : zone.toUpperCase() === 'Z' ? 'Z' : `${zone.slice(0, 3)}:${zone.slice(-2)}`;
  return new Date(`${y}-${pad(month)}-${pad(day)}T${pad(h)}:${mi}:${s ?? '00'}${offset}`);
}

/** npm run new가 넣는 기본 문구. 이 문구가 남은 채로 배포되지 않게 막는다. */
const PLACEHOLDER_TITLES = ['제목을 적어 주세요', '제목을 입력하세요'];
const PLACEHOLDER_DESCRIPTION = '목록에 보일 한 줄 요약을 적어 주세요.';

/**
 * schema만으로는 잡을 수 없는 실수를 글 파일을 읽을 때 확인한다.
 * - date: YAML은 2026-02-30을 3월 2일로 바꿔 읽으므로, 파일에 적힌 글자 그대로 다시 확인한다.
 * - 기본 문구가 남은 글은 draft: true일 때만 허용한다.
 */
function checkPost(entry: string, base: URL, data: Record<string, unknown>) {
  let source = '';
  try {
    source = readFileSync(join(fileURLToPath(base), entry), 'utf8');
  } catch {
    // 파일을 못 읽으면 확인을 건너뛴다 (실제 오류는 Astro가 알려 준다).
  }
  const frontmatter = source.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const rawDate = frontmatter
    .match(/^date:[ \t]*(.*)$/m)?.[1]
    .replace(/\s+#.*$/, '')
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2');
  if (rawDate) {
    const date = parsePostDate(rawDate);
    if (date instanceof Date && Number.isNaN(date.valueOf())) {
      throw new Error(`${entry}: date "${rawDate}"는 없는 날짜·시각입니다. 2026-11-10 또는 2026-11-10 21:30 형식으로 적어 주세요.`);
    }
  }

  if (data.draft !== true) {
    const title = typeof data.title === 'string' ? data.title.trim() : '';
    if (PLACEHOLDER_TITLES.includes(title)) {
      throw new Error(`${entry}: title이 아직 기본 문구("${title}")입니다. 제목을 적거나, 아직 쓰는 중이면 draft: true로 두세요.`);
    }
    if (typeof data.description === 'string' && data.description.trim() === PLACEHOLDER_DESCRIPTION) {
      throw new Error(`${entry}: description이 아직 기본 문구입니다. 목록에 보일 한 줄 요약을 적거나, 아직 쓰는 중이면 draft: true로 두세요.`);
    }
  }
  if (data.cover && !data.coverAlt) {
    console.warn(`[블로그] ${entry}: cover(대표 이미지)에 coverAlt(이미지 설명)가 없습니다. 화면 낭독기 사용자를 위해 적어 주세요.`);
  }
}

/**
 * tags 값을 정리한다. `tags: 산책, 사진`처럼 쉼표로 적어도 되고,
 * 앞에 붙인 #은 떼며(#산책 → 산책), 주소가 같아지는 중복(대소문자·공백·구분 기호만 다른 태그)은 하나만 남긴다.
 */
function normalizeTags(value: unknown) {
  if (value === undefined || value === null) return [];
  const list = typeof value === 'string' ? value.split(',') : value;
  if (!Array.isArray(list)) return value;
  const seen = new Set<string>();
  return list.flatMap((item) => {
    if (typeof item !== 'string' && typeof item !== 'number') return [item];
    const tag = String(item).trim().replace(/^#+\s*/, '');
    const key = tagSlug(tag);
    if (!tag || seen.has(key)) return [];
    seen.add(key);
    return [tag];
  });
}

const posts = defineCollection({
  loader: glob({
    // `_`로 시작하는 파일·폴더는 무시한다 (메모, 임시 파일용).
    pattern: ['**/*.{md,mdx}', '!**/_*', '!**/_*/**'],
    base: './src/content/posts',
    generateId: ({ entry, base, data }) => {
      const slug = postSlug(entry);
      claimSlug(slug, entry, base);
      checkPost(entry, base, data);
      return slug;
    },
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string().trim().min(1, { error: 'title(제목)이 비어 있습니다.' }),
      description: z.string().trim().min(1, { error: 'description(한 줄 요약)이 비어 있습니다.' }),
      date: z.preprocess(
        parsePostDate,
        z.date({ error: 'date는 2026-11-10 또는 2026-11-10 21:30 형식으로 적어 주세요.' }),
      ),
      category: z.enum(['daily', 'study'], { error: 'category는 daily 또는 study 중 하나여야 합니다.' }),
      tags: z.preprocess(normalizeTags, z.array(z.string())).default([]),
      toc: z.boolean().default(true),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { posts };
