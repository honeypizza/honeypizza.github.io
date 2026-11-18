/**
 * 글 폴더의 큰 PNG 사진을 JPG로 바꾸고, 글(index.md · index.mdx · info.md) 속 경로도 함께 고친다.
 * VS Code에 사진을 붙여 넣으면(Ctrl+V) PNG로 저장되는데, 사진은 PNG가 JPG보다 몇 배 크다.
 *
 *   npm run images                                        src/content/posts 아래 모든 글
 *   npm run images -- src/content/posts/daily/first-snow  글 폴더 하나
 *   node scripts/convert-images.mjs --staged              커밋 직전(.githooks/pre-commit): 이번 커밋에 들어가는 PNG만
 *
 * 그대로 두는 PNG: 300KB보다 작은 것(도표·아이콘·작은 캡처), 투명한 부분이 있는 것.
 * 바꾼 사진은 긴 변을 2400px 이하로 줄이고(사이트 본문 폭 700px의 3배 넉넉히) JPG 품질 88로 저장한다.
 * 변환에 실패해도 커밋은 막지 않고, 그 사진은 PNG로 둔다.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const postsDir = join(root, 'src', 'content', 'posts');
const MIN_BYTES = 300 * 1024;
const MAX_SIDE = 2400;
const QUALITY = 88;
/** 사진을 쓰는 글 파일 (같은 폴더 안) */
const POST_FILES = ['index.md', 'index.mdx', 'info.md'];

const show = (path) => relative(root, path).split(sep).join('/');
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

const args = process.argv.slice(2);
const staged = args.includes('--staged');
const targets = args.filter((arg) => !arg.startsWith('--')).map((arg) => resolve(root, arg));

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('[사진] sharp를 불러올 수 없어 PNG 변환을 건너뜁니다. (npm install을 했는지 확인해 주세요)');
  process.exit(0);
}

/** 바꿀 후보 PNG 목록 */
function listPngs() {
  if (staged) {
    const out = git('diff', '--cached', '--name-only', '--diff-filter=AM', '-z', '--', 'src/content/posts');
    return out
      .split('\0')
      .filter((file) => /\.png$/i.test(file))
      .map((file) => join(root, file));
  }
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.png$/i.test(entry.name)) found.push(path);
    }
  };
  for (const target of targets.length > 0 ? targets : [postsDir]) {
    if (!existsSync(target)) {
      console.warn(`[사진] 없는 경로입니다: ${target}`);
      continue;
    }
    if (statSync(target).isDirectory()) walk(target);
    else if (/\.png$/i.test(target)) found.push(target);
  }
  return found;
}

/** 같은 이름의 JPG가 이미 있으면 image-1.jpg, image-2.jpg … */
function jpgPathFor(png) {
  const dir = dirname(png);
  const base = basename(png, extname(png));
  let name = `${base}.jpg`;
  for (let i = 1; existsSync(join(dir, name)); i++) name = `${base}-${i}.jpg`;
  return join(dir, name);
}

/**
 * 글 파일 속 사진 경로를 바꾼다. 아래 모양을 모두 찾는다.
 *   ![](image.png)  ![](./image.png)  ![](<my image.png>)  ![](my%20image.png)  cover: ./image.png
 * 파일 이름 앞이 경로 구분자·괄호·따옴표·공백일 때만 바꾼다 (big-image.png 속 image.png는 건드리지 않는다).
 */
function replaceReferences(dir, oldName, newName) {
  const pairs = new Map([
    [oldName, newName],
    [encodeURI(oldName), encodeURI(newName)],
  ]);
  const changed = [];
  for (const name of POST_FILES) {
    const file = join(dir, name);
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    let next = text;
    for (const [from, to] of pairs) {
      const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      next = next.replace(new RegExp(`(^|[\\s(<'"/=])${escaped}(?=$|[\\s)>'"#?])`, 'gm'), (_, before) => `${before}${to}`);
    }
    if (next !== text) {
      writeFileSync(file, next);
      changed.push(file);
    }
  }
  return changed;
}

let converted = 0;
for (const png of listPngs()) {
  try {
    const before = statSync(png).size;
    if (before < MIN_BYTES) continue;
    // 파일을 메모리로 읽어서 처리한다 (Windows에서 변환 중인 파일을 지우지 못하는 일을 막는다).
    const input = readFileSync(png);
    const { isOpaque } = await sharp(input).stats();
    if (!isOpaque) continue;

    const jpg = jpgPathFor(png);
    await sharp(input)
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toFile(jpg);
    const changed = replaceReferences(dirname(png), basename(png), basename(jpg));
    unlinkSync(png);

    if (staged) {
      git('add', '--', jpg, ...changed);
      git('rm', '--cached', '--quiet', '--ignore-unmatch', '--', png);
    }
    converted++;
    const note = changed.length > 0 ? '' : '  (글에서 이 사진을 쓰는 곳은 찾지 못했습니다)';
    console.log(`[사진] ${show(png)} → ${basename(jpg)}  ${mb(before)} → ${mb(statSync(jpg).size)}${note}`);
  } catch (error) {
    console.warn(`[사진] ${show(png)}: 변환하지 못해 PNG로 둡니다. (${error instanceof Error ? error.message : error})`);
  }
}

if (!staged && converted === 0) console.log('[사진] JPG로 바꿀 PNG가 없습니다. (300KB 이상이고 투명한 부분이 없는 PNG만 바꿉니다)');
