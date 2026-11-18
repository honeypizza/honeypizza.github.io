/**
 * 글 폴더의 사진을 웹에 올리기 알맞게 손본다. GitHub 저장소가 커지지 않게 하고, 사진 속 촬영 정보(위치 등)를 지운다.
 *
 *   형식            하는 일
 *   PNG             300KB 이상이고 투명한 부분이 없으면(=사진) JPG로 바꾼다. 작은 PNG(도표·캡처)와 투명 배경 PNG는 그대로.
 *   JPG, JPEG       1MB를 넘거나, 긴 변이 1600px을 넘거나, 촬영 정보가 있으면 같은 이름으로 다시 저장한다.
 *   JFIF            JPG의 다른 이름. 사이트가 읽지 못하므로 .jpg로 바꾸고 같은 기준으로 줄인다.
 *   WebP, AVIF      JPG와 같은 기준으로 같은 형식 그대로 줄인다. 움직이는 WebP는 그대로.
 *   HEIC, HEIF      (아이폰 원본) 변환할 수 없고 사이트도 읽지 못한다. 커밋을 멈추고 JPG로 바꿔 넣어 달라고 알린다.
 *   GIF, SVG 등     그대로.
 *
 * 줄인 사진은 긴 변 1600px 이하(사이트 본문 폭 700px을 선명한 화면에서 2배로 보여 주는 1400px보다 조금 넉넉히),
 * 촬영 정보 없음(사진 방향은 미리 바로 세운다). 이름이 바뀌면 글(index.md · index.mdx · info.md) 속 경로도 함께 고친다.
 * Git은 한 번 올린 파일을 지워도 기록에 남기 때문에, 올리기 전에 줄이는 게 중요하다.
 *
 *   npm run images                                        src/content/posts 아래 모든 글
 *   npm run images -- src/content/posts/daily/first-snow  글 폴더 하나
 *   node scripts/convert-images.mjs --staged              커밋 직전(.githooks/pre-commit): 이번 커밋에 들어가는 사진만
 *
 * 끝나는 코드: 0 = 계속 진행(줄이다 실패한 사진은 그대로 두고 커밋은 막지 않는다), 2 = 커밋을 멈춰야 함(HEIC).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const postsDir = join(root, 'src', 'content', 'posts');
const PNG_MIN_BYTES = 300 * 1024;
/**
 * 큰 PNG를 압축 PNG와 JPG로 각각 줄여 봤을 때, 압축 PNG가 JPG의 이 배수 이하면 화면 캡처로 보고 PNG로 둔다.
 * 화면 캡처(글자·단색 면)는 압축 PNG가 JPG와 크기가 비슷하고 글자가 또렷하다. 사진은 PNG가 몇 배 커진다.
 * (실측: 1920×1080 화면 캡처 0.99배, 휴대폰 사진 4.95배)
 */
const SCREENSHOT_RATIO = 1.5;
const MAX_BYTES = 1024 * 1024;
const MAX_SIDE = 1600;
/** 손보는 형식 */
const IMAGE = /\.(png|jpe?g|jfif|webp|avif)$/i;
/** 사이트에서 쓸 수 없고 바꿀 수도 없는 형식 */
const UNSUPPORTED = /\.(heic|heif)$/i;
/** 사진을 쓰는 글 파일 (같은 폴더 안) */
const POST_FILES = ['index.md', 'index.mdx', 'info.md'];

const show = (path) => relative(root, path).split(sep).join('/');
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

const args = process.argv.slice(2);
const staged = args.includes('--staged');
const targets = args.filter((arg) => !arg.startsWith('--')).map((arg) => resolve(root, arg));

/** 후보 파일 목록 (커밋 직전이면 이번 커밋에 들어가는 파일만) */
function listFiles() {
  if (staged) {
    const out = git('diff', '--cached', '--name-only', '--diff-filter=AM', '-z', '--', 'src/content/posts');
    return out
      .split('\0')
      .filter(Boolean)
      .map((file) => join(root, file));
  }
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else found.push(path);
    }
  };
  for (const target of targets.length > 0 ? targets : [postsDir]) {
    if (!existsSync(target)) {
      console.warn(`[사진] 없는 경로입니다: ${target}`);
      continue;
    }
    if (statSync(target).isDirectory()) walk(target);
    else found.push(target);
  }
  return found;
}

const files = listFiles();

// 아이폰 원본(HEIC)은 사이트 빌드가 실패하므로, 커밋 전에 멈추고 알린다. (sharp 없이도 알 수 있게 먼저 확인)
const unsupported = files.filter((file) => UNSUPPORTED.test(file));
if (unsupported.length > 0) {
  console.error('\n[사진] 아이폰 원본 사진(HEIC)은 사이트에서 쓸 수 없어요. JPG로 바꿔서 넣어 주세요.');
  for (const file of unsupported) console.error(`  - ${show(file)}`);
  console.error('  (카톡으로 보낸 사진을 복사해 붙여 넣거나, 아이폰 설정 → 카메라 → 포맷 → "높은 호환성"으로 찍으면 JPG예요)\n');
  if (staged) process.exit(2);
}

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('[사진] sharp를 불러올 수 없어 사진 줄이기를 건너뜁니다. (npm install을 했는지 확인해 주세요)');
  process.exit(0);
}

