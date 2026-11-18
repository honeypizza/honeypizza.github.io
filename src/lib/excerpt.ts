/**
 * 글 파일 내용에서 한 줄 요약을 만든다. frontmatter에 description을 적지 않은 글에 쓰인다
 * (목록의 요약, 글 상단, 검색·공유 미리보기, RSS).
 *
 * 본문의 첫 문단에서 글자만 남긴다. 소제목·사진·코드·표·인용·component는 건너뛰고,
 * 링크는 글자만, 굵게·기울임 표시는 뺀다. max자보다 길면 단어 경계에서 자르고 …을 붙인다.
 * content.config.ts에서 쓰므로 astro:content를 import하지 않는다.
 */
export function excerpt(source: string, max = 100): string {
  const body = source
    .replace(/^﻿?---\r?\n[\s\S]*?\r?\n---[^\n]*\n?/, '') // frontmatter
    .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1\s*$/gm, '') // code block
    .replace(/<!--[\s\S]*?-->|\{\/\*[\s\S]*?\*\/\}/g, '') // 주석
    .replace(/^(?:import|export)\s[^\n]*$/gm, ''); // MDX import/export

  for (const block of body.split(/\r?\n[ \t]*\r?\n/)) {
    const text = block.trim();
    // 소제목, 사진, component·HTML, 표, 인용, 구분선, 각주 정의는 요약에 쓰지 않는다.
    if (!text || /^(?:#|!\[|<|\||>|-{3,}|\*{3,}|_{3,}|\[\^)/.test(text)) continue;
    const plain = text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 문장 속 사진
      .replace(/\[\^[^\]]+\]/g, '') // 각주 번호
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 링크 → 글자
      .replace(/<[^>]+>/g, '') // HTML tag
      .replace(/\*\*|__|~~|`|(?<![\p{L}\p{N}])[*_]|[*_](?![\p{L}\p{N}])/gu, '') // 굵게·기울임·취소선·code 표시
      .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '') // 목록 기호
      .replace(/\s+/g, ' ')
      .trim();
    if (!plain) continue;
    if (plain.length <= max) return plain;
    const cut = plain.slice(0, max);
    const space = cut.lastIndexOf(' ');
    return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.·…:;]+$/, '')}…`;
  }
  return '';
}
