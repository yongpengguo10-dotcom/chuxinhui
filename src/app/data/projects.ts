export interface Project {
  id: string;
  series: string;
  name: string;
  fullName: string;
  date: string;
  endDate?: string;
  phase: string;
  owner: string;
  goals: string;
  notes?: string;
  coverUrl?: string;
  completion: number;
  riskCount: number;
  imageCount: number;
  pendingReviewCount: number;
}

export const mockProjects: Project[] = [
  {
    id: "p_jkd_2605",
    series: "众创截拳道",
    name: "2026年5月课程",
    fullName: "众创截拳道 · 2026年5月课程",
    date: "2026-05-31",
    phase: "集中邀约",
    owner: "张磊",
    goals: "报名80人 · 到场60人 · 成交20人",
    completion: 62,
    riskCount: 2,
    imageCount: 47,
    pendingReviewCount: 3,
  },
  {
    id: "p_zs_05",
    series: "招商说明会",
    name: "5月场",
    fullName: "招商说明会 · 5月场",
    date: "2026-05-22",
    phase: "集中邀约",
    owner: "陈晓",
    goals: "到场120人 · 成交8家",
    completion: 78,
    riskCount: 0,
    imageCount: 32,
    pendingReviewCount: 1,
  },
  {
    id: "p_sdh_06",
    series: "私董会沙龙",
    name: "6月场",
    fullName: "私董会沙龙 · 6月场",
    date: "2026-06-15",
    phase: "立项启动",
    owner: "周敏",
    goals: "到场30人精英企业家",
    completion: 18,
    riskCount: 3,
    imageCount: 8,
    pendingReviewCount: 0,
  },
  {
    id: "p_jkd_2606",
    series: "众创截拳道",
    name: "2026年6月课程",
    fullName: "众创截拳道 · 2026年6月课程",
    date: "2026-06-28",
    phase: "市场预热",
    owner: "张磊",
    goals: "报名100人 · 到场75人 · 成交25人",
    completion: 35,
    riskCount: 1,
    imageCount: 19,
    pendingReviewCount: 2,
  },
];

export const today = new Date("2026-05-14");

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function getDefaultProject(projects: Project[]): Project {
  const upcoming = projects
    .filter(p => daysUntil(p.date) >= 0)
    .sort((a, b) => daysUntil(a.date) - daysUntil(b.date));
  return upcoming[0] ?? projects[0];
}
