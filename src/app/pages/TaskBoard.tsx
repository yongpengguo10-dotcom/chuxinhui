import { useEffect, useMemo, useRef, useState } from "react";
import { Project, daysUntil } from "../data/projects";
import { Task, TASK_ROLES, TaskPriority, TaskRole, TaskStatus } from "../data/tasks";
import {
  effectiveStatus,
  getBlockingDependencies,
  isBlocked,
  isDoneStatus,
  isOverdue,
  priorityStyle,
  roleColor,
  statusStyle,
} from "../lib/taskUtils";
import { buildTaskChain, sortChain } from "../lib/taskChain";
import { PageShell } from "../components/PageShell";
import { DateTimePicker } from "../components/DateTimePicker";
import { NavKey } from "../components/Sidebar";
import { TaskChainDialog } from "../components/TaskChainDialog";
import { formatWeekDateTime } from "../lib/dateFormat";

interface TaskBoardProps {
  projects: Project[];
  currentProject: Project;
  tasks: Task[];
  onSwitchProject: (p: Project) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onNavigate: (key: NavKey) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
  showToast: (msg: string) => void;
}

type RoleFilter = TaskRole | "all";
type StatusFilter = TaskStatus | "all";
type PriorityFilter = TaskPriority | "all";

const STATUS_FILTERS: StatusFilter[] = ["all", "未开始", "进行中", "等待前置任务", "待审核", "已完成", "已定稿", "有风险", "已逾期"];
const PRIORITY_FILTERS: PriorityFilter[] = ["all", "普通", "重要", "紧急"];

const ROLE_ICONS: Record<TaskRole, string> = {
  "招商": "fi fi-rr-user-add",
  "设计": "fi fi-rr-palette",
  "文案": "fi fi-rr-document",
  "短视频": "fi fi-rr-video-camera-alt",
  "运营": "fi fi-rr-chart-histogram",
  "客服": "fi fi-rr-headset",
  "现场执行": "fi fi-rr-marker",
};

function Flaticon({ name }: { name: string }) {
  return <i className={name} aria-hidden="true" />;
}

