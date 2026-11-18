/**
 * 블로그 용량을 확인한다.  npm run size
 *
 * - 글 사진: 지금 글 폴더에 있는 사진 수와 용량 (일상·공부 따로)
 * - Git 저장소: 지금까지 올린 모든 기록의 크기. 지운 사진도 기록에는 남아 있어서 포함된다. GitHub 권장 1GB.
 * - 사이트: 마지막으로 npm run build 한 결과(dist/)의 크기. GitHub Pages 한도 1GB.
 * 지금 사진 평균 크기로 앞으로 몇 장을 더 올릴 수 있는지도 어림한다.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const postsDir = join(root, 'src', 'content', 'posts');
const distDir = join(root, 'dist');
const LIMIT = 1024 ** 3; // 1GB
const IMAGE = /\.(png|jpe?g|webp|avif|gif|svg)$/i;

const size = (bytes) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)}GB` : bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
const percent = (bytes) => `${((bytes / LIMIT) * 100).toFixed(1)}%`;

function walk(dir, visit) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, visit);
    else visit(path, statSync(path).size);
  }
}

// 1) 글 사진
const groups = new Map();
const posts = new Set();
if (existsSync(postsDir)) {
  walk(postsDir, (path, bytes) => {
    const parts = relative(postsDir, path).split(sep);
    if (/^index\.mdx?$/i.test(parts.at(-1))) posts.add(parts.slice(0, -1).join('/'));
    if (!IMAGE.test(path)) return;
    const group = parts[0] ?? '기타';
    const current = groups.get(group) ?? { count: 0, bytes: 0, largest: { path: '', bytes: 0 } };
    current.count++;
    current.bytes += bytes;
    if (bytes > current.largest.bytes) current.largest = { path: relative(root, path).split(sep).join('/'), bytes };
    groups.set(group, current);
  });
}
const images = [...groups.values()].reduce((sum, g) => ({ count: sum.count + g.count, bytes: sum.bytes + g.bytes }), { count: 0, bytes: 0 });

// 2) Git 저장소 (압축된 기록 + 아직 압축 안 된 기록)
let repo = 0;
try {
  const out = execFileSync('git', ['count-objects', '-v'], { cwd: root, encoding: 'utf8' });
  const kib = (key) => Number(out.match(new RegExp(`^${key}: (\\d+)`, 'm'))?.[1] ?? 0) * 1024;
  repo = kib('size') + kib('size-pack');
} catch {
  // git이 없으면 건너뛴다
}

// 3) 사이트 (dist/)
let site = 0;
if (existsSync(distDir)) walk(distDir, (_, bytes) => (site += bytes));

const label = { daily: '일상', study: '공부' };
console.log('\n  블로그 용량\n');
console.log(`  글 ${posts.size}편, 사진 ${images.count}장, ${size(images.bytes)}`);
for (const [group, g] of groups) {
  console.log(`    ${(label[group] ?? group).padEnd(3)} 사진 ${g.count}장  ${size(g.bytes)}  (평균 ${size(g.bytes / g.count)}, 가장 큰 사진 ${g.largest.path} ${size(g.largest.bytes)})`);
}
console.log('');
console.log(`  Git 저장소   ${size(repo).padStart(8)}  / 1GB 권장  (${percent(repo)})  지운 사진도 기록에 남아 포함돼요`);
console.log(`  사이트       ${site ? size(site).padStart(8) : '     -  '}  / 1GB 한도  ${site ? `(${percent(site)})` : '(npm run build 후에 보여요)'}`);

if (images.count > 0) {
  const average = images.bytes / images.count;
  const left = Math.max(0, Math.floor((LIMIT - repo) / average));
  console.log(`\n  지금 사진 평균(${size(average)})으로 어림하면, 저장소 1GB까지 사진 약 ${left.toLocaleString('ko-KR')}장을 더 올릴 수 있어요.`);
}
if (repo > LIMIT * 0.8) {
  console.log('\n  ※ 저장소가 1GB의 80%를 넘었어요. 사진을 외부 저장소로 옮길 때가 됐어요.');
}
console.log('');
