import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Download,
  Edit3,
  FileCheck2,
  Filter,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
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
const BOARD_ROLES = TASK_ROLES;

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
  const [showAllChains, setShowAllChains] = useState(false);
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

  const roles = roleFilter === "all" ? BOARD_ROLES : [roleFilter];

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

  const chains = useMemo(() => buildChains(projectTasks), [projectTasks]);
  const riskTasks = useMemo(
    () => [...projectTasks].filter(task => isRiskTask(task, projectTasks)).sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline)).slice(0, 5),
    [projectTasks],
  );
  const activities = useMemo(() => buildActivities(projectTasks).slice(0, 5), [projectTasks]);

  const toolbar = (
    <>
      <button className="board-ghost-button" onClick={() => showToast("看板设置入口已预留")}>
        <Settings2 size={14} /> 看板设置
      </button>
      <button className="board-ghost-button" onClick={() => showToast("已生成当前看板导出数据")}>
        <Download size={14} /> 导出看板
      </button>
      <button className="board-primary-button" onClick={() => onNavigate("control.publish")}>
        <Plus size={14} /> 新建任务
      </button>
    </>
  );

  return (
    <PageShell
      title="任务分发看板"
      breadcrumb="项目总控 / 任务分发"
      description="按岗位查看任务分布与进度，统一管理与调整任务"
      isMobile={isMobile}
      onOpenDrawer={onOpenDrawer}
      showProjectBar
      compactProjectBar
      projects={projects}
      currentProject={currentProject}
      onSwitchProject={onSwitchProject}
      toolbar={toolbar}
    >
      <style>{boardCss}</style>

      <div className="task-board-page">
        <div className="board-stats">
          <MetricCard label="全部任务" value={stats.total} />
          <MetricCard label="已完成" value={stats.done} pct={percent(stats.done, stats.total)} tone="green" />
          <MetricCard label="进行中" value={stats.active} pct={percent(stats.active, stats.total)} tone="blue" />
          <MetricCard label="待审核" value={stats.review} pct={percent(stats.review, stats.total)} tone="amber" />
          <MetricCard label="已逾期" value={stats.overdue} pct={percent(stats.overdue, stats.total)} tone="red" />
          <MetricCard label="风险任务" value={stats.risk} />
          <MetricCard label="今日到期" value={stats.today} icon={<CalendarDays size={15} />} />
        </div>

        <div className="board-filters">
          <select value={roleFilter} onChange={event => setRoleFilter(event.target.value as RoleFilter)}>
            <option value="all">全部项目</option>
            {TASK_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)}>
            {STATUS_FILTERS.map(status => <option key={status} value={status}>{status === "all" ? "全部状态" : status}</option>)}
          </select>
          <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value as PriorityFilter)}>
            {PRIORITY_FILTERS.map(priority => <option key={priority} value={priority}>{priority === "all" ? "全部优先级" : priority}</option>)}
          </select>
          <div className="board-search">
            <Search size={14} />
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
            <Filter size={15} />
          </button>
          <button className="board-icon-button" onClick={() => {
            setRoleFilter("all");
            setStatusFilter("all");
            setPriorityFilter("all");
            setOnlyRisk(false);
            setQuery("");
          }} title="重置">
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="role-board-shell">
          {canScrollLeft && (
            <button className="role-scroll-button left" onClick={() => boardScrollRef.current?.scrollBy({ left: -430, behavior: "smooth" })} title="向左查看">
              <ChevronLeftIcon size={17} />
            </button>
          )}
          <div
            ref={boardScrollRef}
            className="role-board"
            onScroll={updateRoleScrollButtons}
            style={{ gridTemplateColumns: isMobile ? "1fr" : `repeat(${roles.length}, 260px)` }}
          >
            {roles.map(role => (
              <RoleLane
                key={role}
                role={role}
                tasks={tasksByRole[role]}
                allTasks={projectTasks}
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
              <ChevronRightIcon size={17} />
            </button>
          )}
        </div>

        <div className="board-bottom">
          <ChainPanel chains={chains} allTasks={projectTasks} onShowAll={() => setShowAllChains(true)} />
          <RiskPanel tasks={riskTasks} allTasks={projectTasks} />
          <ActivityPanel activities={activities} />
        </div>
      </div>

      {showAllChains && (
        <AllChainsModal
          chains={chains}
          allTasks={projectTasks}
          onClose={() => setShowAllChains(false)}
        />
      )}

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
        <TaskChainModal
          task={selectedTask}
          allTasks={projectTasks}
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
  role, tasks, allTasks, onUpdateTask, onEditTask, onDeleteTask, onNavigate, onShowMore, onOpenTask, showToast,
}: {
  role: TaskRole;
  tasks: Task[];
  allTasks: Task[];
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onNavigate: (key: NavKey) => void;
  onShowMore: () => void;
  onOpenTask: (task: Task) => void;
  showToast: (m: string) => void;
}) {
  const color = roleColor(role);
  return (
    <section className="role-lane" style={{ ["--role-bg" as string]: color.bg, ["--role-border" as string]: color.border, ["--role-text" as string]: color.text }}>
      <div className="role-lane-title">
        <span>{role}</span>
        <b>({tasks.length})</b>
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
        <span className="avatar">{task.owner.slice(0, 1)}</span>
        <span>{task.owner}</span>
        <span className="priority-pill" style={{ background: priorityColors.bg, borderColor: priorityColors.border, color: priorityColors.text }}>
          {task.priority}
        </span>
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
          <SmallIconButton icon={Edit3} title="编辑任务" onClick={() => onEditTask(task)} />
          {status === "待审核" && <SmallIconButton icon={FileCheck2} title="审核通过" onClick={approve} accent />}
          <SmallIconButton icon={Bell} title="催办" onClick={() => showToast(`已催办「${task.name}」`)} />
          <SmallIconButton icon={AlertTriangle} title="风险标记" onClick={markRisk} danger={task.status === "有风险"} />
          <SmallIconButton icon={Trash2} title="删除任务" onClick={() => onDeleteTask(task.id)} danger />
        </div>
      </div>
    </article>
  );
}

