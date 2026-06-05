-- profiles에 nickname 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nickname text NOT NULL DEFAULT '',
  ADD CONSTRAINT profiles_nickname_length CHECK (char_length(nickname) <= 20);

-- profiles RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 신규 사용자 가입 시 profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, nickname, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nickname', ''),
    'viewer'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- bookmarks 테이블
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id bigint NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, content_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookmarks_select_own" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "bookmarks_insert_own" ON bookmarks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM content_items
      WHERE id = content_id AND status = 'published'
    )
  );

CREATE POLICY "bookmarks_delete_own" ON bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- likes 테이블
CREATE TABLE IF NOT EXISTS likes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id bigint NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, content_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes_select_own" ON likes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "likes_insert_own" ON likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM content_items
      WHERE id = content_id AND status = 'published'
    )
  );

CREATE POLICY "likes_delete_own" ON likes
  FOR DELETE USING (auth.uid() = user_id);
