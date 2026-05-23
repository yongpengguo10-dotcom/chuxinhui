import { Task, TaskStatus, TaskPriority, TaskRole, TASK_ROLES } from "../data/tasks";
import { daysUntil } from "../data/projects";

export const STATUS_STYLES: Record<TaskStatus, { bg: string; border: string; text: string; dot: string }> = {
  "未开始": { bg: "#F2F0EB", border: "#E8E3D8", text: "#777", dot: "#AAAAAA" },
  "进行中": { bg: "#EEF4FF", border: "#C9DBFF", text: "#2A5BD7", dot: "#2A5BD7" },
  "待审核": { bg: "#FFF4C7", border: "#F4D060", text: "#8A6500", dot: "#E0A800" },
  "已完成": { bg: "#E9F8EF", border: "#A8E1BD", text: "#1E7A3D", dot: "#1E7A3D" },
  "已定稿": { bg: "#FFF9E6", border: "#F4C542", text: "#8A6500", dot: "#F4C542" },
  "有风险": { bg: "#FFF0F0", border: "#FFCCCC", text: "#CC3333", dot: "#CC3333" },
  "已逾期": { bg: "#FFE8E8", border: "#FF9999", text: "#B71C1C", dot: "#B71C1C" },
};

export const PRIORITY_STYLES: Record<TaskPriority, { bg: string; border: string; text: string }> = {
  "普通": { bg: "#F8F6EF", border: "#E8E3D8", text: "#777" },
  "重要": { bg: "#FFF4C7", border: "#F4D060", text: "#8A6500" },
  "紧急": { bg: "#FFE8E8", border: "#FFCCCC", text: "#CC3333" },
};

export const ROLE_COLOR: Record<TaskRole, { bg: string; border: string; text: string }> = {
  "招商": { bg: "#FFF4E6", border: "#FFD9A8", text: "#8B5A00" },
  "设计": { bg: "#F0E9FF", border: "#D5C2FF", text: "#5A3CC4" },
  "文案": { bg: "#E6F4FF", border: "#A8D5FF", text: "#1B5FA8" },
  "短视频": { bg: "#FFEAF2", border: "#FFB8D2", text: "#B11A60" },
  "运营": { bg: "#E9F8EF", border: "#A8E1BD", text: "#1E7A3D" },
  "客服": { bg: "#E9F4F4", border: "#A8D5D5", text: "#1E6868" },
  "现场执行": { bg: "#FFF1E0", border: "#FFC78A", text: "#A14F00" },
};

export function isOverdue(task: Task): boolean {
  if (task.status === "已完成" || task.status === "已定稿") return false;
  return daysUntil(task.deadline) < 0;
}

export function effectiveStatus(task: Task): TaskStatus {
  if (isOverdue(task)) return "已逾期";
  return task.status;
}

export function tasksByRole(tasks: Task[], projectId: string): Record<TaskRole, Task[]> {
  const out = Object.fromEntries(TASK_ROLES.map(r => [r, [] as Task[]])) as Record<TaskRole, Task[]>;
  tasks.filter(t => t.projectId === projectId).forEach(t => out[t.role].push(t));
  return out;
}

export function roleCompletion(tasks: Task[]): { total: number; done: number; pct: number } {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "已完成" || t.status === "已定稿").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, pct };
}

export function projectStats(tasks: Task[], projectId: string) {
  const list = tasks.filter(t => t.projectId === projectId);
  const total = list.length;
  const done = list.filter(t => t.status === "已完成" || t.status === "已定稿").length;
  const risk = list.filter(t => t.status === "有风险").length;
  const overdue = list.filter(t => isOverdue(t)).length;
  const pendingReview = list.filter(t => t.status === "待审核").length;
  const todayTasks = list.filter(t => {
    const d = daysUntil(t.deadline);
    return d >= 0 && d <= 2 && t.status !== "已完成" && t.status !== "已定稿";
  });
  return {
    total,
    done,
    risk,
    overdue,
    pendingReview,
    completionPct: total === 0 ? 0 : Math.round((done / total) * 100),
    todayTasks,
  };
}
