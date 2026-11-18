/**
 * 새 글 폴더와 index.mdx를 만든다.
 *
 *   npm run new -- <daily|study> <slug> "제목"
 *   npm run new -- daily first-snow "첫눈 온 날"
 *
 * → src/content/posts/daily/first-snow/index.mdx (draft: true 상태로 생성)
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const postsDir = join(root, 'src', 'content', 'posts');

const CATEGORIES = ['daily', 'study'];
/** src/content.config.ts의 RESERVED_SLUGS와 같다. */
const RESERVED_SLUGS = ['daily', 'study', 'index'];

/** 화면에 보여 줄 경로 (Windows에서도 / 로) */
const show = (path) => relative(root, path).split(sep).join('/');

function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  console.error('  사용법: npm run new -- <daily|study> <slug> "제목"');
  console.error('  예시:   npm run new -- daily first-snow "첫눈 온 날"\n');
  process.exit(1);
}

/** src/content.config.ts의 postSlug와 같은 규칙으로 폴더·파일 이름을 주소로 바꾼다. */
function toSlug(name) {
  return name
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{M}\p{N}_-]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

const [categoryArg = '', slugArg = '', ...titleWords] = process.argv.slice(2);
const category = categoryArg.trim().toLowerCase();
// 대문자, 공백, 밑줄은 알아서 고친다: "First Snow" → first-snow
const slug = slugArg.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/-{2,}/g, '-');
const title = titleWords.join(' ').trim() || '제목을 적어 주세요';

if (!CATEGORIES.includes(category)) fail('category는 daily 또는 study 중 하나여야 합니다.');
if (!slug) fail('글 주소로 쓸 slug를 적어 주세요. 예: first-snow');
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  fail(`slug에 쓸 수 없는 글자가 있습니다: "${slugArg}". 영어 소문자, 숫자, 하이픈(-)만 쓸 수 있습니다. 예: first-snow`);
}
if (RESERVED_SLUGS.includes(slug)) fail(`"${slug}"는 예약된 주소라 slug로 쓸 수 없습니다.`);

/**
 * 이미 같은 주소를 쓰는 글을 찾는다. category와 관계없이 모든 글을 본다.
 * 사이트와 같은 규칙: `_`나 `.`으로 시작하는 파일·폴더는 무시하고, index.md(x)는 폴더 이름이 주소다.
 */
function findExisting(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findExisting(path);
      if (found) return found;
    } else if (/\.mdx?$/i.test(entry.name)) {
      const base = entry.name.replace(/\.mdx?$/i, '');
      const name = base.toLowerCase() === 'index' ? dirname(path).split(sep).at(-1) : base;
      if (toSlug(name) === slug) return path;
    }
  }
  return undefined;
}

const dir = join(postsDir, category, slug);
const existing = existsSync(postsDir) ? findExisting(postsDir) : undefined;
if (existing) fail(`같은 주소(/posts/${slug}/)를 쓰는 글이 이미 있습니다: ${show(existing)}`);
if (existsSync(dir)) fail(`폴더가 이미 있습니다: ${show(dir)}  (다른 slug를 쓰거나 폴더를 정리해 주세요)`);

/** 오늘 날짜 (한국 시간) */
const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).formatToParts(new Date());
const part = (type) => parts.find((p) => p.type === type).value;
const today = `${part('year')}-${part('month')}-${part('day')}`;

const frontmatter = `---
title: ${JSON.stringify(title)}
description: "목록에 보일 한 줄 요약을 적어 주세요."
# date: ${today} # 비워 두면 처음 올린(commit한) 시각이 들어갑니다. 날짜를 정하려면 맨 앞의 #을 지우세요.
category: ${category}
tags: [] # 예: [산책, 사진]
# cover: ./cover.jpg # 대표 이미지 (공유 미리보기에도 쓰임). 사진을 이 폴더에 넣고 맨 앞의 #을 지우세요.
# coverAlt: "대표 이미지 설명"
draft: true # 다 쓰면 false로 바꾸거나 이 줄을 지우세요. true인 동안은 배포되지 않습니다.
---
`;

const body = {
  daily: `
{/*
  이 주석은 화면에 보이지 않습니다. 다 읽었으면 지워도 됩니다. 자세한 방법은 GUIDE.md를 참고하세요.

  사진 한 장: 사진 파일을 이 폴더에 넣고 아래처럼 씁니다. 따옴표 안은 캡션(생략 가능).
    ![사진 설명](./photo.jpg "캡션")

  사진 여러 장: 여는 태그 다음과 닫는 태그 앞에 빈 줄을 꼭 둡니다.
    <Gallery caption="캡션" columns={2}>

    ![첫 번째 사진 설명](./a.jpg)
    ![두 번째 사진 설명](./b.jpg)

    </Gallery>

  동영상: import 줄은 글 맨 위(--- 바로 아래)에 씁니다.
    import clip from './clip.mp4';
    <Video src={clip} caption="캡션" />
*/}

여기에 글을 씁니다.
`,
  study: `
여기에 도입 문단을 씁니다. 무엇을, 왜 다루는지 두세 문장이면 충분합니다.

## 첫 번째 소제목

내용을 씁니다.

{/*
  이 주석은 화면에 보이지 않습니다. 다 읽었으면 지워도 됩니다. 자세한 방법은 GUIDE.md를 참고하세요.

  코드:     \`\`\`js 와 \`\`\` 사이에 코드를 씁니다.
  강조 박스: <Callout>참고할 내용</Callout>
            <Callout type="warning" title="주의">주의할 내용</Callout>
  인용:     <Quote name="이름" role="소속 · 직함">인용문</Quote>
  각주:     문장 끝에 [^1], 글 맨 아래에 [^1]: 각주 내용
  사진:     ![사진 설명](./photo.jpg "캡션")
*/}
`,
}[category];

mkdirSync(dir, { recursive: true });
const file = join(dir, 'index.mdx');
writeFileSync(file, frontmatter + body, { flag: 'wx' });

console.log(`\n  ✓ 새 글을 만들었습니다: ${show(file)}`);
console.log(`    주소: /posts/${slug}/  (npm run dev 실행 중이면 http://localhost:4321/posts/${slug}/)`);
console.log('    draft: true 상태라 배포되지 않습니다. 다 쓰면 false로 바꾸세요.\n');
