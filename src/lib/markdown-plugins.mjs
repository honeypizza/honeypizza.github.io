/**
 * 본문(Markdown·MDX) HTML을 다듬는 Sätteri hast plugin. astro.config.mjs의 hastPlugins에 등록되어 있고,
 * Astro의 이미지 처리(srcset 생성)보다 먼저 실행된다.
 */

/** 본문 칼럼(--width-prose: 700px) 기준. 브라우저가 srcset에서 칼럼 폭에 맞는 크기만 내려받게 한다. */
const PROSE_SIZES = '(min-width: 760px) 700px, 100vw';

/** <Gallery> 안의 사진 한 장 폭. Gallery.astro: columns열(모바일에서도 같음), 간격 8px. */
const GALLERY_SIZES = {
  2: '(min-width: 760px) 346px, 50vw',
  3: '(min-width: 760px) 228px, 33vw',
};

/** 공백 text를 뺀 자식이 tagName 요소 하나뿐인가 */
function hasOnlyChild(node, tagName) {
  const children = (node.children ?? []).filter((child) => !(child.type === 'text' && !child.value.trim()));
  return children.length === 1 && children[0].type === 'element' && children[0].tagName === tagName;
}

function isElement(node, tagName) {
  return node?.type === 'element' && node.tagName === tagName;
}

/** 사진이 <Gallery> 안에 있으면 그 columns 값(2 | 3)을 돌려준다. */
function galleryColumns(node, ctx) {
  for (let parent = ctx.parent(node); parent; parent = ctx.parent(parent)) {
    if (parent.type?.startsWith('mdxJsx') && parent.name === 'Gallery') {
      const attr = parent.attributes?.find((a) => a.type === 'mdxJsxAttribute' && a.name === 'columns');
      const value = attr?.value && typeof attr.value === 'object' ? attr.value.value : attr?.value;
      return Number(value) === 3 ? 3 : 2;
    }
  }
  return undefined;
}

/**
 * 본문 이미지 처리.
 *
 * 1) 문단에 이미지 하나만 있고 title이 있으면 <figure> + <figcaption>으로 바꾼다.
 *      ![사진 설명](./photo.jpg "캡션")
 *      → <figure><img alt="사진 설명" …><figcaption>캡션</figcaption></figure>
 *    링크를 건 이미지도 같다: [![사진 설명](./photo.jpg "캡션")](https://…)
 *    글과 같은 문단에 섞인 이미지는 그대로 둔다 (title은 마우스를 올리면 보이는 설명으로 남는다).
 *
 * 2) 모든 본문 이미지에 칼럼 폭에 맞는 sizes를 준다. 없으면 Astro가 "화면 전체 폭"으로 가정해서
 *    데스크톱에서 필요보다 2~3배 큰 파일을 내려받는다.
 *
 * 3) cover가 없는 글의 첫 사진(Gallery 밖)은 loading="eager" fetchpriority="high"로 바로 받는다.
 *
 * @type {import('satteri').HastPluginDefinition}
 */
export const imageCaptions = {
  name: 'image-captions',
  element: {
    filter: ['img'],
    visit(node, ctx) {
      const { title, ...rest } = node.properties ?? {};
      const columns = galleryColumns(node, ctx);
      const sizes = rest.sizes ?? (columns ? GALLERY_SIZES[columns] : PROSE_SIZES);

      // 대표 이미지(cover)가 없는 글의 첫 사진은 보통 첫 화면의 가장 큰 요소라 미루지 않고 바로 받는다.
      // ctx.data는 글(문서)마다 새로 만들어지므로 다른 글로 넘어가지 않는다.
      const first = !ctx.data.firstImage && !columns && !ctx.data.astro?.frontmatter?.cover;
      ctx.data.firstImage = true;
      const eager = first && rest.loading === undefined ? { loading: 'eager', fetchpriority: 'high' } : {};

      // <p><img></p> 또는 <p><a><img></a></p>
      let child = node;
      let parent = ctx.parent(node);
      if (isElement(parent, 'a') && hasOnlyChild(parent, 'img')) {
        child = parent;
        parent = ctx.parent(parent);
      }
      const caption = typeof title === 'string' ? title.trim() : '';
      const canCaption = caption && isElement(parent, 'p') && hasOnlyChild(parent, child.tagName);

      if (!canCaption) {
        for (const [key, value] of Object.entries({ sizes, ...eager })) {
          if (rest[key] === undefined) ctx.setProperty(node, key, value);
        }
        return;
      }

      // title 속성은 지운다 (빈 title=""도 남기지 않도록 properties를 통째로 바꾼다).
      ctx.setField(node, 'properties', { ...rest, sizes, ...eager });
      ctx.setField(parent, 'tagName', 'figure');
      ctx.appendChild(parent, {
        type: 'element',
        tagName: 'figcaption',
        properties: {},
        children: [{ type: 'text', value: caption }],
      });
    },
  },
};

/**
 * 본문의 <table>을 가로 스크롤 가능한 영역으로 감싼다.
 * Mobile에서 넓은 표가 화면 밖으로 넘치지 않게 하고, 키보드로도 스크롤할 수 있게 tabindex를 준다.
 * 한 글에 표가 여러 개여도 화면 낭독기에서 구분되도록 영역 이름에 번호를 붙인다 (표 1, 표 2).
 *
 * @type {import('satteri').HastPluginDefinition}
 */
export const wrapTables = {
  name: 'wrap-tables',
  element: {
    filter: ['table'],
    visit(node, ctx) {
      const index = (ctx.data.tableCount = (Number(ctx.data.tableCount) || 0) + 1);
      ctx.wrapNode(node, {
        raw: `<div class="table-wrap" tabindex="0" role="region" aria-label="표 ${index}"></div>`,
      });
    },
  },
};
