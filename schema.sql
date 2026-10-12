-- Supabase 학습용 notes 테이블 생성
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- anon 및 authenticated 역할에 대한 읽기(SELECT) 권한을 명시적으로 제거/부여하지 않음 (RLS가 켜진 상태에서 정책이 없으면 접근 거부됨)

-- 가상 메모 4건 이관 데이터 삽입
INSERT INTO public.notes (title, content) VALUES
  ('과제', '실습용 가상 과제 기록'),
  ('포트폴리오', '실습용 가상 포트폴리오 기록'),
  ('아침 리추얼', '실습용 가상 리추얼 기록'),
  ('훈련 행정 자료', '실습용 가상 행정 기록');

-- [4단계 학습용 SQL]
-- 1. 기존 가상 메모 4건에 A의 owner_id 연결
UPDATE public.notes
SET owner_id = (SELECT id FROM auth.users WHERE email = 'YOUR_USER_A_EMAIL' LIMIT 1)
WHERE title IN ('과제', '포트폴리오', '아침 리추얼', '훈련 행정 자료');

-- 2. B 소유의 공개 가능한 시험 메모 1건 추가
INSERT INTO public.notes (title, content, owner_id)
VALUES (
  'B의 가상 메모',
  '실습용 가상 B 메모 기록',
  (SELECT id FROM auth.users WHERE email = 'YOUR_USER_B_EMAIL' LIMIT 1)
);

-- [4단계 RLS 및 최소 권한 설정]
-- 1. 기존 권한 회수 (다른 테이블은 건드리지 않고 public.notes만 대상)
REVOKE ALL ON TABLE public.notes FROM PUBLIC, anon, authenticated;

-- 2. authenticated 역할에 최소 권한(SELECT, INSERT, UPDATE, DELETE) 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notes TO authenticated;

-- 3. RLS 활성화 확인
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 설정 (SELECT·DELETE는 USING, INSERT는 WITH CHECK, UPDATE는 USING과 WITH CHECK 모두 auth.uid() = owner_id)
DROP POLICY IF EXISTS "notes_select_own" ON public.notes;
CREATE POLICY "notes_select_own" ON public.notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "notes_insert_own" ON public.notes;
CREATE POLICY "notes_insert_own" ON public.notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "notes_update_own" ON public.notes;
CREATE POLICY "notes_update_own" ON public.notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "notes_delete_own" ON public.notes;
CREATE POLICY "notes_delete_own" ON public.notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- [권한 대조 확인용 SQL]
-- 1) information_schema.role_table_grants 대조
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'notes'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

-- 2) has_table_privilege 대조
SELECT
  role_name,
  has_table_privilege(role_name, 'public.notes', 'SELECT') AS can_select,
  has_table_privilege(role_name, 'public.notes', 'INSERT') AS can_insert,
  has_table_privilege(role_name, 'public.notes', 'UPDATE') AS can_update,
  has_table_privilege(role_name, 'public.notes', 'DELETE') AS can_delete
FROM (VALUES ('anon'), ('authenticated')) AS roles(role_name);

-- [5단계 학습용 SQL: 브라우저/외부 직접 접근 권한 전면 회수]
-- 다른 테이블은 건드리지 않고 public.notes의 직접 권한만 모두 회수합니다.
-- (Vercel 서버 함수는 service_role 키를 사용하므로 정상 동작 유지)
REVOKE ALL ON TABLE public.notes FROM PUBLIC, anon, authenticated;

-- [5단계 적용 후 권한 대조 쿼리: 두 역할 모두 모든 권한이 false(0건)여야 함]
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'notes'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;

SELECT
  role_name,
  has_table_privilege(role_name, 'public.notes', 'SELECT') AS can_select,
  has_table_privilege(role_name, 'public.notes', 'INSERT') AS can_insert,
  has_table_privilege(role_name, 'public.notes', 'UPDATE') AS can_update,
  has_table_privilege(role_name, 'public.notes', 'DELETE') AS can_delete
FROM (VALUES ('anon'), ('authenticated')) AS roles(role_name);



