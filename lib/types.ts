export type Profile = {
  id: string;
  handle: string;
  bio: string;
  looking_for: string;
  rank: number;
  season_points: number;
  streak_count: number;
  last_streak_date: string | null;
  created_at: string;
  last_active_at: string;
};

export type ProfileTag = {
  id: string;
  profile_id: string;
  tag: string;
  level: number;
  is_primary: boolean;
  created_at: string;
  endorsement_count: number;
};

export type ProfileSubtag = {
  slug: string;
  label: string;
  parent_slug: string;
};

export type Endorsement = {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  tag: string;
  created_at: string;
  from_handle?: string;
};

export type ProfileWithTags = Profile & {
  tags: ProfileTag[];
  subtags: ProfileSubtag[];
  primary_tag: ProfileTag | null;
  endorsements: Endorsement[];
  title: string | null;
  banner: string;
  bracket_note?: string;
};

export type RisingProfile = ProfileWithTags & { rank_delta: number };
export type SimilarProfile = ProfileWithTags & { shared_tags: string[] };
export type TagCloudItem = {
  tag: string;
  label?: string;
  category?: string;
  count: number;
};
export type FeedSort = "newest" | "active" | "rising";

export type Friendship = {
  id: string;
  a_id: string;
  b_id: string;
  status: "pending" | "accepted";
  requested_by: string;
  created_at: string;
};

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  other_handle?: string;
};

export type Wave = {
  id: string;
  from_id: string;
  to_id: string;
  created_at: string;
  from_handle?: string;
};

export type LeaderboardEntry = {
  handle: string;
  profile_id: string;
  tag: string;
  level: number;
  bracket: "beginner" | "open";
};

export type SpotlightCandidate = {
  profile_id: string;
  handle: string;
  bio: string;
  votes: number;
  rank: number;
};
