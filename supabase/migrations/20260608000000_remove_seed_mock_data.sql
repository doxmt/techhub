-- seed.sql에서 삽입된 목 데이터(example.* 도메인 및 가짜 YouTube URL) 삭제
-- 실제 RSS 수집 데이터는 영향 없음

DELETE FROM content_items
WHERE url LIKE '%://%.example.%'
   OR url IN (
     'https://www.youtube.com/watch?v=abc123',
     'https://www.youtube.com/watch?v=def456',
     'https://www.youtube.com/watch?v=ghi789',
     'https://www.youtube.com/watch?v=jkl012',
     'https://www.youtube.com/watch?v=mno345',
     'https://www.youtube.com/watch?v=pqr678',
     'https://www.youtube.com/watch?v=stu901'
   );
