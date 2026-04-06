
-- Triggers pour le système de pointage
CREATE TRIGGER trg_post_points
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.add_post_points();

CREATE TRIGGER trg_group_event_points
  AFTER INSERT ON public.group_events
  FOR EACH ROW
  EXECUTE FUNCTION public.pts_on_group_event();

CREATE TRIGGER trg_group_project_points
  AFTER INSERT ON public.group_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.pts_on_group_project();

CREATE TRIGGER trg_group_poll_points
  AFTER INSERT ON public.group_polls
  FOR EACH ROW
  EXECUTE FUNCTION public.pts_on_group_poll();

-- Seed spiritual_levels
INSERT INTO public.spiritual_levels (name, points_min, points_max, badge_icon) VALUES
  ('Nouveau croyant', 0, 199, '🌱'),
  ('Disciple', 200, 599, '📖'),
  ('Serviteur', 600, 1499, '🙏'),
  ('Évangéliste', 1500, 2999, '📣'),
  ('Ancien', 3000, 5999, '⭐'),
  ('Prophète', 6000, NULL, '🏆');

-- Function to auto-award badge when reaching level thresholds
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total int;
BEGIN
  SELECT points_total INTO total FROM profiles WHERE id = NEW.profile_id;
  
  -- Award "fidele" badge at 100 points
  IF total >= 100 THEN
    INSERT INTO badges (profile_id, badge_type)
    VALUES (NEW.profile_id, 'fidele')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Award "serviteur" badge at 600 points
  IF total >= 600 THEN
    INSERT INTO badges (profile_id, badge_type)
    VALUES (NEW.profile_id, 'serviteur')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Award "champion" badge at 3000 points
  IF total >= 3000 THEN
    INSERT INTO badges (profile_id, badge_type)
    VALUES (NEW.profile_id, 'champion')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add unique constraint for badge deduplication
ALTER TABLE public.badges ADD CONSTRAINT badges_profile_type_unique UNIQUE (profile_id, badge_type);

-- Trigger to check badges after each points_log insert
CREATE TRIGGER trg_check_badges
  AFTER INSERT ON public.points_log
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_award_badges();
