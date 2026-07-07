export type Member = {
  id: string;
  name: string;
  student_id: string | null;
  role: "member" | "admin";
  points: number;
  avatar_url: string | null;
  is_paid: boolean;
  created_at: string;
};

export type Achievement = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  threshold: number;
};

export type MemberAchievement = {
  member_id: string;
  achievement_id: string;
  unlocked_at: string;
};

export type Reward = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cost: number;
  stock: number;
};

export type PointTemplate = {
  id: string;
  name: string;
  points_delta: number;
  reason: string;
};

export type PointLog = {
  id: string;
  member_id: string;
  points_delta: number;
  reason: string;
  event_id: string | null;
  created_at: string;
};

export type ClubEvent = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  event_time: string;
};

export type Redemption = {
  id: string;
  member_id: string;
  reward_id: string;
  status: "pending" | "fulfilled" | "cancelled";
  created_at: string;
};
