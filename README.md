# BYTE BACK 방어전 시작 틀 R5

이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

`aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 실제 배포가 된 뒤 `/data.json`을 비로그인으로 요청해 공개 가상 메모의 확인 표시를 읽습니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.

## 가상 메모 문장 검증 및 보안 상태

### 1. GitHub 최신 커밋 & 배포 파일 검증 절차
현재 저장소의 최신 HEAD 커밋과 Vercel 배포 파일에서 가상 메모 문장이 제거되었는지 아래 방법으로 검색해 확인합니다:
- **GitHub HEAD 커밋 검증**:
  ```bash
  git grep "실습용 가상" HEAD
  ```
  *(검색 결과: `schema.sql` 외의 정적 파일 `data.json` 및 `public/data.json`에서 메모 문장이 발견되지 않아야 함)*
- **Vercel 정적 배포 파일 검증**:
  - `https://<your-vercel-app>/data.json` 요청 시 가상 메모 문장이 포함되지 않음(빈 배열 `[]` 또는 `404 Not Found`).

### 2. 과거 노출 및 남은 약점 기록
- **과거 노출 미해소 안내**: 1단계 커밋 이력(Git history) 및 Vercel의 과거 배포 링크(Previous deployments)에는 과거에 작성된 가상 메모 문장이 남아 있으므로, 과거 노출 자체가 완전히 삭제되어 해소된 것은 아닙니다.

## 4단계 현재 작동 기능 및 다시 실행 방법

### 현재 작동하는 기능
1. **API 레벨 소유권 검증 (BOLA/IDOR 방어)**:
   - `GET /api/notes`: 로그인 사용자의 `owner_id`와 일치하는 본인 메모만 반환합니다.
   - `GET /api/notes/:id`: 단건 조회 시 본인 메모가 아니면 HTTP 403 Forbidden으로 거부합니다.
   - `POST /api/notes`: 클라이언트의 임의 `owner_id` 입력을 무시하고 검증된 토큰의 `userId`로 저장합니다.
   - `PUT /api/notes/:id`: 기존 행의 소유자 확인 및 소유자 변경 시도(`payload.owner_id`)를 차단(403 거부)합니다.
   - `DELETE /api/notes/:id`: 본인 소유의 메모만 삭제를 허용하고 타인 메모 삭제 시도는 403으로 거부합니다.
2. **DB 레벨 RLS 및 최소 권한 통제**:
   - `public.notes` 테이블의 기존 권한을 회수(`REVOKE ALL`)하고 `authenticated` 역할에만 최소 권한(SELECT, INSERT, UPDATE, DELETE)을 부여했습니다 (`anon` 역할은 권한 없음).
   - 4개 RLS 정책(`notes_select_own`, `notes_insert_own`, `notes_update_own`, `notes_delete_own`)을 통해 `auth.uid() = owner_id` 조건으로 데이터베이스 차원에서 격리됩니다.
3. **허용 경로 등록**:
   - `aleph.config.json`의 `allowedRoutes`에 메서드를 명시한 실제 API 경로(`GET /api/notes`, `POST /api/notes`, `GET /api/notes/:id`, `PUT /api/notes/:id`, `DELETE /api/notes/:id`)가 등록되어 있습니다.

### 다시 실행하는 방법
1. **로컬 빌드 및 패키지 검사**:
   ```bash
   npm run build -- --local
   npm run test:package
   ```
2. **제출 묶음 생성 및 자기 점검**:
   ```bash
   npm run bundle
   ```
3. **배포 환경 확인**:
   - Vercel 배포 사이트에서 A 계정으로 로그인 시 A의 메모만, B 계정으로 로그인 시 B의 메모만 표시되는지 확인합니다.
   - 타인 메모의 ID로 수정/삭제/조회 요청 시 403 에러가 반환되는지 확인합니다.

