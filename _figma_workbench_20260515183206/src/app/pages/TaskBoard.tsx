import { useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Clock, FileCheck2, Filter, PenLine, Plus, UploadCloud } from "lucide-react";
import { Project, daysUntil } from "../data/projects";
import { Task, TASK_ROLES, TaskRole, TaskStatus } from "../data/tasks";
import { ROLE_COLOR, STATUS_STYLES, PRIORITY_STYLES, effectiveStatus, isOverdue } from "../lib/taskUtils";
import { PageShell } from "../components/PageShell";
import { NavKey } from "../components/Sidebar";

interface TaskBoardProps {
  projects: Project[];
  currentProject: Project;
  tasks: Task[];
  onSwitchProject: (p: Project) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onNavigate: (key: NavKey) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
  showToast: (msg: string) => void;
}

export function TaskBoard({
  projects, currentProject, tasks, onSwitchProject, onUpdateTask, onNavigate,
  isMobile, onOpenDrawer, showToast,
}: TaskBoardProps) {
  const [filterRole, setFilterRole] = useState<TaskRole | "all">("all");
  const [onlyRisk, setOnlyRisk] = useState(false);

  const visibleRoles = filterRole === "all" ? TASK_ROLES : [filterRole];

  const projectTasks = useMemo(
    () => tasks.filter(t => t.projectId === currentProject.id && (!onlyRisk || isOverdue(t) || t.status === "有风险")),
    [tasks, currentProject.id, onlyRisk],
  );

  const tasksByRole = useMemo(() => {
    const map: Record<TaskRole, Task[]> = Object.fromEntries(TASK_ROLES.map(r => [r, [] as Task[]])) as Record<TaskRole, Task[]>;
    projectTasks.forEach(t => map[t.role].push(t));
    TASK_ROLES.forEach(r => {
      map[r].sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline));
    });
    return map;
  }, [projectTasks]);

  const toolbar = (
    <>
      <button
        onClick={() => onNavigate("control.publish")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
        style={{ background: "#F4C542", border: "1px solid #E0B232", cursor: "pointer", fontSize: 12, color: "#141414", fontWeight: 600 }}
      >
        <Plus size={13} /> 发布任务
      </button>
      <button
        onClick={() => setOnlyRisk(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
        style={{
          background: onlyRisk ? "#FFE8E8" : "#FFFFFF",
          border: `1px solid ${onlyRisk ? "#FFCCCC" : "#E8E3D8"}`,
          color: onlyRisk ? "#CC3333" : "#555",
          cursor: "pointer", fontSize: 12, fontWeight: 500,
        }}
      >
        <AlertTriangle size={13} /> 仅看风险
      </button>
    </>
  );

  return (
    <PageShell
      title="任务分发看板"
      breadcrumb="项目总控 / 任务分发"
      description="按 7 个岗位分列展示当前项目所有任务"
      isMobile={isMobile}
      onOpenDrawer={onOpenDrawer}
      showProjectBar
      projects={projects}
      currentProject={currentProject}
      onSwitchProject={onSwitchProject}
      toolbar={toolbar}
    >
      {/* Role filter chips */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: "#FFFFFF", border: "1px solid #E8E3D8", fontSize: 11, color: "#777", flexShrink: 0 }}>
          <Filter size={11} /> 岗位
        </span>
        <RoleChip active={filterRole === "all"} label="全部" onClick={() => setFilterRole("all")} />
        {TASK_ROLES.map(r => (
          <RoleChip key={r} active={filterRole === r} label={r} role={r} onClick={() => setFilterRole(r)} />
        ))}
      </div>

      {/* Board */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: isMobile
            ? "1fr"
            : `repeat(${visibleRoles.length}, minmax(240px, 1fr))`,
          ...(isMobile ? {} : { overflowX: "auto" }),
        }}
      >
        {visibleRoles.map(role => (
          <RoleColumn
            key={role}
            role={role}
            tasks={tasksByRole[role]}
            onUpdateTask={onUpdateTask}
            showToast={showToast}
          />
        ))}
      </div>
    </PageShell>
  );
}

