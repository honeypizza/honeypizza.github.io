/**
 * 소개(/about) 페이지와 홈 상단, 사이트 아래쪽(footer)에 쓰이는 정보.
 * 이 파일만 고치면 페이지에 반영된다. 자세한 방법은 README.md의 "소개 페이지 수정하기"를 참고.
 *
 * 지금은 모두 예시 데이터다. 실제 내용으로 바꾼 뒤 `isSample`을 false로 바꾸면
 * 소개 페이지 위쪽의 "예시 데이터" 안내가 사라진다.
 * 비워 두고 싶은 항목은 빈 배열([])로 두면 그 칸이 통째로 숨겨진다.
 */
import type { ImageMetadata } from 'astro';
// 프로필 사진을 쓰려면 src/assets/에 사진을 넣고 아래 주석을 풀어 경로를 맞춘 뒤, 아래쪽 `// photo,`의 주석도 푼다.
// import photo from '../assets/profile.jpg';

export interface Link {
  /** 왼쪽에 작게 보이는 이름. 'GitHub'은 footer 링크에도 쓰이므로 이름을 바꾸지 않는다. */
  label: string;
  /** 링크 주소. 이메일은 mailto:로 시작한다. */
  href: string;
  /** 화면에 보이는 값. 없으면 label이 보인다. */
  text?: string;
}

/** 학력·경력 한 줄. 왼쪽 열에 period, 오른쪽 열에 나머지가 들어간다. */
export interface TimelineItem {
  /** 기간. 예: '2019.03 – 2023.02', '2024.01 – 현재' */
  period: string;
  /** 학교·회사·활동 이름 */
  title: string;
  /** 전공·학위, 직무처럼 이름 아래 한 줄 */
  subtitle?: string;
  /** 짧은 설명 목록 (한 항목이 한 줄) */
  notes?: string[];
}

export interface SkillGroup {
  /** 왼쪽 열에 보이는 분류 이름 */
  group: string;
  items: string[];
}

export interface Award {
  /** 취득·수상 시기. 예: '2023.11' */
  date: string;
  title: string;
  /** 발급·수여 기관 */
  issuer?: string;
}

export interface Profile {
  /** true인 동안 소개 페이지에 "예시 데이터" 안내가 보인다. */
  isSample: boolean;
  name: string;
  /** 이름 아래 한 줄 소개 (홈 상단 프로필, 소개 페이지) */
  tagline: string;
  photo?: ImageMetadata;
  links: Link[];
  /** 소개 본문. 배열의 항목 하나가 문단 하나. */
  intro: string[];
  education: TimelineItem[];
  experience: TimelineItem[];
  skills: SkillGroup[];
  awards: Award[];
}

export const profile: Profile = {
  isSample: true,
  name: '김예시',
  tagline: '[예시] 웹 프론트엔드 개발자 · 기록하는 사람',
  // photo,
  links: [{ label: 'GitHub', href: 'https://github.com/honeypizza', text: 'github.com/honeypizza' }],
  intro: [
    '[예시] 안녕하세요. 웹 프론트엔드를 중심으로 일하는 김예시입니다. 읽기 좋은 화면, 고치기 쉬운 코드, 그리고 그 둘 사이의 균형에 관심이 많습니다.',
    '[예시] 이 블로그에는 일하며 배우고 공부한 것들과 함께 산책, 커피, 책처럼 소소한 일상을 기록합니다. 이 문단은 src/data/profile.ts에서 고칠 수 있습니다.',
  ],
  education: [
    {
      period: '2019.03 – 2023.02',
      title: '예시대학교',
      subtitle: '컴퓨터공학과 · 공학사',
      notes: ['[예시] 졸업 프로젝트: 접근성을 고려한 웹 문서 편집기', '[예시] 학과 학술 동아리 회장 (2021)'],
    },
    {
      period: '2016.03 – 2019.02',
      title: '예시고등학교',
      subtitle: '자연계열',
    },
  ],
  experience: [
    {
      period: '2024.01 – 현재',
      title: '예시 주식회사',
      subtitle: '프론트엔드 엔지니어',
      notes: ['[예시] 디자인 시스템 구축 및 문서화', '[예시] 웹 성능 개선으로 첫 화면 로딩 시간 40% 단축'],
    },
    {
      period: '2023.03 – 2023.12',
      title: '예시 스튜디오',
      subtitle: '웹 개발 인턴',
      notes: ['[예시] 사내 블로그 CMS 개편 참여'],
    },
    {
      period: '2022.07 – 2022.08',
      title: '예시 오픈소스 프로그램',
      subtitle: '참가자 · 문서 번역 기여',
    },
  ],
  skills: [
    { group: '언어', items: ['TypeScript', 'JavaScript', 'Python', 'SQL'] },
    { group: '프론트엔드', items: ['Astro', 'React', 'HTML · CSS', '웹 접근성'] },
    { group: '도구', items: ['Git', 'GitHub Actions', 'Figma', 'Vite'] },
  ],
  awards: [
    { date: '2023.11', title: '[예시] 정보처리기사', issuer: '한국산업인력공단' },
    { date: '2022.12', title: '[예시] 교내 소프트웨어 경진대회 우수상', issuer: '예시대학교' },
    { date: '2021.06', title: '[예시] TOEIC 900점', issuer: 'ETS' },
  ],
};
