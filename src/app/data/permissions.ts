import type { NavKey } from "../components/Sidebar";

export type UserRole = "管理员" | "总控" | "招商" | "设计" | "文案" | "短视频" | "运营" | "客服" | "现场执行";

export const ROLE_OPTIONS: { role: UserRole; name: string; subtitle: string }[] = [
  { role: "管理员", name: "管理员", subtitle: "全部权限" },
  { role: "总控", name: "项目总控", subtitle: "项目管理与任务分发" },
  { role: "招商", name: "招商", subtitle: "招商工作台" },
  { role: "设计", name: "设计", subtitle: "设计工作台" },
  { role: "文案", name: "文案", subtitle: "文案工作台" },
  { role: "短视频", name: "短视频", subtitle: "短视频工作台" },
  { role: "运营", name: "运营", subtitle: "运营工作台" },
  { role: "客服", name: "客服", subtitle: "客服工作台" },
  { role: "现场执行", name: "现场执行", subtitle: "现场执行工作台" },
];

const PUBLIC_NAVS: NavKey[] = [
  "overview",
  "projects",
  "library.people",
  "library.project-images",
  "library.common-images",
];

const CONTROL_NAVS: NavKey[] = [
  "control.publish",
  "control.board",
  "control.risk",
  "control.review",
];

const ROLE_WORKSPACE_NAV: Record<UserRole, NavKey[]> = {
  管理员: [],
  总控: [],
  招商: ["recruitment"],
  设计: ["market.design"],
  文案: ["market.copy"],
  短视频: ["market.video"],
  运营: ["market.ops"],
  客服: ["market.cs"],
  现场执行: ["market.field"],
};

export function getAllowedNavs(role: UserRole): Set<NavKey> {
  if (role === "管理员") return new Set([...PUBLIC_NAVS, ...CONTROL_NAVS, "recruitment", "market.design", "market.copy", "market.video", "market.ops", "market.cs", "market.field", "benefits", "checkin", "ai.report"]);
  if (role === "总控") return new Set([...PUBLIC_NAVS, ...CONTROL_NAVS, "recruitment", "market.design", "market.copy", "market.video", "market.ops", "market.cs", "market.field", "ai.report"]);
  return new Set([...PUBLIC_NAVS, ...ROLE_WORKSPACE_NAV[role]]);
}

export function canAccessNav(role: UserRole, nav: NavKey): boolean {
  return getAllowedNavs(role).has(nav);
}

export function canManageLocalData(role: UserRole): boolean {
  return role === "管理员" || role === "总控";
}