/** 긴 변 1600px 이하, 방향 바로 세우기, 촬영 정보 없이. format: jpeg | png | webp | avif */
function toWeb(input, format) {
  const image = sharp(input)
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true });
  if (format === 'webp') return image.webp({ quality: 85 });
  if (format === 'avif') return image.avif({ quality: 60 });
  // JPG·PNG로 줄이는 그림은 불투명한 그림뿐이다. 가장자리에 남은 반투명 픽셀은 흰 바탕으로 채운다.
  const opaque = image.flatten({ background: '#ffffff' });
  // 256색으로 줄인 PNG. 화면 캡처는 거의 차이가 안 보이고 크기는 크게 준다.
  if (format === 'png') return opaque.png({ palette: true, quality: 90, effort: 7, compressionLevel: 9 });
  return opaque.jpeg({ quality: 88, mozjpeg: true });
}

/** 같은 이름의 파일이 이미 있으면 image-1.jpg, image-2.jpg … */
function freePath(dir, base, ext) {
  let name = `${base}${ext}`;
  for (let i = 1; existsSync(join(dir, name)); i++) name = `${base}-${i}${ext}`;
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

/** 다른 이름의 JPG로 바꿔 저장하고(PNG → JPG, JFIF → JPG), 원본을 지우고, 글 속 경로를 고친다. */
async function saveAsJpg(file, input, before, jpgBuffer) {
  const jpg = freePath(dirname(file), basename(file, extname(file)), '.jpg');
  writeFileSync(jpg, jpgBuffer ?? (await toWeb(input, 'jpeg').toBuffer()));
  const changed = replaceReferences(dirname(file), basename(file), basename(jpg));
  unlinkSync(file);
  if (staged) {
    git('add', '--', jpg, ...changed);
    git('rm', '--cached', '--quiet', '--ignore-unmatch', '--', file);
  }
  const note = changed.length > 0 ? '' : '  (글에서 이 사진을 쓰는 곳은 찾지 못했습니다)';
  console.log(`[사진] ${show(file)} → ${basename(jpg)}  ${mb(before)} → ${mb(statSync(jpg).size)}${note}`);
  return true;
}

/** 크거나 촬영 정보가 있으면 같은 이름·같은 형식으로 다시 저장한다. */
async function shrinkInPlace(file, input, before, format) {
  const meta = await sharp(input).metadata();
  if ((meta.pages ?? 1) > 1) return false; // 움직이는 사진은 그대로
  const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
  const hasInfo = Boolean(meta.exif || meta.xmp || meta.iptc);
  if (before <= MAX_BYTES && longest <= MAX_SIDE && !hasInfo) return false;

  const output = await toWeb(input, format).toBuffer();
  // 정보도 없고 다시 저장해도 줄지 않으면 원본을 둔다 (화질만 떨어진다).
  if (!hasInfo && output.length >= before) return false;
  writeFileSync(file, output);
  if (staged) git('add', '--', file);
  const note = hasInfo ? '  (촬영 위치 등 사진 정보 지움)' : '';
  console.log(`[사진] ${show(file)} 줄임  ${mb(before)} → ${mb(output.length)}${note}`);
  return true;
}

async function processFile(file) {
  const ext = extname(file).toLowerCase();
  const before = statSync(file).size;
  // 파일을 메모리로 읽어서 처리한다 (Windows에서 처리 중인 파일을 지우거나 덮어쓰지 못하는 일을 막는다).
  const input = readFileSync(file);
  if (ext === '.png') {
    if (before < PNG_MIN_BYTES) return false; // 작은 캡처·도표는 그대로
    // 투명 배경 그림(로고, 오려 낸 그림)만 그대로 둔다. 카톡 등에서 복사해 붙여 넣은 사진은 Windows 클립보드를
    // 거치며 가장자리 몇 픽셀만 반투명해지기도 해서(실측 0.06%), 투명도 평균으로 판단한다.
    const stats = await sharp(input).stats();
    const alphaMean = stats.channels[3]?.mean ?? 255;
    if (!stats.isOpaque && alphaMean < 250) return false;
    const [jpg, png] = await Promise.all([toWeb(input, 'jpeg').toBuffer(), toWeb(input, 'png').toBuffer()]);
    if (png.length > jpg.length * SCREENSHOT_RATIO) return saveAsJpg(file, input, before, jpg); // 사진
    // 화면 캡처: 이름·형식 그대로 PNG로 줄인다 (글자가 또렷하게 남는다).
    if (png.length >= before * 0.9) return false;
    writeFileSync(file, png);
    if (staged) git('add', '--', file);
    console.log(`[사진] ${show(file)} 줄임 (화면 캡처라 PNG 그대로)  ${mb(before)} → ${mb(png.length)}`);
    return true;
  }
  if (ext === '.jfif') return saveAsJpg(file, input, before);
  if (ext === '.webp') return shrinkInPlace(file, input, before, 'webp');
  if (ext === '.avif') return shrinkInPlace(file, input, before, 'avif');
  return shrinkInPlace(file, input, before, 'jpeg');
}

let done = 0;
for (const file of files.filter((path) => IMAGE.test(path))) {
  try {
    if (await processFile(file)) done++;
  } catch (error) {
    console.warn(`[사진] ${show(file)}: 손보지 못해 그대로 둡니다. (${error instanceof Error ? error.message : error})`);
  }
}

if (!staged && done === 0) console.log('[사진] 줄일 사진이 없습니다.');