function RoleChip({ active, label, role, onClick }: { active: boolean; label: string; role?: TaskRole; onClick: () => void }) {
  const c = role ? ROLE_COLOR[role] : { bg: "#FFF9E6", border: "#F4C542", text: "#8A6500" };
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-full flex-shrink-0"
      style={{
        background: active ? c.bg : "#FFFFFF",
        border: `1px solid ${active ? c.border : "#E8E3D8"}`,
        color: active ? c.text : "#555",
        fontSize: 11, fontWeight: active ? 600 : 500, cursor: "pointer", whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function RoleColumn({
  role, tasks, onUpdateTask, showToast,
}: { role: TaskRole; tasks: Task[]; onUpdateTask: (id: string, patch: Partial<Task>) => void; showToast: (m: string) => void }) {
  const c = ROLE_COLOR[role];
  const doneCount = tasks.filter(t => t.status === "已完成" || t.status === "已定稿").length;
  return (
    <div
      className="rounded-2xl flex flex-col"
      style={{ background: "#FAFAF8", border: "1px solid #EDE9DF", minHeight: 200 }}
    >
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ borderBottom: `1px solid ${c.border}`, background: c.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{role}</span>
        <span style={{ fontSize: 11, color: c.text, fontWeight: 600 }}>{doneCount}/{tasks.length}</span>
      </div>
      <div className="p-2 flex flex-col gap-2">
        {tasks.length === 0 ? (
          <div style={{ fontSize: 11, color: "#AAAAAA", padding: "16px 0", textAlign: "center" }}>暂无任务</div>
        ) : (
          tasks.map(t => <TaskCard key={t.id} task={t} onUpdateTask={onUpdateTask} showToast={showToast} />)
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task, onUpdateTask, showToast,
}: { task: Task; onUpdateTask: (id: string, patch: Partial<Task>) => void; showToast: (m: string) => void }) {
  const status = effectiveStatus(task);
  const s = STATUS_STYLES[status];
  const p = PRIORITY_STYLES[task.priority];
  const days = daysUntil(task.deadline);
  const overdue = isOverdue(task);

  const remind = () => showToast(`已催办「${task.name}」`);
  const markRisk = () => {
    onUpdateTask(task.id, { status: task.status === "有风险" ? "进行中" : "有风险" });
    showToast(task.status === "有风险" ? "已解除风险标记" : "已标记为风险");
  };
  const review = () => {
    onUpdateTask(task.id, { status: "已定稿" });
    showToast(`「${task.name}」已通过`);
  };

  return (
    <div className="rounded-xl p-2.5" style={{ background: "#FFFFFF", border: `1px solid ${overdue ? "#FF9999" : "#EDE9DF"}` }}>
      <div className="flex items-start gap-1.5 mb-1.5">
        {task.isKey && (
          <span style={{ fontSize: 9, color: "#8A6500", background: "#FFF4C7", border: "1px solid #F4D060", borderRadius: 4, padding: "1px 4px", fontWeight: 700, flexShrink: 0 }}>
            关键
          </span>
        )}
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#141414", flex: 1, lineHeight: 1.35 }}>{task.name}</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span style={{ fontSize: 10, color: "#777" }}>{task.owner}</span>
        <span style={{ fontSize: 10, color: overdue ? "#CC3333" : days <= 2 ? "#8A6500" : "#999", fontWeight: overdue ? 600 : 500 }}>
          {overdue ? `逾期 ${-days}天` : days === 0 ? "今天截止" : `${days}天后`}
        </span>
        <span style={{ fontSize: 9, background: p.bg, border: `1px solid ${p.border}`, color: p.text, borderRadius: 4, padding: "1px 4px", fontWeight: 600 }}>
          {task.priority}
        </span>
      </div>

      <div className="flex items-center justify-between gap-1.5">
        <span style={{ fontSize: 10, background: s.bg, border: `1px solid ${s.border}`, color: s.text, borderRadius: 4, padding: "2px 6px", fontWeight: 600 }}>
          {status}
        </span>
        <div className="flex items-center gap-1">
          {status === "待审核" && (
            <IconBtn icon={FileCheck2} title="审核通过" onClick={review} accent />
          )}
          <IconBtn icon={Bell} title="催办" onClick={remind} />
          <IconBtn icon={AlertTriangle} title={task.status === "有风险" ? "解除风险" : "标记风险"} onClick={markRisk} danger={task.status === "有风险"} />
        </div>
      </div>
    </div>
  );
}

function IconBtn({ icon: Icon, title, onClick, accent, danger }: { icon: any; title: string; onClick: () => void; accent?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-md"
      style={{
        width: 22, height: 22,
        background: accent ? "#FFF9E6" : danger ? "#FFE8E8" : "#F8F6EF",
        border: `1px solid ${accent ? "#F4D060" : danger ? "#FFCCCC" : "#E8E3D8"}`,
        color: accent ? "#8A6500" : danger ? "#CC3333" : "#555",
        cursor: "pointer",
      }}
    >
      <Icon size={11} />
    </button>
  );
}
