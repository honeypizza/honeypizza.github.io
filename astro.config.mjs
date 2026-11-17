// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import { imageCaptions, wrapTables } from './src/lib/markdown-plugins.mjs';

export default defineConfig({
  // User site(honeypizza.github.io)라서 base 경로는 두지 않는다.
  site: 'https://honeypizza.github.io',
  // 모든 페이지 주소는 /로 끝난다 (/posts/, /about/). GitHub Pages가 내주는 주소와 같고,
  // dev에서 /가 빠진 내부 링크를 바로 404로 알려 준다. (rss.xml 같은 파일 주소는 예외)
  trailingSlash: 'always',
  integrations: [mdx(), sitemap()],
  image: {
    // 본문 이미지에 srcset을 자동으로 만들어 화면 폭에 맞는 크기를 내려준다.
    layout: 'constrained',
    responsiveStyles: true,
  },
  markdown: {
    // Astro 7 기본 Markdown 처리기(Sätteri). GFM(표, 각주, 취소선)이 내장되어 있다.
    processor: satteri({
      features: {
        gfm: {
          footnotes: {
            label: '각주',
            backLabel: '본문 {reference}번 위치로 돌아가기',
          },
        },
      },
      hastPlugins: [imageCaptions, wrapTables],
    }),
    shikiConfig: {
      // --color-surface 위에서 글자 대비가 충분한 조합 (주석 포함 약 4.5:1 이상).
      themes: { light: 'github-light-high-contrast', dark: 'github-dark-default' },
      // 색은 CSS 변수로만 내보내고, 실제 색 선택은 content-blocks.css의 light-dark()가 한다.
      defaultColor: false,
    },
  },
});
