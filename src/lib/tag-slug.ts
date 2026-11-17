/**
 * 태그 → 주소(/tags/<slug>/)에 쓸 이름. content.config.ts(태그 중복 정리)와 posts.ts가 함께 쓴다.
 * astro:content를 import하지 않아야 content.config.ts에서 쓸 수 있다.
 */

/** 주소에 쓸 수 없는 기호는 읽을 수 있는 말로 바꾼다. C# → c-sharp, C++ → c-plus-plus */
const TAG_SYMBOLS: Record<string, string> = { '#': 'sharp', '+': 'plus', '&': 'and', '@': 'at' };

/** Windows에서 폴더 이름으로 쓸 수 없는 이름 (npm run build가 dist/tags/<slug>/ 폴더를 만든다) */
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/;

/**
 *   Astro → astro · 웹 개발 → 웹-개발 · Node.js → node-js · .NET → dot-net · CI/CD → ci-cd · C# → c-sharp
 * 대소문자와 구분 기호(공백, -, /, . 등)만 다른 태그는 같은 태그로 본다.
 */
export function tagSlug(tag: string) {
  const text = tag.normalize('NFKC').trim().toLowerCase();
  const slug = text
    .replace(/(^|[^\p{L}\p{N}])\.(?=[\p{L}\p{N}])/gu, '$1dot-')
    .replace(/[#+&@]/g, (symbol) => `-${TAG_SYMBOLS[symbol]}-`)
    .replace(/['’"`]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}_]+/gu, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
  if (!slug) {
    // 이모지나 기호만 있는 태그: 문자 코드로 만든다 (🎉 → tag-1f389)
    return `tag-${[...text].map((char) => char.codePointAt(0)!.toString(16)).join('-')}`;
  }
  return WINDOWS_RESERVED.test(slug) ? `${slug}-tag` : slug;
}
