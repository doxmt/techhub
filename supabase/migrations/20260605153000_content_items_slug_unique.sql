ALTER TABLE content_items
  ADD CONSTRAINT content_items_slug_key UNIQUE (slug);