function ChainPanel({ chains, allTasks, onShowAll }: { chains: Task[][]; allTasks: Task[]; onShowAll: () => void }) {
  const nearestChain = chains[0];
  return (
    <section className="bottom-panel chain-panel">
      <PanelHeader title={`当前阻塞链（${chains.length}条）`} onShowAll={chains.length > 1 ? onShowAll : undefined} />
      {chains.length === 0 ? (
        <div className="panel-empty">当前没有阻塞链路</div>
      ) : nearestChain && (
        <ChainRow chain={nearestChain} allTasks={allTasks} />
      )}
    </section>
  );
}

function ChainRow({
  chain,
  allTasks,
  currentTaskId,
  onOpenResult,
}: {
  chain: Task[];
  allTasks: Task[];
  currentTaskId?: string;
  onOpenResult?: (task: Task) => void;
}) {
  const blockerId = chain.find(task => !isDoneStatus(task.status))?.id;
  return (
    <div className="chain-row">
      {chain.map((task, index) => {
        const status = effectiveStatus(task, allTasks);
        const statusColors = statusStyle(status);
        const isBlocker = task.id === blockerId;
        const done = isDoneStatus(task.status);
        return (
          <div key={task.id} className="chain-node">
            <div
              className={`chain-card ${isBlocker ? "is-blocked" : ""} ${done ? "is-done" : ""} ${done && onOpenResult ? "can-open-result" : ""} ${task.id === currentTaskId ? "is-current" : ""}`}
              onClick={() => {
                if (done && onOpenResult) onOpenResult(task);
              }}
              title={done && onOpenResult ? "查看完成内容" : undefined}
            >
              <span>{task.name}</span>
              <b>{task.owner}</b>
              <em style={{ background: statusColors.bg, borderColor: statusColors.border, color: statusColors.text }}>{status}</em>
            </div>
            {index < chain.length - 1 && <span className="chain-arrow">→</span>}
          </div>
        );
      })}
    </div>
  );
}

