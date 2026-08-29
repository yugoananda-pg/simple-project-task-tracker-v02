import type { GlobalRole } from "@/src/lib/types";

export const ROLE_LABELS: Record<GlobalRole, string> = {
  super_pm: "Super PM",
  pm: "PM",
  member: "Member",
  viewer: "Viewer",
};

export function getRoleLabel(role: GlobalRole): string {
  return ROLE_LABELS[role];
}
