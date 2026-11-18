/**
 * 글 폴더의 사진을 웹에 올리기 알맞게 줄인다. GitHub 저장소가 커지지 않게 하고, 사진 속 위치 정보를 지운다.
 *
 * 1) 큰 PNG 사진 → JPG
 *    VS Code에 사진을 붙여 넣으면(Ctrl+V) PNG로 저장되는데, 사진은 PNG가 JPG보다 몇 배 크다.
 *    300KB 이상이고 투명한 부분이 없는 PNG만 바꾸고, 글(index.md · index.mdx · info.md) 속 경로도 함께 고친다.
 *    작은 PNG(도표·아이콘·캡처)와 투명 배경 PNG는 그대로 둔다.
 * 2) 큰 JPG → 같은 이름 그대로 줄이기
 *    1MB를 넘거나 긴 변이 1600px을 넘는 JPG, 또는 촬영 정보(EXIF: 위치·기종·시각)가 들어 있는 JPG를 다시 저장한다.
 *    휴대폰 원본처럼 5~10MB인 사진이 저장소에 그대로 쌓이지 않게 한다.
 *
 * 줄인 사진은 긴 변 1600px 이하(사이트 본문 폭 700px을 선명한 화면에서 2배로 보여 주는 1400px보다 조금 넉넉히), JPG 품질 88, 촬영 정보는 지운다
 * (사진 방향은 미리 바로 세워 둔다). Git은 한 번 올린 파일을 지워도 기록에 남기 때문에, 올리기 전에 줄이는 게 중요하다.
 *
 *   npm run images                                        src/content/posts 아래 모든 글
 *   npm run images -- src/content/posts/daily/first-snow  글 폴더 하나
 *   node scripts/convert-images.mjs --staged              커밋 직전(.githooks/pre-commit): 이번 커밋에 들어가는 사진만
 *
 * 변환에 실패해도 커밋은 막지 않고, 그 사진은 그대로 둔다.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const postsDir = join(root, 'src', 'content', 'posts');
const PNG_MIN_BYTES = 300 * 1024;
const JPG_MAX_BYTES = 1024 * 1024;
const MAX_SIDE = 1600;
const QUALITY = 88;
const IMAGE = /\.(png|jpe?g)$/i;
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
  console.warn('[사진] sharp를 불러올 수 없어 사진 줄이기를 건너뜁니다. (npm install을 했는지 확인해 주세요)');
  process.exit(0);
}

/** 손볼 후보 사진 목록 */
function listImages() {
  if (staged) {
    const out = git('diff', '--cached', '--name-only', '--diff-filter=AM', '-z', '--', 'src/content/posts');
    return out
      .split('\0')
      .filter((file) => IMAGE.test(file))
      .map((file) => join(root, file));
  }
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (IMAGE.test(entry.name)) found.push(path);
    }
  };
  for (const target of targets.length > 0 ? targets : [postsDir]) {
    if (!existsSync(target)) {
      console.warn(`[사진] 없는 경로입니다: ${target}`);
      continue;
    }
    if (statSync(target).isDirectory()) walk(target);
    else if (IMAGE.test(target)) found.push(target);
  }
  return found;
}

/** 긴 변 1600px 이하, 방향 바로 세우기, 촬영 정보 없이 JPG로 */
function toWebJpeg(input) {
  return sharp(input)
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true });
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

/** 큰 PNG 사진 → JPG. 바꿨으면 true */
async function convertPng(png, input, before) {
  if (before < PNG_MIN_BYTES) return false;
  const { isOpaque } = await sharp(input).stats();
  if (!isOpaque) return false;

  const jpg = jpgPathFor(png);
  await toWebJpeg(input).toFile(jpg);
  const changed = replaceReferences(dirname(png), basename(png), basename(jpg));
  unlinkSync(png);
  if (staged) {
    git('add', '--', jpg, ...changed);
    git('rm', '--cached', '--quiet', '--ignore-unmatch', '--', png);
  }
  const note = changed.length > 0 ? '' : '  (글에서 이 사진을 쓰는 곳은 찾지 못했습니다)';
  console.log(`[사진] ${show(png)} → ${basename(jpg)}  ${mb(before)} → ${mb(statSync(jpg).size)}${note}`);
  return true;
}

/** 큰 JPG, 촬영 정보가 든 JPG → 같은 이름으로 다시 저장. 줄였으면 true */
async function shrinkJpg(file, input, before) {
  const meta = await sharp(input).metadata();
  const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
  const hasInfo = Boolean(meta.exif || meta.xmp || meta.iptc);
  if (before <= JPG_MAX_BYTES && longest <= MAX_SIDE && !hasInfo) return false;

  const output = await toWebJpeg(input).toBuffer();
  // 정보도 없고 다시 저장해도 줄지 않으면 원본을 둔다 (화질만 떨어진다).
  if (!hasInfo && output.length >= before) return false;
  writeFileSync(file, output);
  if (staged) git('add', '--', file);
  const note = hasInfo ? '  (촬영 위치 등 사진 정보 지움)' : '';
  console.log(`[사진] ${show(file)} 줄임  ${mb(before)} → ${mb(output.length)}${note}`);
  return true;
}

let done = 0;
for (const file of listImages()) {
  try {
    const before = statSync(file).size;
    // 파일을 메모리로 읽어서 처리한다 (Windows에서 처리 중인 파일을 지우거나 덮어쓰지 못하는 일을 막는다).
    const input = readFileSync(file);
    const changed = /\.png$/i.test(file) ? await convertPng(file, input, before) : await shrinkJpg(file, input, before);
    if (changed) done++;
  } catch (error) {
    console.warn(`[사진] ${show(file)}: 줄이지 못해 그대로 둡니다. (${error instanceof Error ? error.message : error})`);
  }
}

if (!staged && done === 0) console.log('[사진] 줄일 사진이 없습니다.');
