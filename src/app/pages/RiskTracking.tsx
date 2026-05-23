import { useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { Project, daysUntil } from "../data/projects";
import { Task, TASK_ROLES, TaskRole } from "../data/tasks";
import { roleColor, statusStyle, effectiveStatus, isOverdue } from "../lib/taskUtils";
import { PageShell } from "../components/PageShell";

interface RiskTrackingProps {
  projects: Project[];
  currentProject: Project;
  tasks: Task[];
  onSwitchProject: (p: Project) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
  showToast: (msg: string) => void;
}

type FilterKey = "all" | "risk" | "overdue";

export function RiskTracking({
  projects, currentProject, tasks, onSwitchProject, onUpdateTask,
  isMobile, onOpenDrawer, showToast,
}: RiskTrackingProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [roleFilter, setRoleFilter] = useState<TaskRole | "all">("all");

  const allRisk = useMemo(
    () => tasks
      .filter(t => t.projectId === currentProject.id && (isOverdue(t) || t.status === "有风险"))
      .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline)),
    [tasks, currentProject.id],
  );

  const filtered = allRisk.filter(t => {
    if (filter === "risk" && t.status !== "有风险") return false;
    if (filter === "overdue" && !isOverdue(t)) return false;
    if (roleFilter !== "all" && t.role !== roleFilter) return false;
    return true;
  });

  const counts = {
    all: allRisk.length,
    risk: allRisk.filter(t => t.status === "有风险").length,
    overdue: allRisk.filter(t => isOverdue(t)).length,
  };

  const extend = (t: Task) => {
    const d = new Date(t.deadline);
    d.setDate(d.getDate() + 3);
    const newDate = d.toISOString().slice(0, 10);
    onUpdateTask(t.id, { deadline: newDate, status: t.status === "已逾期" ? "进行中" : t.status });
    showToast(`「${t.name}」截止时间延后到 ${newDate}`);
  };

  const resolve = (t: Task) => {
    onUpdateTask(t.id, { status: "进行中" });
    showToast(`已解除风险标记`);
  };

  const remind = (t: Task) => showToast(`已催办「${t.name}」给 ${t.owner}`);

  return (
    <PageShell
      title="风险跟进"
      breadcrumb="项目总控 / 风险跟进"
      description="集中处理风险任务，确保关键节点不被遗漏"
      isMobile={isMobile}
      onOpenDrawer={onOpenDrawer}
      showProjectBar
      projects={projects}
      currentProject={currentProject}
      onSwitchProject={onSwitchProject}
    >
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "repeat(3, minmax(0, 1fr))" }}>
        <Summary label="风险任务总数" value={counts.all} accent />
        <Summary label="标记风险" value={counts.risk} color="#8A6500" />
        <Summary label="已逾期" value={counts.overdue} color="#CC3333" />
      </div>

      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <Chip active={filter === "all"} label={`全部 ${counts.all}`} onClick={() => setFilter("all")} />
        <Chip active={filter === "risk"} label={`风险 ${counts.risk}`} onClick={() => setFilter("risk")} />
        <Chip active={filter === "overdue"} label={`逾期 ${counts.overdue}`} onClick={() => setFilter("overdue")} danger />
        <div style={{ width: 1, height: 18, background: "#E8E3D8", margin: "0 4px" }} />
        <Chip active={roleFilter === "all"} label="全部岗位" onClick={() => setRoleFilter("all")} />
        {TASK_ROLES.map(r => (
          <Chip key={r} active={roleFilter === r} label={r} onClick={() => setRoleFilter(r)} role={r} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
          <CheckCircle2 size={28} style={{ color: "#1E7A3D", margin: "0 auto 8px" }} />
          <div style={{ fontSize: 14, color: "#141414", fontWeight: 600 }}>当前无风险任务</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>项目推进良好 ✨</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(t => {
            const status = effectiveStatus(t);
            const s = statusStyle(status);
            const c = roleColor(t.role);
            const days = daysUntil(t.deadline);
            const overdue = isOverdue(t);
            return (
              <div
                key={t.id}
                className="rounded-2xl p-3.5 flex items-center gap-3 flex-wrap"
                style={{ background: "#FFFFFF", border: `1px solid ${overdue ? "#FFCCCC" : "#EDE9DF"}` }}
              >
                <span
                  className="px-2 py-0.5 rounded-md flex-shrink-0"
                  style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 11, fontWeight: 600 }}
                >
                  {t.role}
                </span>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#141414", marginBottom: 3 }}>
                    {t.isKey && <span style={{ color: "#8A6500", marginRight: 4 }}>★</span>}
                    {t.name}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 11, color: "#999" }}>
                    <span>{t.owner}</span>
                    <span>·</span>
                    <span style={{ color: overdue ? "#CC3333" : "#999", fontWeight: overdue ? 600 : 400 }}>
                      <Clock size={10} style={{ display: "inline", verticalAlign: "-1px", marginRight: 3 }} />
                      {t.deadline} {overdue ? `（逾期 ${-days} 天）` : `（${days} 天后）`}
                    </span>
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 rounded flex-shrink-0"
                  style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, fontSize: 11, fontWeight: 600 }}
                >
                  {status}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <ActionBtn icon={Bell} label="催办" onClick={() => remind(t)} />
                  <ActionBtn icon={RefreshCw} label="延期" onClick={() => extend(t)} />
                  {t.status === "有风险" && (
                    <ActionBtn icon={CheckCircle2} label="解除" onClick={() => resolve(t)} accent />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function Summary({ label, value, accent, color }: { label: string; value: number; accent?: boolean; color?: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color ?? (accent ? "#8A6500" : "#141414"), letterSpacing: "-0.02em", lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function Chip({ active, label, onClick, role, danger }: { active: boolean; label: string; onClick: () => void; role?: TaskRole; danger?: boolean }) {
  const c = role ? roleColor(role) : danger ? { bg: "#FFE8E8", border: "#FFCCCC", text: "#CC3333" } : { bg: "#FFF9E6", border: "#F4C542", text: "#8A6500" };
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-full"
      style={{
        background: active ? c.bg : "#FFFFFF",
        border: `1px solid ${active ? c.border : "#E8E3D8"}`,
        color: active ? c.text : "#555",
        fontSize: 11, fontWeight: active ? 600 : 500, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function ActionBtn({ icon: Icon, label, onClick, accent }: { icon: any; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full"
      style={{
        background: accent ? "#FFF9E6" : "#FAFAF8",
        border: `1px solid ${accent ? "#F4D060" : "#E8E3D8"}`,
        color: accent ? "#8A6500" : "#555",
        fontSize: 11, fontWeight: 600, cursor: "pointer",
      }}
    >
      <Icon size={11} /> {label}
    </button>
  );
}
