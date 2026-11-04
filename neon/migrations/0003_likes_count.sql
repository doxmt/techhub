create or replace function sync_likes_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update content_items set likes_count = likes_count + 1 where id = new.content_id;
  elsif tg_op = 'DELETE' then
    update content_items set likes_count = greatest(likes_count - 1, 0) where id = old.content_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger likes_count_trigger
after insert or delete on likes
for each row execute function sync_likes_count();
