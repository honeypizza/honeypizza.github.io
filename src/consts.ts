/** 사이트 전체에 쓰이는 기본 정보. 이름이나 소개 문구를 바꾸려면 여기를 고친다. */
export const SITE = {
  title: 'haein’s blog',
  description: '일상과 기술 이야기를 천천히 적는 개인 블로그',
  lang: 'ko',
  locale: 'ko_KR',
  timeZone: 'Asia/Seoul',
} as const;

export type NavKey = 'home' | 'posts' | 'daily' | 'tech' | 'about';

export const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: 'home', label: '홈', href: '/' },
  { key: 'posts', label: '전체 글', href: '/posts/' },
  { key: 'daily', label: '일상', href: '/posts/daily/' },
  { key: 'tech', label: '기술', href: '/posts/tech/' },
  { key: 'about', label: '소개', href: '/about/' },
];
