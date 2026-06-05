-- published 상태인 경우 published_at이 반드시 존재해야 함
ALTER TABLE content_items
  ADD CONSTRAINT content_items_published_at_required
  CHECK (status != 'published' OR published_at IS NOT NULL);
