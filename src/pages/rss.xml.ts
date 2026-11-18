import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../consts';
import { CATEGORIES, getPosts, postHref } from '../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  const self = new URL('rss.xml', context.site).href;
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site!,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    // 피드 검사기가 권하는 self 링크
    customData: `<language>${SITE.lang}</language><atom:link href="${self}" rel="self" type="application/rss+xml"/>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description || undefined,
      pubDate: post.data.date,
      link: postHref(post),
      categories: [CATEGORIES[post.data.category].label, ...post.data.tags],
    })),
  });
}
