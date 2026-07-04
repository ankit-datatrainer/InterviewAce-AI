-- ═══════════════════════════════════════════════════════════════════════════
-- One-time seed: adds Saurabh Sharda & Ankit Kumar as REAL coach rows so they
-- show up (and are manageable) in Admin → Coach Management, now that the
-- student marketplace reads ONLY from this table (no more hardcoded list).
-- Safe to run multiple times — skips a coach if one with that name exists.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.coaches (name, title, bio, category, tags, price_per_session, experience_years, rating, total_reviews, commission_pct, status, is_verified, image_url, priority)
select 'Saurabh Sharda', 'Personality Development Coach',
  'A Youth Personality Development Entrepreneur with 15+ years of entrepreneurial experience. I blend my practical knowledge with theoretical insights to empower students with life skills that go beyond conventional education.',
  'personality', array['Personality Development','Communication','Leadership','Self-Confidence'],
  1200, 15, 5.0, 312, 20, 'approved', true, '/images/saurabh.jpg', 'Featured'
where not exists (select 1 from public.coaches where lower(name) = lower('Saurabh Sharda'));

insert into public.coaches (name, title, bio, category, tags, price_per_session, experience_years, rating, total_reviews, commission_pct, status, is_verified, image_url, priority)
select 'Ankit Kumar', 'Generative AI & Agentic AI Expert',
  'I specialize in Generative AI and Agentic AI systems. I will help you master LLM architectures, AI agents, and system design for modern AI applications to ace your next AI engineering interview.',
  'interview', array['Generative AI','Agentic AI','LLMs','System Design'],
  1500, 5, 5.0, 142, 20, 'approved', true, '/images/ankit.jpg', 'Featured'
where not exists (select 1 from public.coaches where lower(name) = lower('Ankit Kumar'));
