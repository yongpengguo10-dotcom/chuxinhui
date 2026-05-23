import { useMemo } from "react";
import { AlertTriangle, FileCheck2, TrendingUp, Users } from "lucide-react";
import { Project } from "../data/projects";
import { Task, TASK_ROLES } from "../data/tasks";
import { PageShell } from "../components/PageShell";
import { roleCompletion, effectiveStatus, isOverdue, ROLE_COLOR } from "../lib/taskUtils";

interface MarketOverviewProps {
  projects: Project[];
  currentProject: Project;
  tasks: Task[];
  onSwitchProject: (p: Project) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
}

export function MarketOverview({
  projects, currentProject, tasks, onSwitchProject, isMobile, onOpenDrawer
}: MarketOverviewProps) {
  const marketRoles = TASK_ROLES.filter(r => r !== "招商");
  
  const marketTasks = useMemo(() => {
    return tasks.filter(t => t.projectId === currentProject.id && marketRoles.includes(t.role));
  }, [tasks, currentProject.id, marketRoles]);

  const stats = useMemo(() => {
    const total = marketTasks.length;
    const done = marketTasks.filter(t => effectiveStatus(t) === "已完成" || effectiveStatus(t) === "已定稿").length;
    const review = marketTasks.filter(t => effectiveStatus(t) === "待审核").length;
    const risk = marketTasks.filter(t => isOverdue(t) || t.status === "有风险").length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, review, risk, pct };
  }, [marketTasks]);

  const roleStats = useMemo(() => {
    return marketRoles.map(role => {
      const rt = marketTasks.filter(t => t.role === role);
      const perf = roleCompletion(rt);
      const riskCount = rt.filter(t => isOverdue(t) || t.status === "有风险").length;
      const reviewCount = rt.filter(t => effectiveStatus(t) === "待审核").length;
      return { role, ...perf, riskCount, reviewCount, tasks: rt };
    });
  }, [marketTasks, marketRoles]);

  return (
    <PageShell
      title="市场总览"
      breadcrumb="市场中心 / 市场总览"
      description="市场负责人视角，统观设计、文案、短视频、运营、客服、现场六个岗位进度"
      isMobile={isMobile}
      onOpenDrawer={onOpenDrawer}
      showProjectBar
      projects={projects}
      currentProject={currentProject}
      onSwitchProject={onSwitchProject}
    >
      {/* Top KPI row */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))" }}>
        <KpiCard label="市场中心整体完成度" value={`${stats.pct}%`} sub={`${stats.done} / ${stats.total} 任务完成`} accentBar={stats.pct} icon={TrendingUp} />
        <KpiCard label="待审核/确认" value={`${stats.review}`} sub="项成果待审核" accent={stats.review > 0} icon={FileCheck2} />
        <KpiCard label="风险与逾期" value={`${stats.risk}`} sub="项需立即介入" danger={stats.risk > 0} icon={AlertTriangle} />
        <KpiCard label="团队规模" value="6 岗位" sub="协同推进中" icon={Users} />
      </div>

      {/* Role Grid */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
        {roleStats.map(r => (
          <div key={r.role} className="rounded-2xl p-4 flex flex-col" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold" style={{ background: ROLE_COLOR[r.role].bg, border: `1px solid ${ROLE_COLOR[r.role].border}`, color: ROLE_COLOR[r.role].text }}>
                  {r.role}
                </span>
                <span className="text-[13px] font-bold text-[#141414]">{r.done} / {r.total}</span>
              </div>
              <div className="text-[14px] font-extrabold text-[#141414]">{r.pct}%</div>
            </div>
            
            <div className="mb-4">
              <div style={{ height: 6, background: "#F0EDE4", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${r.pct}%`, background: r.pct >= 80 ? "#1E7A3D" : r.pct >= 40 ? "#F4C542" : "#FFB36B", transition: "width 0.3s" }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-auto">
              <div className="flex flex-col items-center justify-center p-2 rounded-xl" style={{ background: "#FAFAF8", border: "1px solid #F0EDE4" }}>
                <span className="text-[16px] font-bold text-[#8A6500]">{r.reviewCount}</span>
                <span className="text-[10px] text-[#999] mt-0.5">待审核</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-xl" style={{ background: r.riskCount > 0 ? "#FFF5F5" : "#FAFAF8", border: `1px solid ${r.riskCount > 0 ? "#FFDDDD" : "#F0EDE4"}` }}>
                <span className={`text-[16px] font-bold ${r.riskCount > 0 ? "text-[#CC3333]" : "text-[#141414]"}`}>{r.riskCount}</span>
                <span className="text-[10px] text-[#999] mt-0.5">风险</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

function KpiCard({ label, value, sub, accentBar, danger, accent, icon: Icon }: { label: string; value: string; sub: string; accentBar?: number; danger?: boolean; accent?: boolean; icon: any }) {
  const color = danger ? "#CC3333" : accent ? "#8A6500" : "#141414";
  return (
    <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
      <Icon size={48} className="absolute right-[-10px] bottom-[-10px] opacity-[0.03]" />
      <div style={{ fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{sub}</div>
      {typeof accentBar === "number" && (
        <div className="mt-2.5 h-1.5 rounded-full bg-[#F0EDE4] overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${Math.min(100, Math.max(0, accentBar))}%`, background: accentBar >= 80 ? "#1E7A3D" : accentBar >= 40 ? "#F4C542" : "#FFB36B" }} />
        </div>
      )}
    </div>
  );
}