function AllChainsModal({ chains, allTasks, onClose }: { chains: Task[][]; allTasks: Task[]; onClose: () => void }) {
  return (
    <div className="chain-modal-backdrop" onClick={onClose}>
      <div className="chain-modal" onClick={event => event.stopPropagation()}>
        <div className="chain-modal-header">
          <div>
            <h3>全部阻塞链</h3>
            <p>按距离交付日期从近到远排列，红框为当前阻塞点。</p>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="chain-modal-body">
          {chains.length === 0 ? (
            <div className="panel-empty">当前没有阻塞链路</div>
          ) : chains.map(chain => (
            <div key={chain.map(task => task.id).join("_")} className="chain-modal-row">
              <ChainRow chain={chain} allTasks={allTasks} />
            </div>
          ))}
        </div>
      </div>
    </div>
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
          <button onClick={onClose}><X size={18} /></button>
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

function TaskChainModal({ task, allTasks, onClose }: { task: Task; allTasks: Task[]; onClose: () => void }) {
  const [resultTask, setResultTask] = useState<Task | null>(null);
  const chain = buildTaskChain(task, allTasks);
  const currentIndex = Math.max(0, chain.findIndex(item => item.id === task.id));
  const blocker = chain.find(item => !isDoneStatus(item.status));
  return (
    <div className="task-chain-backdrop" onClick={onClose}>
      <div className="task-chain-modal" onClick={event => event.stopPropagation()}>
        <div className="task-chain-header">
          <div>
            <h3>{task.name}</h3>
            <p>
              当前位于第 {currentIndex + 1} 步 / 共 {chain.length} 步
              {blocker ? `，当前需要先推进：${blocker.name}` : "，链路已全部完成"}
            </p>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="task-chain-body">
          <ChainRow chain={chain} allTasks={allTasks} currentTaskId={task.id} onOpenResult={setResultTask} />
          <div className="task-chain-legend">
            <span><i className="legend-current" /> 当前任务</span>
            <span><i className="legend-blocked" /> 当前阻塞源</span>
            <span><i className="legend-done" /> 已完成</span>
          </div>
          {resultTask && (
            <CompletedResultPanel task={resultTask} onClose={() => setResultTask(null)} />
          )}
        </div>
      </div>
    </div>
  );
}

function CompletedResultPanel({ task, onClose }: { task: Task; onClose: () => void }) {
  const hasImage = Boolean(task.resultImageUrl);
  const hasText = Boolean(task.resultContent || task.resultNote || task.resultLink || task.resultFileName);
  return (
    <div className="completed-result-panel">
      <div className="completed-result-header">
        <div>
          <h4>{task.name}</h4>
          <p>{task.owner} · {task.resultType || "成果"} · {task.reviewedAt ? "已审核" : "已完成"}</p>
        </div>
        <button onClick={onClose}>收起</button>
      </div>
      {hasImage && <img src={task.resultImageUrl} alt={task.name} />}
      {task.resultContent && (
        <div className="completed-result-content">
          {task.resultContent}
        </div>
      )}
      {task.resultNote && (
        <div className="completed-result-note">
          <b>备注</b>
          <span>{task.resultNote}</span>
        </div>
      )}
      {task.resultFileName && (
        <div className="completed-result-note">
          <b>文件</b>
          <span>{task.resultFileName}</span>
        </div>
      )}
      {task.resultLink && (
        <div className="completed-result-note">
          <b>链接</b>
          <span>{task.resultLink}</span>
        </div>
      )}
      {!hasText && !hasImage && (
        <div className="completed-result-empty">这一步已完成，但暂时没有记录具体成果内容。</div>
      )}
    </div>
  );
}

function RiskPanel({ tasks, allTasks }: { tasks: Task[]; allTasks: Task[] }) {
  return (
    <section className="bottom-panel">
      <PanelHeader title="风险任务 TOP5" />
      {tasks.length === 0 ? (
        <div className="panel-empty">暂无高风险任务</div>
      ) : tasks.map((task, index) => {
        const days = daysUntil(task.deadline);
        const blocked = isBlocked(task, allTasks);
        return (
          <div key={task.id} className="risk-row">
            <span>{index + 1}</span>
            <b>{task.name}</b>
            <em>{task.owner}</em>
            <strong>{blocked ? "前置阻塞" : days < 0 ? `逾期 ${Math.abs(days)} 天` : days === 0 ? "今日到期" : `剩余 ${days} 天`}</strong>
          </div>
        );
      })}
    </section>
  );
}

function ActivityPanel({ activities }: { activities: Array<{ task: Task; text: string; time: string }> }) {
  return (
    <section className="bottom-panel">
      <PanelHeader title="最近操作记录" />
      {activities.map(item => (
        <div key={`${item.task.id}_${item.text}`} className="activity-row">
          <span className="avatar">{item.task.owner.slice(0, 1)}</span>
          <b>{item.task.owner}</b>
          <em>{item.text}</em>
          <strong>{item.time}</strong>
        </div>
      ))}
    </section>
  );
}

function MetricCard({ label, value, pct, tone, icon }: { label: string; value: number; pct?: number; tone?: "green" | "blue" | "amber" | "red"; icon?: React.ReactNode }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <div>
        <b>{value}</b>
        {pct !== undefined && <em className={tone ? `tone-${tone}` : ""}>{pct}%</em>}
        {icon && <i>{icon}</i>}
      </div>
    </div>
  );
}

function PanelHeader({ title, onShowAll }: { title: string; onShowAll?: () => void }) {
  return (
    <div className="panel-header">
      <span>{title}</span>
      {onShowAll && <button onClick={onShowAll}>查看全部 &gt;</button>}
    </div>
  );
}

function SmallIconButton({ icon: Icon, title, onClick, accent, danger }: { icon: any; title: string; onClick: () => void; accent?: boolean; danger?: boolean }) {
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
      <Icon size={11} />
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

function buildChains(tasks: Task[]) {
  const grouped = new Map<string, Task[]>();
  tasks.forEach(task => {
    if (!task.taskGroupId) return;
    const list = grouped.get(task.taskGroupId) ?? [];
    list.push(task);
    grouped.set(task.taskGroupId, list);
  });
  return [...grouped.values()]
    .filter(group => group.length > 1)
    .map(group => sortChain(group))
    .filter(group => group.some(task => effectiveStatus(task, tasks) === "等待前置任务" || task.status === "待审核"))
    .sort((a, b) => chainDeliveryDays(a) - chainDeliveryDays(b));
}

function chainDeliveryDays(chain: Task[]) {
  return Math.min(...chain.map(task => daysUntil(task.deadline)));
}

function buildActivities(tasks: Task[]) {
  return [...tasks]
    .sort((a, b) => daysUntil(a.deadline) - daysUntil(b.deadline))
    .map(task => {
      const status = task.status;
      if (status === "待审核") return { task, text: `提交了成果：${task.name}`, time: "刚刚" };
      if (status === "已完成" || status === "已定稿") return { task, text: `完成任务：${task.name}`, time: "5 分钟前" };
      if (status === "有风险") return { task, text: `标记风险：${task.name}`, time: "20 分钟前" };
      return { task, text: `更新任务：${task.name}`, time: "1 小时前" };
    });
}

const boardCss = `
.task-board-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
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
  font-size: 26px;
  font-weight: 900;
  line-height: 1;
}

.metric-card em {
  font-style: normal;
  font-size: 11px;
  font-weight: 800;
}

.metric-card i {
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
  width: 190px;
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
  background: #1f6feb;
  border: 1px solid #1c63d2;
  color: #ffffff;
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
  min-width: 260px;
  width: 260px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  background: #fbfcfe;
  border: 1px solid var(--role-border);
  border-radius: 8px;
  overflow: hidden;
}

.role-lane-title {
  height: 44px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 14px;
  background: linear-gradient(90deg, var(--role-bg), #ffffff);
  border-bottom: 1px solid #e8edf5;
}

.role-lane-title span,
.role-lane-title b {
  color: var(--role-text);
  font-size: 14px;
  font-weight: 900;
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
  color: #1f6feb;
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

.board-bottom {
  display: grid;
  grid-template-columns: 1.35fr 0.9fr 0.9fr;
  gap: 12px;
}

.bottom-panel {
  min-height: 142px;
  background: #ffffff;
  border: 1px solid #e8edf5;
  border-radius: 8px;
  padding: 14px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.panel-header span {
  color: #344054;
  font-size: 13px;
  font-weight: 900;
}

.panel-header button {
  border: 0;
  background: transparent;
  color: #1f6feb;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.panel-empty {
  height: 84px;
  display: grid;
  place-items: center;
  color: #98a2b3;
  font-size: 12px;
  font-weight: 700;
}

.chain-row {
  display: flex;
  align-items: stretch;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.chain-node {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.chain-card {
  position: relative;
  width: 112px;
  min-height: 82px;
  padding: 10px;
  border-radius: 7px;
  background: #fbfcfe;
  border: 1px solid #e8edf5;
}

.chain-card.is-blocked {
  background: #fff7f7;
  border: 2px solid #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.chain-card.is-done {
  background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
  border: 1px solid #86efac;
  box-shadow: 0 8px 18px rgba(22, 163, 74, 0.08);
}

.chain-card.is-current {
  border: 2px solid #1f6feb;
  box-shadow: 0 0 0 3px rgba(31, 111, 235, 0.12);
}

.chain-card.is-current.is-blocked {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12), 0 0 0 6px rgba(31, 111, 235, 0.1);
}

.chain-card.can-open-result {
  cursor: pointer;
}

.chain-card.can-open-result:hover {
  border-color: #22c55e;
  box-shadow: 0 10px 24px rgba(22, 163, 74, 0.16);
  transform: translateY(-1px);
}

.chain-card span {
  display: block;
  color: #344054;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 900;
  min-height: 30px;
}

.chain-card b {
  display: block;
  margin-top: 6px;
  color: #667085;
  font-size: 11px;
}

.chain-card em {
  display: inline-flex;
  margin-top: 7px;
  border: 1px solid;
  border-radius: 5px;
  padding: 3px 6px;
  font-style: normal;
  font-size: 10px;
  font-weight: 900;
}

.chain-arrow {
  color: #98a2b3;
  font-size: 20px;
  font-weight: 400;
}

.chain-modal-backdrop {
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

.chain-modal {
  width: min(920px, calc(100vw - 32px));
  max-height: min(720px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
  overflow: hidden;
}

.chain-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
  background: #fbfcfe;
  border-bottom: 1px solid #e8edf5;
}

.chain-modal-header h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 900;
}

.chain-modal-header p {
  margin: 5px 0 0;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.chain-modal-header button {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #667085;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.chain-modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px 20px;
  overflow: auto;
}

.chain-modal-row {
  padding: 12px;
  border: 1px solid #e8edf5;
  border-radius: 10px;
  background: #ffffff;
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

.task-chain-backdrop {
  position: fixed;
  inset: 0;
  z-index: 130;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.36);
  backdrop-filter: blur(4px);
}

.task-chain-modal {
  width: min(780px, calc(100vw - 32px));
  max-height: min(620px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
  overflow: hidden;
}

.task-chain-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
  background: #fbfcfe;
  border-bottom: 1px solid #e8edf5;
}

.task-chain-header h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 900;
}

.task-chain-header p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.task-chain-header button {
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

.task-chain-body {
  padding: 20px;
  overflow: auto;
}

.task-chain-body .chain-row {
  padding: 8px 4px 12px;
}

.task-chain-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e8edf5;
  color: #667085;
  font-size: 12px;
  font-weight: 800;
}

.task-chain-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.task-chain-legend i {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  display: inline-block;
}

.legend-current {
  border: 2px solid #1f6feb;
  background: #eff6ff;
}

.legend-blocked {
  border: 2px solid #ef4444;
  background: #fff7f7;
}

.legend-done {
  border: 1px solid #86efac;
  background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
}

.completed-result-panel {
  margin-top: 14px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid #bbf7d0;
  background: linear-gradient(180deg, #f7fef9 0%, #ffffff 100%);
}

.completed-result-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 10px;
}

.completed-result-header h4 {
  margin: 0;
  color: #111827;
  font-size: 14px;
  font-weight: 900;
}

.completed-result-header p {
  margin: 4px 0 0;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.completed-result-header button {
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #86efac;
  background: #ffffff;
  color: #15803d;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.completed-result-panel img {
  width: 100%;
  max-height: 260px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid #dcfce7;
  background: #ffffff;
  margin-bottom: 10px;
}

.completed-result-content {
  white-space: pre-wrap;
  line-height: 1.65;
  padding: 12px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #dcfce7;
  color: #344054;
  font-size: 12px;
  font-weight: 700;
}

.completed-result-note {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 10px;
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e8edf5;
  color: #344054;
  font-size: 12px;
}

.completed-result-note b {
  color: #15803d;
  font-weight: 900;
}

.completed-result-note span {
  overflow-wrap: anywhere;
  line-height: 1.5;
}

.completed-result-empty {
  display: grid;
  place-items: center;
  min-height: 86px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px dashed #bbf7d0;
  color: #667085;
  font-size: 12px;
  font-weight: 800;
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
}
`;
