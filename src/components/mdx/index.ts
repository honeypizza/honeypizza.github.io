/**
 * MDX 본문에서 import 없이 바로 쓸 수 있는 component 목록.
 * 여기에 추가하면 모든 글에서 <이름 /> 으로 쓸 수 있다.
 */
import Callout from './Callout.astro';
import Figure from './Figure.astro';
import Gallery from './Gallery.astro';
import Quote from './Quote.astro';
import Video from './Video.astro';
import YouTube from './YouTube.astro';

export const mdxComponents = { Callout, Figure, Gallery, Quote, Video, YouTube };
