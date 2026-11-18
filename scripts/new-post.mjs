/**
 * 새 글 폴더와 두 파일을 만든다: 글 정보(info.md)와 본문(index.md 또는 index.mdx).
 *
 *   npm run new -- <daily|study> <slug> "제목"
 *   npm run new -- daily first-snow "첫눈 온 날"
 *
 * → src/content/posts/daily/first-snow/info.md   (제목·요약·날짜·분류·태그, draft: true 상태로 생성)
 *   src/content/posts/daily/first-snow/index.md  (본문만)
 *
 * 일상 글은 index.md: 글과 사진 한 장씩이면 충분하고, VS Code에서 사진을 끌어다 놓아 넣을 수 있다.
 *   (사진 여러 장 격자·동영상이 필요하면 파일 이름을 index.mdx로 바꾼다)
 * 공부 글은 index.mdx: 강조 박스(Callout), 인용(Quote) 같은 component를 쓴다.
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
    if (entry.name.toLowerCase() === 'info.md') continue; // 글 정보 파일 (글이 아니다)
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

/** 글 정보. 한 줄에 "항목: 값" 하나씩. 비워 둔 값은 사이트가 채운다 (src/content.config.ts). */
const info = `title: ${JSON.stringify(title)}
description:     # 목록에 보일 한 줄 요약. 비워 두면 본문 첫 문단이 들어갑니다
date:            # 비워 두면 처음 올린(commit한) 시각. 직접 정하려면 ${today} 또는 ${today} 21:30
category: ${category}
tags: []         # 예: [산책, 사진]
draft: true      # 다 쓰면 이 줄을 지우세요. true인 동안은 사이트에 올라가지 않습니다
`;

/** 분류별 파일 형식. 일상은 Markdown(.md), 공부는 MDX(.mdx). */
const extension = { daily: 'md', study: 'mdx' }[category];

const body = {
  daily: `<!--
  이 주석은 화면에 보이지 않습니다. 다 읽었으면 지워도 됩니다. 자세한 방법은 GUIDE.md를 참고하세요.
  제목·요약·날짜·태그는 같은 폴더의 info.md에 적습니다. 이 파일에는 글만 씁니다.

  사진: Ctrl+V로 붙여 넣거나 Shift를 누른 채 끌어다 놓으면 사진이 이 폴더에 저장되고 아래 같은 줄이 들어갑니다.
    ![사진 설명](./photo.jpg "캡션")
  큰 사진은 커밋할 때 자동으로 줄어듭니다 (PNG는 JPG로, 촬영 위치 정보는 지워짐).

  사진 여러 장을 격자로 놓거나(Gallery) 동영상(Video)을 넣으려면 이 파일 이름을 index.mdx로 바꿉니다.
-->

여기에 글을 씁니다.
`,
  study: `여기에 도입 문단을 씁니다. 무엇을, 왜 다루는지 두세 문장이면 충분합니다.

## 첫 번째 소제목

내용을 씁니다.

{/*
  이 주석은 화면에 보이지 않습니다. 다 읽었으면 지워도 됩니다. 자세한 방법은 GUIDE.md를 참고하세요.
  제목·요약·날짜·태그는 같은 폴더의 info.md에 적습니다. 이 파일에는 글만 씁니다.

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
const infoFile = join(dir, 'info.md');
const file = join(dir, `index.${extension}`);
writeFileSync(infoFile, info, { flag: 'wx' });
writeFileSync(file, body, { flag: 'wx' });

console.log(`\n  ✓ 새 글을 만들었습니다: ${show(dir)}/`);
console.log(`    글 정보: ${show(infoFile)}  (제목·요약·날짜·태그)`);
console.log(`    본문:    ${show(file)}`);
console.log(`    주소: /posts/${slug}/  (npm run dev 실행 중이면 http://localhost:4321/posts/${slug}/)`);
console.log('    draft: true 상태라 배포되지 않습니다. 다 쓰면 info.md에서 그 줄을 지우세요.\n');
