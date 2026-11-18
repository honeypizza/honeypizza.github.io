# haein’s blog

일상과 공부 이야기를 천천히 적는 개인 블로그 **haein’s blog**의 소스 코드예요. (저장소: `honeypizza.github.io`)
[Astro](https://astro.build)로 테마 없이 직접 만든 정적 사이트이고, `main` 브랜치에 push하면
GitHub Actions가 <https://honeypizza.github.io>에 자동으로 배포해요.

> 글 쓰는 방법은 [**GUIDE.md**](GUIDE.md)(블로그 글쓰기 가이드)에 자세히 정리되어 있어요.
> 사진·동영상 넣기, 발행 전 체크리스트, 오류 해결 방법도 거기 있어요.

## 목차

- [사이트 구성](#사이트-구성)
- [준비물](#준비물)
- [빠르게 시작하기](#빠르게-시작하기)
- [명령어](#명령어)
- [폴더 구조](#폴더-구조)
- [새 글 쓰기](#새-글-쓰기)
- [소개 페이지 수정하기](#소개-페이지-수정하기)
- [사이트 정보와 디자인 수정](#사이트-정보와-디자인-수정)
- [배포](#배포)
- [예시 내용 정리하기](#예시-내용-정리하기)
- [크레딧과 라이선스](#크레딧과-라이선스)

---

## 사이트 구성

| 주소 | 내용 |
| --- | --- |
| `/` | 홈. 짧은 소개와 최근 공부 글·최근 일상 글 |
| `/posts/` | 전체 글 (연도별 목록) |
| `/posts/daily/`, `/posts/study/` | 일상 글, 공부 글만 모아 보기 |
| `/posts/<slug>/` | 글 하나. 소제목이 2개 이상이면 번호가 붙은 목차가 함께 보여요 |
| `/tags/`, `/tags/<태그>/` | 태그 목록, 태그별 글 |
| `/about/` | 소개 (학력, 경력, 기술, 수상 등) |
| `/rss.xml` | RSS 피드 (화면에 링크는 없어요. RSS 앱에 블로그 주소를 넣으면 자동으로 찾아요) |

시스템 설정을 따르는 다크 모드와 전환 버튼, 사이트맵, 검색·공유용 메타 정보(Open Graph)가 들어 있어요.

---

## 준비물

| 필요한 것 | 설명 |
| --- | --- |
| [Node.js](https://nodejs.org) **22.23.4 이상** | LTS 버전을 추천해요. 배포 서버는 Node 24를 써요. `node -v`로 버전을 확인할 수 있어요 |
| npm | Node.js를 설치하면 함께 설치돼요 |
| [Git](https://git-scm.com)과 GitHub 계정 | 배포할 때 필요해요 |
| 편집기 (선택) | [VS Code](https://code.visualstudio.com)를 추천해요. 확장 프로그램 **Astro**와 **MDX**를 설치하면 글자 색이 보기 좋게 표시돼요 |

---

## 빠르게 시작하기

프로젝트 폴더에서 터미널을 열고 실행해요.

```bash
npm install     # 처음 한 번 (필요한 패키지 설치)
npm run dev     # 미리보기 서버 시작
```

브라우저에서 <http://localhost:4321>을 열면 사이트가 보여요.
파일을 저장하면 바로 반영되고, 끌 때는 터미널에서 **Ctrl + C**를 눌러요.

> **Windows에서 `npm.ps1 파일을 로드할 수 없습니다 … 스크립트를 실행할 수 없으므로`라는 오류가 나면**
> VS Code 터미널(PowerShell)이 스크립트 실행을 막고 있는 거예요. 아래 중 하나를 하면 돼요.
>
> - PowerShell에서 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`를 한 번 실행하고 `Y`를 눌러요. (가장 간단해요)
> - `npm` 대신 `npm.cmd`로 실행해요: `npm.cmd install`, `npm.cmd run dev`
> - VS Code 터미널 오른쪽 위 `+` 옆 메뉴에서 **Command Prompt**나 **Git Bash**를 골라 새 터미널을 열어요.

---

## 명령어

| 명령어 | 하는 일 |
| --- | --- |
| `npm install` | 필요한 패키지를 설치해요. 처음 한 번, 또는 `package.json`이 바뀐 뒤에 실행해요 |
| `npm run dev` | 미리보기 서버(<http://localhost:4321>). 저장하면 바로 반영되고, **초안**(`draft: true`) 글도 보여요 |
| `npm run new -- <daily\|study> <slug> "제목"` | 새 글 폴더와 `index.mdx`를 초안으로 만들어요 |
| `npm run build` | 배포용 사이트를 `dist/` 폴더에 만들어요. 초안은 빠져요. 배포 전에 오류를 확인할 때도 좋아요 |
| `npm run preview` | `build`로 만든 결과를 <http://localhost:4321>에서 그대로 미리 봐요 |
| `npm run check` | 코드와 설정의 타입 오류를 검사해요 (`astro check`) |

---

## 폴더 구조

```text
.
├── .github/workflows/deploy.yml   GitHub Pages 자동 배포 설정
├── public/                        그대로 복사되는 파일 (favicon.svg, og-default.png)
├── scripts/new-post.mjs           npm run new (새 글 만들기)
├── src/
│   ├── content/posts/             글. daily/, study/ 아래에 글마다 폴더 하나
│   ├── data/profile.ts            소개 페이지와 홈 상단의 내용
│   ├── consts.ts                  사이트 이름·설명·상단 메뉴
│   ├── content.config.ts          글 정보(frontmatter) 규칙
│   ├── components/                화면 조각 (헤더, 목차, 글 목록 등)
│   │   └── mdx/                   글 안에서 쓰는 Figure, Gallery, Video, YouTube, Quote, Callout
│   ├── layouts/                   페이지 뼈대 (BaseLayout, PostLayout)
│   ├── lib/                       글 목록·날짜·태그 처리, Markdown 플러그인
│   ├── pages/                     주소별 페이지 (/, /posts/, /about/, /tags/, rss.xml 등)
│   └── styles/                    CSS. tokens/ 안에 색·글꼴·간격 값
├── astro.config.mjs               Astro 설정 (사이트 주소, Markdown, 코드 색)
├── package.json                   명령어와 패키지 목록
├── README.md                      이 문서
└── GUIDE.md                       블로그 글쓰기 가이드
```

---

## 새 글 쓰기

짧은 버전이에요. 자세한 내용은 [**GUIDE.md**](GUIDE.md)를 봐 주세요.

1. **만들기**

   ```bash
   npm run new -- daily first-snow "첫눈 온 날"
   ```

   `src/content/posts/daily/first-snow/index.mdx`가 **초안**(`draft: true`)으로 만들어져요.
   `daily`는 일상, `study`는 공부이고, `first-snow`는 글 주소(`/posts/first-snow/`)예요.
   주소는 **영어 소문자, 숫자, 하이픈**(-)으로 지어요. 대문자·밑줄은 알아서 고쳐 주고, 한글이나 기호가 있으면 다시 적어 달라고 알려 줘요.

2. **쓰기·미리보기**: 같은 폴더에 사진·동영상을 넣고 글을 써요. `npm run dev`를 켜 두고
   <http://localhost:4321/posts/first-snow/>에서 확인해요.

3. **발행**: 제목과 한 줄 요약을 채우고 `draft: true` 줄을 지운 뒤 commit & push해요. 몇 분 뒤 사이트에 올라가요.
   (제목·요약이 기본 문구 그대로면 빌드가 멈추고 알려 줘요)

### 일상 글 frontmatter 예시

```yaml
---
title: "첫눈 온 날"
description: "올겨울 첫눈이 내린 아침, 동네 풍경 몇 장."
date: 2026-11-28
category: daily
tags: [겨울, 사진]
toc: false                   # 목차 숨기기 (짧은 글에 어울려요)
# cover: ./cover.jpg         # 대표 사진을 글 폴더에 넣었을 때만 맨 앞의 #을 지워요
# coverAlt: "눈이 얇게 쌓인 동네 골목길"
---
```

본문에 사진은 `![사진 설명](./photo.jpg "캡션")` 한 줄로 넣어요.

### 공부 글 frontmatter 예시

```yaml
---
title: "Astro로 RSS 피드 붙이기"
description: "@astrojs/rss로 블로그에 RSS를 붙이면서 정리한 순서와 주의할 점."
date: 2026-12-03 21:30           # 시간은 선택 (한국 시간)
category: study
tags: [Astro, RSS]
draft: true                      # 다 쓰면 이 줄을 지워요
---
```

| 항목 | 필수 | 설명 |
| --- | --- | --- |
| `title` | 필수 | 글 제목 |
| `description` | 필수 | 한 줄 요약 (목록, 글 상단, 검색·공유 미리보기, RSS) |
| `date` | 필수 | 작성일 `2026-11-28`, 시간까지 `2026-11-28 21:30` |
| `category` | 필수 | `daily` 또는 `study` |
| `tags` | 선택 | `[태그1, 태그2]` 또는 `태그1, 태그2` (`#`은 붙이지 않아요) |
| `toc` | 선택 | `false`면 목차 숨김. 목차는 `##` 소제목이 2개 이상일 때 보여요 |
| `cover`, `coverAlt` | 선택 | 대표 이미지(`./cover.jpg`처럼 `./`로 시작)와 그 설명 |
| `draft` | 선택 | `true`면 미리보기에서만 보이고 배포되지 않음 (기본 `false`) |

> **내 블로그 안의 링크는 주소 끝에 `/`를 붙여요.** `/posts/first-snow/`(O), `/posts/first-snow`(X).
> 이 사이트는 모든 페이지 주소가 `/`로 끝나도록 설정되어 있어서(`trailingSlash: 'always'`),
> `/`가 빠진 링크는 `npm run dev`와 `npm run preview`에서 404로 보여요. `/rss.xml` 같은 파일 주소는 예외예요.

---

## 소개 페이지 수정하기

소개 페이지(`/about/`)와 홈 상단의 내용은 모두 `src/data/profile.ts` 한 파일에 있어요.
지금은 예시 내용이 들어 있으니 내 정보로 바꿔 주세요.

| 항목 | 쓰이는 곳 | 설명 |
| --- | --- | --- |
| `isSample` | 소개 페이지 위 안내 | `true`면 "예시입니다" 안내가 보여요. 내용을 다 바꾼 뒤 `false`로 바꿔요 |
| `name` | 홈 프로필 카드, 소개 페이지 제목, 사이트 하단 | 이름 |
| `tagline` | 홈 프로필 카드, 소개 페이지 이름 아래 | 한 줄 소개 |
| `photo` | 홈 프로필 카드, 소개 페이지 | 프로필 사진 (선택, 아래 참고). 없으면 홈 카드에는 사이트 아이콘이 들어가요 |
| `links` | 홈 프로필 카드, 소개 페이지 연락처 | `label`(항목 이름), `href`(주소), `text`(소개 페이지에 보일 글자, 선택). 홈 카드에는 `label`이 보여요. `label: 'GitHub'` 항목은 사이트 하단 링크에도 쓰이니 이름을 바꾸지 않아요 |
| `intro` | 소개 페이지 본문 | 배열의 항목 하나가 문단 하나 |
| `education`, `experience` | 학력, 경력·활동 | `period`(왼쪽 기간), `title`(학교·회사), `subtitle`(전공·학위·직무), `notes`(세부 내용 목록, 선택) |
| `skills` | 기술 스택 | `group`(분류 이름), `items`(목록) |
| `awards` | 수상·자격 | `date`, `title`, `issuer`(발급 기관, 선택) |

```ts
education: [
  {
    period: '2019.03 – 2023.02',
    title: '○○대학교',
    subtitle: '컴퓨터공학과 · 공학사',
    notes: ['졸업 프로젝트: …'],
  },
],
```

- 문자열은 작은따옴표(`'…'`)로 감싸고, 항목 사이에는 쉼표를 둬요. 문자열 안에 작은따옴표가 들어가면 큰따옴표(`"…"`)로 감싸요.
- 배열을 비우면(`awards: []`) 그 영역은 페이지에서 숨겨져요.
- 메일 주소는 `href: 'mailto:me@example.com'`처럼 `mailto:`를 붙여요.

### 프로필 사진 넣기

1. `src/assets/` 폴더를 만들고 사진을 `profile.jpg`라는 이름으로 넣어요. 정사각형에 가까운 사진이 잘 어울려요.
2. `src/data/profile.ts` 위쪽의 `// import photo from '../assets/profile.jpg';` 줄에서 맨 앞 `//`를 지워요.
3. 아래쪽 `// photo,` 줄에서도 `//`를 지워요.

사진의 대체 텍스트는 "이름 프로필 사진"으로 자동으로 들어가요.

---

## 사이트 정보와 디자인 수정

| 바꾸고 싶은 것 | 파일 |
| --- | --- |
| 사이트 이름, 기본 설명 (헤더, 브라우저 탭, 검색 결과, RSS) | `src/consts.ts`의 `SITE` (`title`, `description`) |
| 상단 메뉴 이름 | `src/consts.ts`의 `NAV` (`label`만 바꾸고 `key`는 그대로 둬요) |
| 분류 이름(일상·공부)과 목록 페이지 설명 | `src/lib/posts.ts`의 `CATEGORIES` |
| 사이트 주소 | `astro.config.mjs`의 `site` |
| 색 (라이트·다크 모드) | `src/styles/tokens/colors.css`. `light-dark(라이트 색, 다크 색)` 한 쌍으로 적어요 |
| 글꼴, 글자 크기, 줄 간격 | `src/styles/tokens/typography.css` |
| 여백, 본문 폭 | `src/styles/tokens/layout.css` (`--width-prose`가 본문 폭) |
| 본문 글자 모양 | `src/styles/prose.css` |
| 사진·코드 블록·표·각주 모양 | `src/styles/content-blocks.css` |
| 사이트 아이콘 | `public/favicon.svg` |
| 기본 공유 이미지 | `public/og-default.png` (1200×630) |

- **공유 미리보기 이미지**: 링크를 메신저나 SNS에 붙여 넣을 때 보이는 이미지예요. 글에 `cover`가 있으면 그 사진이,
  없으면 `public/og-default.png`가 쓰여요. 바꾸려면 같은 이름, 같은 크기(1200×630)의 PNG로 덮어써요.
- **주소 끝의 `/`**: `astro.config.mjs`에 `trailingSlash: 'always'`가 설정되어 있어서 모든 페이지 주소가 `/`로 끝나요.
  메뉴나 본문에 내부 링크를 추가할 때도 `/about/`처럼 `/`로 끝나게 적어요.
- 글꼴 파일은 `src/layouts/BaseLayout.astro`에서 불러오고, 실제로 쓰는 글꼴 이름은 `typography.css`의 `--font-*` 값이 정해요.
- 각 화면 조각(`src/components/*.astro`)의 세부 모양은 그 파일 안의 `<style>`에 있어요.
- 색·글꼴·간격 값의 **이름**(`--color-text` 같은)은 여러 파일에서 쓰고 있으니, 이름은 그대로 두고 값만 바꿔 주세요.

---

## 배포

`main` 브랜치에 push하면 GitHub Actions가 사이트를 만들어 GitHub Pages에 올려요.
처음 한 번만 아래 설정을 해 주세요.

### 처음 한 번: 저장소 만들고 올리기

1. **GitHub에서 새 저장소 만들기**
   - 이름은 정확히 `honeypizza.github.io` (계정 이름 + `.github.io`)
   - **Public**으로 만들어요.
   - README, .gitignore, license는 **추가하지 않고** 빈 저장소로 만들어요.

2. **프로젝트 폴더에서 처음 commit하고 push하기**

   ```bash
   git init
   git add .
   git commit -m "블로그 첫 커밋"
   git branch -M main
   git remote add origin https://github.com/honeypizza/honeypizza.github.io.git
   git push -u origin main
   ```

   - Git을 처음 쓴다면 먼저 이름과 메일을 등록해요:
     `git config --global user.name "이름"`, `git config --global user.email "메일 주소"`
   - push할 때 GitHub 로그인 창이 뜨면 로그인해요.
   - `node_modules/`, `dist/`, `.astro/`는 `.gitignore`에 들어 있어서 올라가지 않아요.
     **`package-lock.json`은 꼭 함께 올려야 해요**(배포 서버가 이 파일로 패키지를 설치해요).

3. **GitHub Pages 켜기**
   - 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꿔요.

4. **첫 배포 확인하기**
   - 저장소의 **Actions** 탭에서 **Deploy to GitHub Pages**가 실행돼요.
   - 3번을 하기 전에 push했다면 첫 실행이 실패하거나, 사이트 대신 README 내용이 보일 수 있어요.
     설정을 마친 뒤 실패한 실행을 열어 **Re-run all jobs**를 누르거나, 왼쪽 목록의 **Deploy to GitHub Pages** →
     **Run workflow**로 다시 실행하면 돼요.
   - 초록 체크가 뜨면 <https://honeypizza.github.io>에서 사이트를 볼 수 있어요.

### 그다음부터

글을 쓰거나 고친 뒤 commit & push하면 끝이에요.

```bash
git add .
git commit -m "새 글: 첫눈 온 날"
git push
```

### 배포는 이렇게 진행돼요

`.github/workflows/deploy.yml`에 정의되어 있어요.

1. **언제**: `main` 브랜치에 push할 때, 또는 Actions 탭에서 **Run workflow**를 눌렀을 때
2. **build**: 코드를 받아(Checkout) → Node 24 준비 → `npm ci`로 패키지 설치 → `npm run build`로 `dist/` 생성 → 결과물 업로드
3. **deploy**: 업로드한 결과물을 GitHub Pages에 게시

보통 몇 분이면 끝나요. 배포가 겹치면 진행 중인 배포는 끝까지 두고, 기다리는 배포만 가장 최신 것으로 바꿔요.

### 로그 보기·실패했을 때

- 저장소 **Actions** 탭 → 실행 하나 클릭 → **build** 또는 **deploy** → 단계별 로그를 펼쳐 볼 수 있어요.
  빨간 X가 있는 단계를 열면 오류 메시지가 나와요.
- 배포 기록과 현재 주소는 **Settings → Pages**와 저장소 오른쪽의 **Deployments**(github-pages)에서도 볼 수 있어요.

| 실패한 단계 | 흔한 원인 |
| --- | --- |
| Install dependencies (`npm ci`) | `package-lock.json`이 없거나 `package.json`과 맞지 않아요. 내 컴퓨터에서 `npm install` 후 두 파일을 함께 commit해요 |
| Build (`npm run build`) | 대개 글(frontmatter·MDX) 오류예요. 내 컴퓨터에서 `npm run build`로 같은 오류를 확인하고 고쳐요. 내 컴퓨터에서는 되는데 여기서만 실패하면 **파일 이름 대소문자**를 확인해요 |
| Setup Pages 또는 Deploy | Pages의 Source가 **GitHub Actions**로 설정되어 있지 않아요 (Settings → Pages) |

글 관련 오류 메시지는 [GUIDE.md의 "문제가 생겼을 때"](GUIDE.md#12-문제가-생겼을-때)에 정리되어 있어요.

---

## 예시 내용 정리하기

처음 들어 있는 글과 소개 내용은 모양을 확인하기 위한 예시예요. 내 글을 쓰기 시작하면 지워 주세요.

| 예시 | 위치 |
| --- | --- |
| 공부 글 2편 | `src/content/posts/study/building-this-blog/`, `src/content/posts/study/korean-typography-css/` |
| 일상 글 2편 | `src/content/posts/daily/late-autumn-walk/`, `src/content/posts/daily/morning-coffee/` |
| 소개 내용 | `src/data/profile.ts` (내용을 바꾼 뒤 `isSample: false`) |

글은 폴더를 통째로 지우면 돼요. 지우기 전에 사진·동영상 넣는 법을 참고하고 싶다면
`late-autumn-walk`(사진·갤러리·동영상)와 `building-this-blog`(표·코드·인용·각주)를 열어 보세요.

---

## 크레딧과 라이선스

이 사이트는 아래 글꼴을 npm 패키지로 받아 사이트에 함께 담아 써요(외부 글꼴 서비스에 연결하지 않아요).
세 글꼴 모두 **SIL Open Font License 1.1**이라 웹사이트에 자유롭게 쓸 수 있어요.

| 글꼴 | 쓰이는 곳 | 라이선스 | 패키지 |
| --- | --- | --- | --- |
| [Pretendard](https://github.com/orioncactus/pretendard) | 본문 | SIL OFL 1.1 | `pretendard` |
| [Source Serif 4](https://github.com/adobe-fonts/source-serif) | 제목 (영문) | SIL OFL 1.1 | `@fontsource-variable/source-serif-4` |
| [Noto Serif KR](https://fonts.google.com/noto/specimen/Noto+Serif+KR) | 제목 (한글) | SIL OFL 1.1 | `@fontsource/noto-serif-kr` |

- 사이트 생성: [Astro](https://astro.build) (MIT License)
- 코드 블록 색: [Shiki](https://shiki.style) (MIT License)