export function TaskBoard({
  projects, currentProject, tasks, onSwitchProject, onUpdateTask, onNavigate,
  onDeleteTask, isMobile, onOpenDrawer, showToast,
}: TaskBoardProps) {
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortMode, setSortMode] = useState<"deadline" | "priority">("deadline");
  const [onlyRisk, setOnlyRisk] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedRole, setExpandedRole] = useState<TaskRole | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const projectTasks = useMemo(
    () => tasks.filter(task => task.projectId === currentProject.id),
    [tasks, currentProject.id],
  );

  const boardTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projectTasks
      .filter(task => roleFilter === "all" || task.role === roleFilter)
      .filter(task => priorityFilter === "all" || task.priority === priorityFilter)
      .filter(task => {
        const status = effectiveStatus(task, projectTasks);
        return statusFilter === "all" || status === statusFilter;
      })
      .filter(task => !onlyRisk || isRiskTask(task, projectTasks))
      .filter(task => !q || `${task.name}${task.owner}${task.role}`.toLowerCase().includes(q));
  }, [projectTasks, roleFilter, priorityFilter, statusFilter, onlyRisk, query]);

  const realProjectRoles = useMemo(
    () => TASK_ROLES.filter(role => projectTasks.some(task => task.role === role)),
    [projectTasks],
  );
  const roles = roleFilter === "all" ? realProjectRoles : realProjectRoles.filter(role => role === roleFilter);

  const updateRoleScrollButtons = () => {
    const el = boardScrollRef.current;
    if (!el || isMobile || roles.length <= 5) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const timer = window.setTimeout(updateRoleScrollButtons, 0);
    window.addEventListener("resize", updateRoleScrollButtons);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateRoleScrollButtons);
    };
  }, [roles.length, isMobile]);

  const tasksByRole = useMemo(() => {
    const map = Object.fromEntries(TASK_ROLES.map(role => [role, [] as Task[]])) as Record<TaskRole, Task[]>;
    boardTasks.forEach(task => map[task.role].push(task));
    TASK_ROLES.forEach(role => {
      map[role].sort((a, b) => {
        if (sortMode === "priority") return priorityRank(b.priority) - priorityRank(a.priority) || daysUntil(a.deadline) - daysUntil(b.deadline);
        return daysUntil(a.deadline) - daysUntil(b.deadline) || priorityRank(b.priority) - priorityRank(a.priority);
      });
    });
    return map;
  }, [boardTasks, sortMode]);

  const stats = useMemo(() => {
    const total = projectTasks.length;
    const done = projectTasks.filter(task => isDoneStatus(task.status)).length;
    const active = projectTasks.filter(task => effectiveStatus(task, projectTasks) === "进行中").length;
    const review = projectTasks.filter(task => effectiveStatus(task, projectTasks) === "待审核").length;
    const overdue = projectTasks.filter(task => isOverdue(task)).length;
    const risk = projectTasks.filter(task => isRiskTask(task, projectTasks)).length;
    const today = projectTasks.filter(task => {
      const days = daysUntil(task.deadline);
      return days >= 0 && days <= 1 && !isDoneStatus(task.status);
    }).length;
    return { total, done, active, review, overdue, risk, today };
  }, [projectTasks]);

  const projectDays = daysUntil(currentProject.date);
  const projectStatusText = `${projectDays >= 0 ? `距离开始 ${projectDays} 天` : `已结束 ${Math.abs(projectDays)} 天`} · ${currentProject.phase}`;
  const calendarDate = currentProject.date;

  const toolbar = (
    <>
      <button className="board-ghost-button" onClick={() => showToast("看板设置入口已预留")}>
        <Flaticon name="fi fi-rr-settings-sliders" /> 看板设置
      </button>
      <button className="board-ghost-button" onClick={() => showToast("已生成当前看板导出数据")}>
        <Flaticon name="fi fi-rr-download" /> 导出看板
      </button>
      <button className="board-ghost-button board-risk-button" onClick={() => {
        setOnlyRisk(true);
        showToast("已切换为只看风险任务");
      }}>
        <Flaticon name="fi fi-rr-triangle-warning" /> 风险任务
        {stats.risk > 0 && <span>{stats.risk}</span>}
      </button>
      <button className="board-primary-button" onClick={() => showToast("更多操作入口已预留")}>
        查看更多
      </button>
    </>
  );

  return (
    <PageShell
      title="任务看板"
      breadcrumb=""
      description="按岗位查看任务分布与进度，统一管理与调整任务"
      isMobile={isMobile}
      onOpenDrawer={onOpenDrawer}
      toolbar={toolbar}
    >
      <style>{boardCss}</style>

      <div className="task-board-page">
        <section className="board-project-strip">
          <div className="project-strip-left">
            <button className="project-back-button" onClick={() => onNavigate("overview")} title="返回项目总览">
              <Flaticon name="fi fi-rr-arrow-small-left" />
            </button>
            <div className="project-strip-copy">
              <h2>{currentProject.fullName}</h2>
              <p>{projectStatusText}</p>
            </div>
          </div>
          <div className="project-strip-meta">
            <span><Flaticon name="fi fi-rr-user" /> {currentProject.owner}</span>
            <span><Flaticon name="fi fi-rr-target" /> {currentProject.goals}</span>
          </div>
          <ProjectSwitchSelect
            projects={projects}
            currentProject={currentProject}
            onSwitchProject={onSwitchProject}
          />
        </section>

        <div className="board-stats">
          <MetricCard label="全部任务" value={stats.total} />
          <MetricCard label="已完成" value={stats.done} pct={percent(stats.done, stats.total)} tone="green" ring />
          <MetricCard label="进行中" value={stats.active} pct={percent(stats.active, stats.total)} tone="blue" ring />
          <MetricCard label="待审核" value={stats.review} pct={percent(stats.review, stats.total)} tone="amber" ring />
          <MetricCard label="已逾期" value={stats.overdue} pct={percent(stats.overdue, stats.total)} tone="red" ring />
          <MetricCard label="今日更新" value={stats.today} suffix="任务" />
          <MetricCard label="查看日历" value={calendarDate} date icon="fi fi-rr-calendar" />
        </div>

        <div className="board-filters">
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)}>
            {STATUS_FILTERS.map(status => <option key={status} value={status}>{status === "all" ? "全部状态" : status}</option>)}
          </select>
          <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value as PriorityFilter)}>
            {PRIORITY_FILTERS.map(priority => <option key={priority} value={priority}>{priority === "all" ? "全部优先级" : priority}</option>)}
          </select>
          <div className="board-search">
            <Flaticon name="fi fi-rr-search" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索任务或负责人" />
          </div>
          <label className="board-risk-toggle">
            <input type="checkbox" checked={onlyRisk} onChange={event => setOnlyRisk(event.target.checked)} />
            只看风险任务
          </label>
          <div className="board-filter-spacer" />
          <select value={sortMode} onChange={event => setSortMode(event.target.value as "deadline" | "priority")}>
            <option value="deadline">按截止时间</option>
            <option value="priority">按优先级</option>
          </select>
          <button className="board-icon-button" onClick={() => showToast("筛选条件已应用")} title="筛选">
            <Flaticon name="fi fi-rr-filter" />
          </button>
          <button className="board-icon-button" onClick={() => {
            setRoleFilter("all");
            setStatusFilter("all");
            setPriorityFilter("all");
            setOnlyRisk(false);
            setQuery("");
          }} title="重置">
            <Flaticon name="fi fi-rr-refresh" />
          </button>
        </div>

        <div className="role-tabs-shell">
          <button className="role-tab-scroll" onClick={() => boardScrollRef.current?.scrollBy({ left: -360, behavior: "smooth" })} title="向左查看岗位">
            <Flaticon name="fi fi-rr-angle-small-left" />
          </button>
          <div className="role-tabs">
            <button
              className={`role-tab ${roleFilter === "all" ? "is-active" : ""}`}
              onClick={() => setRoleFilter("all")}
              type="button"
            >
              <Flaticon name="fi fi-rr-apps" />
              <span>全部岗位</span>
              <b>{projectTasks.length} 任务</b>
            </button>
            {realProjectRoles.map(role => (
              <button
                key={role}
                className={`role-tab ${roleFilter === role ? "is-active" : ""}`}
                onClick={() => setRoleFilter(role)}
                type="button"
              >
                <Flaticon name={ROLE_ICONS[role]} />
                <span>{role}</span>
                <b>{projectTasks.filter(task => task.role === role).length} 任务</b>
              </button>
            ))}
          </div>
          <button className="role-tab-scroll" onClick={() => boardScrollRef.current?.scrollBy({ left: 360, behavior: "smooth" })} title="向右查看岗位">
            <Flaticon name="fi fi-rr-angle-small-right" />
          </button>
        </div>

        <div className="role-board-shell">
          {canScrollLeft && (
            <button className="role-scroll-button left" onClick={() => boardScrollRef.current?.scrollBy({ left: -430, behavior: "smooth" })} title="向左查看">
              <Flaticon name="fi fi-rr-angle-small-left" />
            </button>
          )}
          <div
            ref={boardScrollRef}
            className="role-board"
            onScroll={updateRoleScrollButtons}
            style={{ gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.max(roles.length, 1)}, minmax(248px, 1fr))` }}
          >
            {roles.length === 0 ? (
              <div className="board-empty-state">
                当前筛选下没有可展示的真实岗位任务
              </div>
            ) : roles.map(role => (
              <RoleLane
                key={role}
                role={role}
                tasks={tasksByRole[role]}
                allTasks={projectTasks}
                roleTotal={projectTasks.filter(task => task.role === role).length}
                onUpdateTask={onUpdateTask}
                onEditTask={setEditingTask}
                onDeleteTask={onDeleteTask}
                onNavigate={onNavigate}
                onShowMore={() => setExpandedRole(role)}
                onOpenTask={setSelectedTask}
                showToast={showToast}
              />
            ))}
          </div>
          {canScrollRight && (
            <button className="role-scroll-button right" onClick={() => boardScrollRef.current?.scrollBy({ left: 430, behavior: "smooth" })} title="向右查看">
              <Flaticon name="fi fi-rr-angle-small-right" />
            </button>
          )}
        </div>

      </div>

      {expandedRole && (
        <RoleTasksModal
          role={expandedRole}
          tasks={tasksByRole[expandedRole]}
          allTasks={projectTasks}
          onUpdateTask={onUpdateTask}
          onEditTask={setEditingTask}
          onDeleteTask={onDeleteTask}
          showToast={showToast}
          onOpenTask={setSelectedTask}
          onClose={() => setExpandedRole(null)}
        />
      )}

      {selectedTask && (
        <TaskChainDialog
          currentTask={selectedTask}
          projectTasks={projectTasks}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={patch => {
            onUpdateTask(editingTask.id, patch);
            setEditingTask(null);
            showToast("任务信息已更新");
          }}
        />
      )}
    </PageShell>
  );
}

function RoleLane({
  role, tasks, allTasks, roleTotal, onUpdateTask, onEditTask, onDeleteTask, onNavigate, onShowMore, onOpenTask, showToast,
}: {
  role: TaskRole;
  tasks: Task[];
  allTasks: Task[];
  roleTotal: number;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onNavigate: (key: NavKey) => void;
  onShowMore: () => void;
  onOpenTask: (task: Task) => void;
  showToast: (m: string) => void;
}) {
  const color = roleColor(role);
  const done = allTasks.filter(task => task.role === role && isDoneStatus(task.status)).length;
  const pct = percent(done, roleTotal);
  return (
    <section className="role-lane" style={{ ["--role-bg" as string]: color.bg, ["--role-border" as string]: color.border, ["--role-text" as string]: color.text }}>
      <div className="role-lane-title">
        <div>
          <span>{role}</span>
          <b>{roleTotal} 任务</b>
        </div>
        <strong>{pct}%</strong>
      </div>
      <div className="role-progress-track">
        <span style={{ width: `${pct}%`, background: color.text }} />
      </div>
      <div className="role-task-list">
        {tasks.length === 0 ? (
          <div className="empty-lane">暂无任务</div>
        ) : tasks.slice(0, 4).map(task => (
          <TaskCard
            key={task.id}
            task={task}
            allTasks={allTasks}
            onUpdateTask={onUpdateTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onOpenTask={onOpenTask}
            showToast={showToast}
          />
        ))}
      </div>
      {tasks.length > 4 && (
        <button className="lane-more-button" onClick={onShowMore}>
          查看更多 {tasks.length - 4} 个
        </button>
      )}
      <button className="lane-add-button" onClick={() => onNavigate("control.publish")}>+ 新建任务</button>
    </section>
  );
}

function RoleTasksModal({
  role,
  tasks,
  allTasks,
  onUpdateTask,
  onEditTask,
  onDeleteTask,
  showToast,
  onOpenTask,
  onClose,
}: {
  role: TaskRole;
  tasks: Task[];
  allTasks: Task[];
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  showToast: (m: string) => void;
  onOpenTask: (task: Task) => void;
  onClose: () => void;
}) {
  const color = roleColor(role);
  return (
    <div className="role-modal-backdrop" onClick={onClose}>
      <div className="role-modal" onClick={event => event.stopPropagation()}>
        <div className="role-modal-header" style={{ background: `linear-gradient(90deg, ${color.bg}, #ffffff)` }}>
          <div>
            <h3>{role}任务</h3>
            <p>共 {tasks.length} 个任务，按当前看板筛选和排序展示。</p>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="role-modal-body">
          {tasks.length === 0 ? (
            <div className="panel-empty">暂无任务</div>
          ) : (
            tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                allTasks={allTasks}
                onUpdateTask={onUpdateTask}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onOpenTask={onOpenTask}
                showToast={showToast}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task, allTasks, onUpdateTask, onEditTask, onDeleteTask, onOpenTask, showToast,
}: {
  task: Task;
  allTasks: Task[];
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onOpenTask: (task: Task) => void;
  showToast: (m: string) => void;
}) {
  const status = effectiveStatus(task, allTasks);
  const statusColors = statusStyle(status);
  const priorityColors = priorityStyle(task.priority);
  const blockers = getBlockingDependencies(task, allTasks);
  const days = daysUntil(task.deadline);

  const markRisk = () => {
    const nextStatus = task.status === "有风险" ? "进行中" : "有风险";
    onUpdateTask(task.id, { status: nextStatus });
    showToast(nextStatus === "有风险" ? "已标记为风险任务" : "已解除风险标记");
  };

  const approve = () => {
    onUpdateTask(task.id, { status: task.resultType === "图片" ? "已定稿" : "已完成", reviewedAt: new Date().toISOString() });
    showToast(`已通过「${task.name}」`);
  };

  return (
    <article className="board-task-card" onClick={() => onOpenTask(task)}>
      <div className="task-title-row">
        <span className="task-title">{task.name}</span>
        {task.isKey && <span className="key-dot">关键</span>}
      </div>

      <div className="task-meta-row">
        <span className="avatar"><Flaticon name="fi fi-rr-user" /></span>
        <span>{task.owner}</span>
        <span className="priority-pill" style={{ background: priorityColors.bg, borderColor: priorityColors.border, color: priorityColors.text }}>
          {task.priority}
        </span>
      </div>
      <div className="task-date-row">
        <Flaticon name="fi fi-rr-calendar" />
        <span>{formatDeadline(task.deadline, days)}</span>
      </div>

      {blockers.length > 0 && (
        <div className="task-blocker">
          <span />
          前置：{blockers.map(item => item.name).join("、")}
        </div>
      )}

      <div className="task-card-footer">
        <span className="status-pill" style={{ background: statusColors.bg, borderColor: statusColors.border, color: statusColors.text }}>
          {status}
        </span>
        <div className="task-actions">
          <SmallIconButton icon="fi fi-rr-edit" title="编辑任务" onClick={() => onEditTask(task)} />
          {status === "待审核" && <SmallIconButton icon="fi fi-rr-clipboard-check" title="审核通过" onClick={approve} accent />}
          <SmallIconButton icon="fi fi-rr-bell" title="催办" onClick={() => showToast(`已催办「${task.name}」`)} />
          <SmallIconButton icon="fi fi-rr-triangle-warning" title="风险标记" onClick={markRisk} danger={task.status === "有风险"} />
          <SmallIconButton icon="fi fi-rr-trash" title="删除任务" onClick={() => onDeleteTask(task.id)} danger />
        </div>
      </div>
    </article>
  );
}

function EditTaskModal({ task, onClose, onSave }: { task: Task; onClose: () => void; onSave: (patch: Partial<Task>) => void }) {
  const [name, setName] = useState(task.name);
  const [role, setRole] = useState<TaskRole>(task.role);
  const [owner, setOwner] = useState(task.owner);
  const [deadline, setDeadline] = useState(task.deadline);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [desc, setDesc] = useState(task.desc ?? "");
  const [needReview, setNeedReview] = useState(task.needReview);
  const [isKey, setIsKey] = useState(task.isKey);

  return (
    <div className="edit-task-backdrop" onClick={onClose}>
      <div className="edit-task-modal" onClick={event => event.stopPropagation()}>
        <div className="edit-task-head">
          <div>
            <h3>编辑任务</h3>
            <p>{task.taskGroupId ? "任务链中的单个步骤，修改后会同步到看板和岗位工作台。" : "单个任务，修改后会同步到看板和岗位工作台。"}</p>
          </div>
          <button onClick={onClose}><Flaticon name="fi fi-rr-cross-small" /></button>
        </div>
        <div className="edit-task-grid">
          <TaskField label="任务名称">
            <input value={name} onChange={event => setName(event.target.value)} />
          </TaskField>
          <TaskField label="负责岗位">
            <select value={role} onChange={event => setRole(event.target.value as TaskRole)}>
              {TASK_ROLES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </TaskField>
          <TaskField label="负责人">
            <input value={owner} onChange={event => setOwner(event.target.value)} />
          </TaskField>
          <TaskField label="截止时间">
            <DateTimePicker value={deadline} onChange={setDeadline} includeTime={deadline.includes("T")} />
          </TaskField>
          <TaskField label="优先级">
            <select value={priority} onChange={event => setPriority(event.target.value as TaskPriority)}>
              {PRIORITY_FILTERS.filter(item => item !== "all").map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </TaskField>
          <TaskField label="任务状态">
            <select value={status} onChange={event => setStatus(event.target.value as TaskStatus)}>
              {STATUS_FILTERS.filter(item => item !== "all").map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </TaskField>
          <TaskField label="任务说明" wide>
            <textarea value={desc} onChange={event => setDesc(event.target.value)} placeholder="补充任务要求、注意事项或交付标准" />
          </TaskField>
          <div className="edit-task-switches">
            <label><input type="checkbox" checked={needReview} onChange={event => setNeedReview(event.target.checked)} /> 需要审核</label>
            <label><input type="checkbox" checked={isKey} onChange={event => setIsKey(event.target.checked)} /> 关键节点</label>
          </div>
        </div>
        <div className="edit-task-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={() => onSave({ name: name.trim() || task.name, role, owner: owner.trim() || "未指定", deadline, priority, status, desc: desc.trim() || undefined, needReview, isKey })}>保存修改</button>
        </div>
      </div>
    </div>
  );
}

function TaskField({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`edit-task-field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function ProjectSwitchSelect({
  projects,
  currentProject,
  onSwitchProject,
}: {
  projects: Project[];
  currentProject: Project;
  onSwitchProject: (p: Project) => void;
}) {
  return (
    <label className="project-switch-select">
      <Flaticon name="fi fi-rr-refresh" />
      <select
        value={currentProject.id}
        onChange={event => {
          const next = projects.find(project => project.id === event.target.value);
          if (next) onSwitchProject(next);
        }}
      >
        {projects.map(project => (
          <option key={project.id} value={project.id}>
            {project.fullName}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({
  label,
  value,
  pct,
  tone,
  icon,
  ring,
  suffix,
  date,
}: {
  label: string;
  value: number | string;
  pct?: number;
  tone?: "green" | "blue" | "amber" | "red";
  icon?: string;
  ring?: boolean;
  suffix?: string;
  date?: boolean;
}) {
  return (
    <div className={`metric-card ${date ? "is-date" : ""}`}>
      <span>{label}</span>
      <div>
        <b>{value}</b>
        {suffix && <small>{suffix}</small>}
        {pct !== undefined && <em className={tone ? `tone-${tone}` : ""}>{pct}%</em>}
        {ring && <i className={`metric-ring ${tone ? `tone-${tone}` : ""}`} style={{ ["--metric-pct" as string]: `${pct ?? 0}%` }} />}
        {icon && <i className="metric-icon"><Flaticon name={icon} /></i>}
      </div>
    </div>
  );
}

function SmallIconButton({ icon, title, onClick, accent, danger }: { icon: string; title: string; onClick: () => void; accent?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={event => {
        event.stopPropagation();
        onClick();
      }}
      className={`small-icon-button ${accent ? "accent" : ""} ${danger ? "danger" : ""}`}
    >
      <Flaticon name={icon} />
    </button>
  );
}

function isRiskTask(task: Task, allTasks: Task[]) {
  return task.status === "有风险" || isOverdue(task) || isBlocked(task, allTasks);
}

function priorityRank(priority: TaskPriority) {
  return priority === "紧急" ? 3 : priority === "重要" ? 2 : 1;
}

function percent(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

function formatDeadline(deadline: string, days: number) {
  const date = formatWeekDateTime(deadline);
  if (days < 0) return `${date} 逾期`;
  return date;
}

const boardCss = `
.task-board-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  color: #111827;
}

.task-board-page .fi {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.board-project-strip {
  display: grid;
  grid-template-columns: minmax(260px, auto) minmax(220px, 1fr) auto;
  align-items: center;
  gap: 18px;
  min-height: 64px;
  padding: 10px 16px;
  background: #ffffff;
  border: 1px solid #e8edf5;
  border-radius: 8px;
}

.project-strip-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.project-back-button {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #ffffff;
  color: #111827;
  cursor: pointer;
}

.project-strip-copy {
  min-width: 0;
}

.project-strip-copy h2 {
  margin: 0;
  color: #111827;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-strip-copy p {
  margin: 3px 0 0;
  color: #667085;
  font-size: 11px;
  font-weight: 700;
}

.project-strip-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: #667085;
  font-size: 11px;
  font-weight: 750;
}

.project-strip-meta span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-switch-select {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding-left: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
}

.project-switch-select select {
  width: 124px;
  height: 34px;
  border: 0;
  outline: 0;
  background-color: transparent;
  color: #111827;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.board-stats {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  background: #ffffff;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  overflow: hidden;
}

.metric-card {
  min-height: 72px;
  padding: 14px 18px;
  border-right: 1px solid #e8edf5;
}

.metric-card:last-child {
  border-right: 0;
}

.metric-card span {
  display: block;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}

.metric-card div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.metric-card b {
  color: #111827;
  font-size: 25px;
  font-weight: 900;
  line-height: 1;
}

.metric-card.is-date b {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0;
}

.metric-card em {
  font-style: normal;
  font-size: 11px;
  font-weight: 800;
}

.metric-card small {
  color: #667085;
  font-size: 12px;
  font-weight: 850;
}

.metric-card .metric-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #f4f7fb;
  color: #667085;
  margin-left: auto;
}

.metric-ring {
  --metric-ring-color: #2563eb;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  margin-left: auto;
  background:
    radial-gradient(circle at center, #ffffff 48%, transparent 50%),
    conic-gradient(var(--metric-ring-color) var(--metric-pct), #e8edf5 0);
}

.metric-ring.tone-green { --metric-ring-color: #22c55e; }
.metric-ring.tone-blue { --metric-ring-color: #3b82f6; }
.metric-ring.tone-amber { --metric-ring-color: #f97316; }
.metric-ring.tone-red { --metric-ring-color: #fb7185; }

.tone-green { color: #16a34a; }
.tone-blue { color: #2563eb; }
.tone-amber { color: #d97706; }
.tone-red { color: #dc2626; }

.board-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.board-filters select,
.board-search {
  height: 36px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #344054;
  font-size: 12px;
  font-weight: 700;
}

.board-filters select {
  padding: 0 30px 0 12px;
}

.board-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  width: 280px;
}

.board-search input {
  border: 0;
  outline: 0;
  width: 100%;
  color: #111827;
  font-size: 12px;
  background: transparent;
}

.board-risk-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.board-filter-spacer {
  flex: 1;
}

.board-icon-button,
.board-ghost-button,
.board-primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 36px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.board-ghost-button .fi,
.board-primary-button .fi,
.board-icon-button .fi {
  font-size: 14px;
}

.board-icon-button {
  width: 36px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #475467;
}

.board-ghost-button {
  padding: 0 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #344054;
}

.board-primary-button {
  padding: 0 18px;
  background: #111827;
  border: 1px solid #111827;
  color: #ffffff;
}

.board-risk-button {
  position: relative;
}

.board-risk-button span {
  position: absolute;
  top: -7px;
  right: -7px;
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border-radius: 999px;
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 900;
  border: 2px solid #ffffff;
}

.role-tabs-shell {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 10px;
}

.role-tabs {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  overflow-x: auto;
  padding: 1px 0 4px;
  scrollbar-width: thin;
}

.role-tab,
.role-tab-scroll {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #111827;
  cursor: pointer;
}

.role-tab {
  min-width: 140px;
  height: 54px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  grid-template-rows: 1fr 1fr;
  column-gap: 10px;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  text-align: left;
  flex: 0 0 auto;
}

.role-tab.is-active {
  border-color: #9aa8bd;
  box-shadow: inset 0 0 0 1px #9aa8bd;
  background: #fbfcfe;
}

.role-tab .fi {
  grid-row: 1 / 3;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 16px;
}

.role-tab span {
  font-size: 13px;
  font-weight: 900;
  line-height: 1.1;
}

.role-tab b {
  color: #667085;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.1;
}

.role-tab-scroll {
  width: 34px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
}

.role-board {
  display: grid;
  gap: 12px;
  min-width: 0;
  width: 100%;
  max-width: none;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding-bottom: 4px;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.role-board-shell {
  position: relative;
  min-width: 0;
  width: 100%;
  overflow: visible;
}

.role-scroll-button {
  position: absolute;
  top: 50%;
  z-index: 10;
  width: 32px;
  height: 52px;
  display: grid;
  place-items: center;
  transform: translateY(-50%);
  border: 1px solid #dbe6f5;
  border-radius: 999px;
  background: rgba(255,255,255,.92);
  color: #1f6feb;
  box-shadow: 0 12px 32px rgba(15,23,42,.14);
  cursor: pointer;
}

.role-scroll-button.left {
  left: -10px;
}

.role-scroll-button.right {
  right: -10px;
}

.role-lane {
  min-width: 248px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  background: #fbfcfe;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  overflow: hidden;
}

.role-lane-title {
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 14px;
  background: #ffffff;
}

.role-lane-title span {
  display: inline-block;
  color: #111827;
  font-size: 14px;
  font-weight: 900;
}

.role-lane-title b {
  margin-left: 8px;
  color: #667085;
  font-size: 11px;
  font-weight: 800;
}

.role-lane-title strong {
  color: #344054;
  font-size: 12px;
  font-weight: 850;
}

.role-progress-track {
  height: 3px;
  margin: 0 14px 12px;
  border-radius: 999px;
  overflow: hidden;
  background: #e8edf5;
}

.role-progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.role-task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  flex: 1;
}

.empty-lane {
  display: grid;
  place-items: center;
  min-height: 120px;
  color: #98a2b3;
  font-size: 12px;
  font-weight: 700;
}

.lane-add-button {
  height: 38px;
  margin: 0 8px 8px;
  border: 0;
  border-top: 1px solid #edf1f7;
  background: #ffffff;
  color: #111827;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.lane-more-button {
  height: 30px;
  margin: 0 8px 6px;
  border: 0;
  background: transparent;
  color: #1f6feb;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.board-task-card {
  background: #ffffff;
  border: 1px solid #e8edf5;
  border-radius: 7px;
  padding: 10px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.03);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.board-task-card:hover {
  border-color: #b9cdf8;
  box-shadow: 0 8px 22px rgba(31, 111, 235, 0.1);
  transform: translateY(-1px);
}

.task-title-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.task-title {
  color: #111827;
  font-size: 12.5px;
  line-height: 1.4;
  font-weight: 900;
  flex: 1;
}

.key-dot {
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 5px;
  background: #fff0f0;
  color: #dc2626;
  font-size: 10px;
  font-weight: 900;
}

.task-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 9px;
  color: #667085;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
}

.task-date-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 7px;
  color: #667085;
  font-size: 11px;
  font-weight: 750;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #344054;
  font-size: 10px;
  font-weight: 900;
  flex-shrink: 0;
}

.priority-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  border: 1px solid;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
}

.priority-pill {
  padding: 2px 5px;
}

.status-pill {
  padding: 4px 7px;
}

.task-blocker {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff7ed;
  color: #9a3412;
  font-size: 10px;
  line-height: 1.5;
  font-weight: 700;
}

.task-blocker span {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #f97316;
  margin-top: 5px;
  flex-shrink: 0;
}

.task-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
}

.task-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.small-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475467;
  cursor: pointer;
}

.small-icon-button .fi {
  font-size: 11px;
}

.board-empty-state {
  min-height: 260px;
  display: grid;
  place-items: center;
  border: 1px dashed #dbe6f5;
  border-radius: 8px;
  background: #ffffff;
  color: #98a2b3;
  font-size: 13px;
  font-weight: 800;
}

.small-icon-button.accent {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #c2410c;
}

.small-icon-button.danger {
  background: #fff0f0;
  border-color: #fecaca;
  color: #dc2626;
}

.panel-empty {
  height: 84px;
  display: grid;
  place-items: center;
  color: #98a2b3;
  font-size: 12px;
  font-weight: 700;
}

.edit-task-backdrop {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(5px);
}

.edit-task-modal {
  width: min(680px, calc(100vw - 32px));
  max-height: calc(100vh - 56px);
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 28px 90px rgba(15, 23, 42, 0.26);
  overflow: hidden;
}

.edit-task-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 22px 14px;
  border-bottom: 1px solid #e8edf5;
}

.edit-task-head h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 950;
}

.edit-task-head p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.edit-task-head button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: #f8fafc;
  color: #667085;
  cursor: pointer;
}

.edit-task-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 18px 22px;
  overflow-y: auto;
}

.edit-task-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.edit-task-field.wide {
  grid-column: 1 / -1;
}

.edit-task-field span {
  color: #334155;
  font-size: 12px;
  font-weight: 900;
}

.edit-task-field input,
.edit-task-field select,
.edit-task-field textarea {
  width: 100%;
  min-height: 38px;
  padding: 9px 11px;
  border: 1px solid #dbe6f5;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  font-size: 13px;
  font-weight: 800;
  outline: none;
}

.edit-task-field textarea {
  min-height: 96px;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}

.edit-task-switches {
  grid-column: 1 / -1;
  display: flex;
  gap: 16px;
  color: #334155;
  font-size: 13px;
  font-weight: 850;
}

.edit-task-switches label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.edit-task-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 22px 20px;
  border-top: 1px solid #e8edf5;
}

.edit-task-actions button {
  height: 38px;
  min-width: 96px;
  border: 1px solid #dbe6f5;
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.edit-task-actions button.primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.role-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.36);
  backdrop-filter: blur(4px);
}

.role-modal {
  width: min(560px, calc(100vw - 32px));
  max-height: min(760px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
  overflow: hidden;
}

.role-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
  border-bottom: 1px solid #e8edf5;
}

.role-modal-header h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 900;
}

.role-modal-header p {
  margin: 5px 0 0;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.role-modal-header button {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #667085;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.role-modal-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.risk-row,
.activity-row {
  display: grid;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  color: #667085;
  font-size: 11px;
}

.risk-row {
  grid-template-columns: 20px minmax(0, 1fr) 44px 70px;
}

.activity-row {
  grid-template-columns: 22px 36px minmax(0, 1fr) 58px;
}

.risk-row span {
  color: #344054;
  font-weight: 900;
}

.risk-row b,
.activity-row em {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #344054;
  font-style: normal;
  font-weight: 800;
}

.risk-row em,
.activity-row b {
  color: #667085;
  font-style: normal;
  font-weight: 700;
}

.risk-row strong {
  color: #f97316;
  font-weight: 900;
  text-align: right;
}

.activity-row strong {
  color: #98a2b3;
  font-weight: 800;
  text-align: right;
}

@media (max-width: 1180px) {
  .board-project-strip {
    grid-template-columns: 1fr auto;
  }

  .project-strip-meta {
    grid-column: 1 / -1;
    order: 3;
  }

  .board-stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .metric-card {
    border-bottom: 1px solid #e8edf5;
  }

  .board-bottom {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .board-project-strip {
    grid-template-columns: 1fr;
  }

  .project-switch-select {
    width: 100%;
  }

  .project-switch-select select {
    width: 100%;
  }

  .project-strip-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .board-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .board-filters {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .board-filters select,
  .board-search {
    flex: 1 1 150px;
  }

  .board-filter-spacer {
    display: none;
  }

  .role-tabs-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .role-tab-scroll {
    display: none;
  }
}
`;
