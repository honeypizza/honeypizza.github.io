/**
 * 소개(/about) 페이지와 홈 상단에 쓰이는 정보.
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
  /** 링크 이름. 홈 상단과 소개 페이지에 보인다. */
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
  /** 관심 분야. 항목 하나가 한 줄. 비워 두면([]) Interests 칸이 숨겨진다. */
  interests: string[];
  education: TimelineItem[];
  experience: TimelineItem[];
  skills: SkillGroup[];
  awards: Award[];
}

export const profile: Profile = {
  isSample: false,
  name: '해인',
  tagline: '',
  // photo,
  links: [{ label: 'GitHub', href: 'https://github.com/honeypizza', text: 'https://github.com/honeypizza' }],
  intro: [
    '안녕하세요.',
    '컴퓨터구조',
  ],
  education: [
    {
      period: '2026.02 – ',
      title: '고려대학교',
      subtitle: 'M.S student in CS',
    },
    {
      period: '2019.03 – 2026.02',
      title: '서강대학교',
      subtitle: 'Triple major in Math · CS · EE',
    },
    {
      period: '2016.03 – 2019.02',
      title: '동성고등학교',
    },
  ],
  interests: ['Computer Architecture', 'Graphics Processing Unit', ],
  experience: [],
  skills: [],
  awards: [],
};
