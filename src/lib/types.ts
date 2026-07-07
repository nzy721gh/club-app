export type MembershipTier = "member" | "paid" | "committee";

export type Member = {
  id: string;
  name: string;
  student_id: string | null;
  role: "member" | "admin";
  points: number;
  avatar_url: string | null;
  is_paid: boolean;
  membership_tier: MembershipTier;
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
  capacity: number | null;
  allow_guests: boolean;
  max_guests_per_person: number | null;
};

export type Redemption = {
  id: string;
  member_id: string;
  reward_id: string;
  status: "pending" | "fulfilled" | "cancelled";
  created_at: string;
};

export type Ticket = {
  id: string;
  event_id: string;
  member_id: string;
  status: "valid" | "used";
  guest_name: string | null;
  created_at: string;
};

export function isAdminUser(member: Member | null | undefined): boolean {
  return !!member && (member.role === "admin" || member.membership_tier === "committee");
}
