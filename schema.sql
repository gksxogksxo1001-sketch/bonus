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
