import { CheckCircle2, AlertTriangle, Image as ImageIcon, FileCheck2, Megaphone, Sparkles, FolderClosed, PenTool, Download, FileText, Video } from "lucide-react";
import { Project, daysUntil } from "../data/projects";
import { Task, TASK_ROLES, TaskRole } from "../data/tasks";
import { projectStats, roleCompletion, ROLE_COLOR, STATUS_STYLES, effectiveStatus, isOverdue } from "../lib/taskUtils";
import { PageShell } from "../components/PageShell";
import { NavKey } from "../components/Sidebar";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

interface ProjectOverviewProps {
  projects: Project[];
  currentProject: Project;
  tasks: Task[];
  onSwitchProject: (p: Project) => void;
  onNavigate: (key: NavKey) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
}

const RECRUITMENT_DATA = {
  targetCount: 80,
  contacted: 142,
  interested: 58,
  confirmed: 36,
  paid: 24,
};

export function ProjectOverview({
  projects, currentProject, tasks, onSwitchProject, onNavigate, isMobile, onOpenDrawer,
}: ProjectOverviewProps) {
  const stats = projectStats(tasks, currentProject.id);
  const days = daysUntil(currentProject.date);

  const rolePerf = TASK_ROLES.map(role => {
    const roleTasks = tasks.filter(t => t.projectId === currentProject.id && t.role === role);
    return { role, ...roleCompletion(roleTasks), riskCount: roleTasks.filter(t => isOverdue(t) || t.status === "有风险").length };
  });

  const riskList = tasks
    .filter(t => t.projectId === currentProject.id && (isOverdue(t) || t.status === "有风险"))
    .slice(0, 5);

  const latestResults = tasks.filter(t => t.projectId === currentProject.id && t.uploaded);

  return (
    <PageShell
      title="项目总览"
      breadcrumb="管理者视角"
      description="掌握整个项目的进度、风险与关键决策入口"
      isMobile={isMobile}
      onOpenDrawer={onOpenDrawer}
      showProjectBar
      projects={projects}
      currentProject={currentProject}
      onSwitchProject={onSwitchProject}
    >
      {/* Top KPI row */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))" }}>
        <KpiCard label="整体完成度" value={`${stats.completionPct}%`} sub={`${stats.done} / ${stats.total} 任务完成`} accentBar={stats.completionPct} />
        <KpiCard label="距活动开始" value={days >= 0 ? `${days} 天` : "已结束"} sub={currentProject.date} hot={days >= 0 && days <= 7} />
        <KpiCard label="风险任务" value={`${stats.risk + stats.overdue}`} sub={`${stats.overdue} 已逾期 · ${stats.risk} 风险`} danger={stats.risk + stats.overdue > 0} />
        <KpiCard label="待审核成果" value={`${stats.pendingReview}`} sub={`${currentProject.imageCount} 张项目图片`} accent={stats.pendingReview > 0} />
      </div>

      {/* Recruitment + per-role progress */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1.2fr)" }}>
        {/* Recruitment */}
        <Card title="招商核心数据" icon={Megaphone} actionLabel="进入招商中心" onAction={() => onNavigate("recruitment")}>
          <div className="grid grid-cols-5 gap-2">
            <RecruitStat label="目标" value={RECRUITMENT_DATA.targetCount} />
            <RecruitStat label="已联系" value={RECRUITMENT_DATA.contacted} />
            <RecruitStat label="有意向" value={RECRUITMENT_DATA.interested} highlight />
            <RecruitStat label="确认到场" value={RECRUITMENT_DATA.confirmed} highlight />
            <RecruitStat label="已付款" value={RECRUITMENT_DATA.paid} highlight />
          </div>
          <div className="mt-3 p-3 rounded-xl" style={{ background: "#F8F6EF", border: "1px solid #EDE9DF" }}>
            <div className="flex items-center justify-between mb-1.5">
              <span style={{ fontSize: 11, color: "#777" }}>报名转化（已付款 / 目标）</span>
              <span style={{ fontSize: 12, color: "#141414", fontWeight: 600 }}>
                {Math.round((RECRUITMENT_DATA.paid / RECRUITMENT_DATA.targetCount) * 100)}%
              </span>
            </div>
            <ProgressBar pct={Math.round((RECRUITMENT_DATA.paid / RECRUITMENT_DATA.targetCount) * 100)} />
          </div>
        </Card>

        {/* Per-role progress */}
        <Card title="各岗位进度" icon={Sparkles} actionLabel="进入市场中心" onAction={() => onNavigate("market.overview")}>
          <div className="flex flex-col gap-2">
            {rolePerf.map(r => (
              <div key={r.role} className="flex items-center gap-3">
                <span
                  className="px-2 py-0.5 rounded-md"
                  style={{
                    background: ROLE_COLOR[r.role].bg,
                    border: `1px solid ${ROLE_COLOR[r.role].border}`,
                    color: ROLE_COLOR[r.role].text,
                    fontSize: 11, fontWeight: 600, minWidth: 64, textAlign: "center", flexShrink: 0,
                  }}
                >
                  {r.role}
                </span>
                <div className="flex-1 min-w-0">
                  <ProgressBar pct={r.pct} />
                </div>
                <span style={{ fontSize: 12, color: "#141414", fontWeight: 600, width: 48, textAlign: "right", flexShrink: 0 }}>
                  {r.done}/{r.total}
                </span>
                {r.riskCount > 0 && (
                  <span
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                    style={{ background: "#FFE8E8", border: "1px solid #FFCCCC", color: "#CC3333", fontSize: 10, fontWeight: 600, flexShrink: 0 }}
                  >
                    <AlertTriangle size={9} /> {r.riskCount}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Risk + today */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)" }}>
        <Card title="风险提醒" icon={AlertTriangle} danger actionLabel="风险跟进" onAction={() => onNavigate("control.risk")}>
          {riskList.length === 0 ? (
            <EmptyHint text="当前无风险任务 ✨" />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {riskList.map(t => (
                <TaskMiniRow key={t.id} task={t} />
              ))}
            </ul>
          )}
        </Card>

        <Card title="今日重点" icon={CheckCircle2} actionLabel="任务分发" onAction={() => onNavigate("control.board")}>
          {stats.todayTasks.length === 0 ? (
            <EmptyHint text="今日无紧迫任务" />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {stats.todayTasks.slice(0, 5).map(t => (
                <TaskMiniRow key={t.id} task={t} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Latest Deliverables */}
      <div className="mb-4">
        <Card title="今日最新成果" icon={ImageIcon}>
          {latestResults.length === 0 ? (
            <EmptyHint text="今日暂无新成果提交" />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {latestResults.map((t, i) => (
                <DeliverableCard key={t.id} task={t} index={i} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick links */}
      <Card title="快捷入口">
        <div className="grid gap-2" style={{ gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)" }}>
          <QuickLink icon={PenTool} label="发布任务" onClick={() => onNavigate("control.publish")} />
          <QuickLink icon={Megaphone} label="招商中心" onClick={() => onNavigate("recruitment")} />
          <QuickLink icon={Sparkles} label="市场中心" onClick={() => onNavigate("market.overview")} />
          <QuickLink icon={FolderClosed} label="项目图片库" onClick={() => onNavigate("library.project-images")} />
        </div>
      </Card>
    </PageShell>
  );
}

function KpiCard({
  label, value, sub, accentBar, danger, hot, accent,
}: { label: string; value: string; sub: string; accentBar?: number; danger?: boolean; hot?: boolean; accent?: boolean }) {
  const color = danger ? "#CC3333" : hot ? "#8A6500" : accent ? "#8A6500" : "#141414";
  return (
    <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{sub}</div>
      {typeof accentBar === "number" && (
        <div className="mt-2.5">
          <ProgressBar pct={accentBar} />
        </div>
      )}
    </div>
  );
}

function Card({
  title, icon: Icon, danger, actionLabel, onAction, children,
}: { title: string; icon?: any; danger?: boolean; actionLabel?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="flex items-center justify-center rounded-lg" style={{ width: 26, height: 26, background: danger ? "#FFF5F5" : "#FFF9E6", border: `1px solid ${danger ? "#FFDDDD" : "#F4D060"}` }}>
              <Icon size={13} style={{ color: danger ? "#CC3333" : "#8A6500" }} />
            </div>
          )}
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#141414" }}>{title}</h3>
        </div>
        {actionLabel && (
          <button
            onClick={onAction}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: "#FFFDF0", border: "1px solid #F4D060", cursor: "pointer", fontSize: 11, color: "#8A6500", fontWeight: 600 }}
          >
            {actionLabel} →
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 6, background: "#F0EDE4", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: pct >= 80 ? "#1E7A3D" : pct >= 40 ? "#F4C542" : "#FFB36B", transition: "width 0.3s" }} />
    </div>
  );
}

function RecruitStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className="rounded-xl py-2.5 px-2 text-center"
      style={{ background: highlight ? "#FFF9E6" : "#FAFAF8", border: `1px solid ${highlight ? "#F4D060" : "#EDE9DF"}` }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, color: highlight ? "#8A6500" : "#141414", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#999", marginTop: 3 }}>{label}</div>
    </div>
  );
}

function TaskMiniRow({ task }: { task: Task }) {
  const status = effectiveStatus(task);
  const s = STATUS_STYLES[status];
  return (
    <li className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#FAFAF8", border: "1px solid #F0EDE4" }}>
      <span
        className="px-1.5 py-0.5 rounded-md"
        style={{ background: ROLE_COLOR[task.role].bg, border: `1px solid ${ROLE_COLOR[task.role].border}`, color: ROLE_COLOR[task.role].text, fontSize: 10, fontWeight: 600, flexShrink: 0 }}
      >
        {task.role}
      </span>
      <span style={{ fontSize: 12.5, color: "#141414", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {task.name}
      </span>
      <span style={{ fontSize: 10, color: "#999", flexShrink: 0 }}>{task.deadline.slice(5)}</span>
      <span
        className="px-1.5 py-0.5 rounded"
        style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, fontSize: 10, fontWeight: 600, flexShrink: 0 }}
      >
        {status}
      </span>
    </li>
  );
}

function QuickLink({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-3 rounded-xl transition-all duration-150"
      style={{ background: "#FAFAF8", border: "1px solid #EDE9DF", cursor: "pointer", textAlign: "left" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFF9E6"; (e.currentTarget as HTMLElement).style.borderColor = "#F4C542"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#FAFAF8"; (e.currentTarget as HTMLElement).style.borderColor = "#EDE9DF"; }}
    >
      <div className="flex items-center justify-center rounded-lg" style={{ width: 30, height: 30, background: "#F4C542", flexShrink: 0 }}>
        <Icon size={14} style={{ color: "#141414" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#141414" }}>{label}</span>
    </button>
  );
}

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1520588451467-4c904eb6d035?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHBvc3RlcnxlbnwxfHx8fDE3Nzg3ODE0ODJ8MA&ixlib=rb-4.1.0&q=80&w=400&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1774283834505-e7bf45485d43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXJrZXRpbmclMjBwb3N0ZXJ8ZW58MXx8fHwxNzc4NzgyMzQ1fDA&ixlib=rb-4.1.0&q=80&w=400&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkb2N1bWVudHxlbnwxfHx8fDE3Nzg3ODIzNDh8MA&ixlib=rb-4.1.0&q=80&w=400&utm_source=figma&utm_medium=referral"
];

function DeliverableCard({ task, index }: { task: Task; index: number }) {
  const isImage = task.resultType === "图片";
  const bgImage = isImage ? MOCK_IMAGES[index % MOCK_IMAGES.length] : undefined;

  return (
    <div className="flex flex-col flex-shrink-0 w-[180px] rounded-xl overflow-hidden border transition-all group" style={{ background: "#FAFAF8", borderColor: "#EDE9DF" }}>
      {/* Thumbnail area */}
      <div className="h-[120px] w-full relative bg-[#F0EDE4] flex items-center justify-center overflow-hidden">
        {bgImage ? (
          <ImageWithFallback src={bgImage} alt={task.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[#AAAAAA]">
            {task.resultType === "文案" ? <FileText size={28} /> : task.resultType === "视频" ? <Video size={28} /> : <FileCheck2 size={28} />}
            <span className="text-[11px] font-semibold">{task.resultType}已上传</span>
          </div>
        )}
        
        {/* Hover overlay with download */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#141414] hover:bg-[#F4C542] transition-colors text-[12px] font-bold">
            <Download size={14} /> 保存
          </button>
        </div>
      </div>
      
      {/* Info area */}
      <div className="p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="px-1.5 py-0.5 rounded-md" style={{ background: ROLE_COLOR[task.role].bg, border: `1px solid ${ROLE_COLOR[task.role].border}`, color: ROLE_COLOR[task.role].text, fontSize: 9, fontWeight: 600 }}>
            {task.role}
          </span>
          <span className="text-[10px] text-[#999]">{task.owner}</span>
        </div>
        <div className="text-[12px] font-bold text-[#141414] truncate" title={task.name}>{task.name}</div>
      </div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: "#AAAAAA", padding: "12px 0", textAlign: "center" }}>{text}</div>;
}
