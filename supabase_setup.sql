-- 1. Alter profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS charcha_points int DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 2. Alter messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS audio_url text,
ADD COLUMN IF NOT EXISTS flags int DEFAULT 0,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS upvotes uuid[] DEFAULT '{}'::uuid[];

-- 3. Update get_nearby_users RPC
DROP FUNCTION IF EXISTS public.get_nearby_users(float, float, float);
DROP FUNCTION IF EXISTS public.get_nearby_users(float, float, float, text[]);

CREATE OR REPLACE FUNCTION public.get_nearby_users(
  user_lat float,
  user_lng float,
  radius float,
  user_interests text[] DEFAULT '{}'::text[]
)
RETURNS TABLE (
  id uuid,
  username text,
  latitude float,
  longitude float,
  interests text[],
  charcha_points int,
  dist_km float,
  common_interests_count int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.latitude,
    p.longitude,
    p.interests,
    p.charcha_points,
    -- Distance calc using haversine formula
    (6371 * acos(cos(radians(user_lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(user_lng)) + sin(radians(user_lat)) * sin(radians(p.latitude)))) AS dist_km,
    -- Count common interests using array intersection
    (
      SELECT count(*)::int
      FROM unnest(p.interests) i
      WHERE i = ANY(user_interests)
    ) AS common_interests_count
  FROM public.profiles p
  WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND (6371 * acos(cos(radians(user_lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(user_lng)) + sin(radians(user_lat)) * sin(radians(p.latitude)))) <= radius
  ORDER BY 
    common_interests_count DESC,
    dist_km ASC;
END;
$$;

-- 4. Create get_nearby_online_count RPC
CREATE OR REPLACE FUNCTION public.get_nearby_online_count(
  user_lat float,
  user_lng float,
  radius float
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  online_count int;
BEGIN
  SELECT count(*) INTO online_count
  FROM public.profiles p
  WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND p.updated_at > now() - interval '5 minutes'
    AND (6371 * acos(cos(radians(user_lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(user_lng)) + sin(radians(user_lat)) * sin(radians(p.latitude)))) <= radius;
    
  RETURN online_count;
END;
$$;

-- 5. Create upvote_message RPC
CREATE OR REPLACE FUNCTION public.upvote_message(
  msg_id uuid,
  voter_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  msg_sender_id uuid;
BEGIN
  -- Check if user already upvoted
  IF EXISTS (
    SELECT 1 FROM public.messages
    WHERE id = msg_id AND voter_id = ANY(upvotes)
  ) THEN
    RAISE EXCEPTION 'User already upvoted this message';
  END IF;

  -- Add to array
  UPDATE public.messages
  SET upvotes = array_append(upvotes, voter_id)
  WHERE id = msg_id
  RETURNING sender_id INTO msg_sender_id;

  -- Add points to the sender
  IF msg_sender_id IS NOT NULL THEN
    UPDATE public.profiles
    SET charcha_points = charcha_points + 5
    WHERE id = msg_sender_id;
  END IF;
END;
$$;

-- 6. Rate Limiting Trigger for messages
CREATE OR REPLACE FUNCTION public.check_rate_limit()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.messages
    WHERE sender_id = NEW.sender_id
      AND created_at > NOW() - INTERVAL '3 seconds'
  ) THEN
    RAISE EXCEPTION 'Rate limit exceeded: Please wait before sending another message.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_rate_limit ON public.messages;
CREATE TRIGGER enforce_rate_limit
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE PROCEDURE public.check_rate_limit();

-- 7. Add Storage Bucket for voice notes (You may need to configure RLS policies separately in the dashboard)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice_notes', 'voice_notes', true)
ON CONFLICT (id) DO NOTHING;
