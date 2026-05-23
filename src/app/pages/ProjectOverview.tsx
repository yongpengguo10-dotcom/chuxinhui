import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, ClipboardList, Clock3, Copy, Download, Edit3, Image as ImageIcon, ImagePlus, Plus, Trash2, Users, X } from "lucide-react";
import { Project } from "../data/projects";
import { TASK_ROLES, Task } from "../data/tasks";
import { effectiveStatus, getBlockingDependencies, isDoneStatus, projectStats, roleColor, statusStyle } from "../lib/taskUtils";
import { buildTaskChain, sortChain } from "../lib/taskChain";
import { formatDisplayDateTime } from "../lib/dateFormat";
import { PageShell } from "../components/PageShell";
import { NavKey } from "../components/Sidebar";
import { ProjectImage } from "./ProjectImageLibrary";

interface ProjectOverviewProps {
  projects: Project[];
  currentProject: Project;
  tasks: Task[];
  projectImages: ProjectImage[];
  onSwitchProject: (p: Project) => void;
  onCreateProject: (p: Omit<Project, "completion" | "riskCount" | "imageCount" | "pendingReviewCount">) => void;
  onUpdateProject: (id: string, patch: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  canCreateProject: boolean;
  showToast: (msg: string) => void;
  onNavigate: (key: NavKey) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
}

const ROLE_OWNERS = ["张三（运营）", "李明（设计）", "王五（文案）", "刘六（短视频）", "陈七（客服）"];
type LatestAsset = { image: ProjectImage; version: ProjectImage["versions"][number] };
const PROJECT_PHASES = ["立项启动", "市场预热", "集中邀约", "活动执行", "活动复盘"];

export function ProjectOverview({
  projects,
  currentProject,
  tasks,
  projectImages,
  onSwitchProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  canCreateProject,
  showToast,
  onNavigate,
  isMobile,
  onOpenDrawer,
}: ProjectOverviewProps) {
  const [now, setNow] = useState(() => new Date());
  const [previewAsset, setPreviewAsset] = useState<LatestAsset | null>(null);
  const [chainTask, setChainTask] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const projectTasks = tasks.filter(task => task.projectId === currentProject.id);
  const stats = projectStats(tasks, currentProject.id);
  const countdown = useMemo(() => getCountdownParts(currentProject.date, now), [currentProject.date, now]);
  const confirmed = Math.max(24, Math.round(projectTasks.length * 7.3));
  const milestones = buildMilestones(currentProject, projectTasks);
  const statusDistribution = buildStatusDistribution(projectTasks);
  const ownerTop = buildOwnerTop(projectTasks);
  const blocking = buildBlockingTargets(projectTasks);
  const deadlineAlerts = projectTasks
    .filter(task => isDeadlineAlert(task, now))
    .sort((a, b) => getDeadlineTime(a.deadline) - getDeadlineTime(b.deadline));
  const riskList = deadlineAlerts.slice(0, 5);
  const latestImages = projectImages
    .filter(image => image.projectId === currentProject.id)
    .flatMap(image => image.versions.map(version => ({ image, version })))
    .sort((a, b) => b.version.uploadTime.localeCompare(a.version.uploadTime))
    .slice(0, 4);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <PageShell
      title=""
      breadcrumb=""
      description=""
      isMobile={isMobile}
      onOpenDrawer={onOpenDrawer}
    >
      <style>{overviewCss}</style>
      <main className="overview-page">
        <div className="overview-page-head">
          <div>
            <span>全员项目看板</span>
            <h1>项目总览</h1>
            <p>查看项目进度、岗位协作、阻塞链路和最新素材</p>
          </div>
          {canCreateProject && (
            <div className="overview-toolbar-actions">
              <button className="ghost" onClick={() => setEditingProject(currentProject)}>
                <Edit3 size={15} /> 编辑项目
              </button>
              <button className="danger" onClick={() => onDeleteProject(currentProject.id)} disabled={projects.length <= 1}>
                <Trash2 size={15} /> 删除项目
              </button>
              <button onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> 创建项目
              </button>
            </div>
          )}
        </div>
        <section className="overview-hero">
          <div className="hero-cover">
            {currentProject.coverUrl ? <img src={currentProject.coverUrl} alt={currentProject.fullName} /> : currentProject.series.slice(0, 1)}
          </div>
          <div className="hero-main">
            <div className="hero-title-row">
              <h1>{currentProject.fullName}</h1>
              <span>进行中</span>
            </div>
            <div className="hero-meta">
              <span><CalendarDays size={14} /> 活动时间：{currentProject.date}</span>
              <span><Clock3 size={14} /> 当前阶段：{currentProject.phase}</span>
              <span><Users size={14} /> 项目负责人：{currentProject.owner}</span>
            </div>
            <div className="hero-people">
              <b>项目成员</b>
              {ROLE_OWNERS.slice(0, 4).map(item => <i key={item}>{item.slice(0, 1)}</i>)}
              <em>+3</em>
            </div>
          </div>
          <div className="hero-project-switcher">
            <button onClick={() => setProjectPickerOpen(open => !open)}>
              <span>{currentProject.fullName}</span>
              <ChevronDown size={15} />
            </button>
            {projectPickerOpen && (
              <div className="project-picker-menu">
                {projects.map(project => (
                  <button
                    key={project.id}
                    className={project.id === currentProject.id ? "active" : ""}
                    onClick={() => {
                      onSwitchProject(project);
                      setProjectPickerOpen(false);
                    }}
                  >
                    <b>{project.fullName}</b>
                    <span>{project.phase} · {formatDisplayDateTime(project.date)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="hero-countdown">
            <p>距离活动开始还有</p>
            <div className="countdown-grid">
              <label><strong>{countdown.days}</strong><span>天</span></label>
              <label><strong>{countdown.hours}</strong><span>时</span></label>
              <label><strong>{countdown.minutes}</strong><span>分</span></label>
              <label><strong>{countdown.seconds}</strong><span>秒</span></label>
            </div>
          </div>
        </section>

        <section className="overview-kpis">
          <MetricCard icon={CheckCircle2} label="整体完成度" value={`${stats.completionPct}%`} sub="较上周 ↑ 12%" color="#2563eb" progress={stats.completionPct} />
          <MetricCard icon={Users} label="已确认客户" value={`${confirmed}人`} sub={`目标 ${Math.max(120, confirmed + 33)} 人`} color="#16a34a" progress={Math.min(100, Math.round((confirmed / Math.max(120, confirmed + 33)) * 100))} />
          <MetricCard icon={ClipboardList} label="待审核成果" value={`${stats.pendingReview}项`} sub="较上周 ↓ 2" color="#f97316" progress={Math.min(100, stats.pendingReview * 12)} />
          <MetricCard icon={AlertTriangle} label="风险任务" value={`${deadlineAlerts.length}项`} sub="12小时内截止" color="#ef4444" progress={Math.min(100, deadlineAlerts.length * 16)} />
        </section>

        <section className="overview-mid-grid">
          <Panel title="项目进度里程碑">
            <div className="milestone-row">
              {milestones.map((item, index) => <Milestone key={item.name} item={item} showLine={index < milestones.length - 1} />)}
            </div>
          </Panel>
          <Panel title="任务状态分布">
            <div className="status-panel">
              <div className="donut" style={{ background: buildDonut(statusDistribution) }}>
                <b>总任务</b>
                <strong>{projectTasks.length}</strong>
              </div>
              <div className="status-legend">
                {statusDistribution.map(item => <LegendRow key={item.label} item={item} total={projectTasks.length} />)}
              </div>
            </div>
          </Panel>
          <Panel title="任务负责人 TOP5" action="›">
            <div className="owner-list">
              {ownerTop.map(item => <OwnerRow key={item.owner} item={item} />)}
            </div>
          </Panel>
        </section>

        <section className="overview-bottom-grid">
          <Panel title="当前阻塞链（关键路径）">
            {blocking.length ? (
              <div className="block-stack">
                {blocking.slice(0, 4).map(task => <BlockRow key={task.id} task={task} tasks={projectTasks} onOpen={() => setChainTask(task)} />)}
              </div>
            ) : <EmptyText text="当前没有被前置任务卡住的事项" />}
          </Panel>
          <Panel title="风险任务预警" action="查看全部 ›" onAction={() => onNavigate("control.risk")}>
            {riskList.length ? (
              <div className="risk-table">
                {riskList.map(task => <RiskRow key={task.id} task={task} />)}
              </div>
            ) : <EmptyText text="当前没有风险任务" />}
          </Panel>
          <Panel title="最新上传素材" action="查看全部 ›" onAction={() => onNavigate("library.project-images")}>
            {latestImages.length ? (
              <div className="latest-grid">
                {latestImages.map(({ image, version }) => (
                  <button key={`${image.id}_${version.id}`} className="latest-card" onClick={() => setPreviewAsset({ image, version })}>
                    <img src={version.url} alt={image.title} />
                    <b>{image.title}</b>
                    <span>{version.versionStr} | {formatDisplayDateTime(version.uploadTime)}</span>
                    <em>{version.status === "approved" ? "已发布" : version.status === "pending" ? "待审核" : "需修改"}</em>
                  </button>
                ))}
              </div>
            ) : <EmptyText text="暂无上传素材" />}
          </Panel>
        </section>
      </main>
      {previewAsset && (
        <AssetPreviewModal
          asset={previewAsset}
          project={currentProject}
          onClose={() => setPreviewAsset(null)}
        />
      )}
      {chainTask && (
        <OverviewTaskChainModal
          task={chainTask}
          allTasks={projectTasks}
          onClose={() => setChainTask(null)}
        />
      )}
      {createOpen && (
        <CreateProjectModal
          projects={projects}
          onClose={() => setCreateOpen(false)}
          onCreate={project => {
            onCreateProject(project);
            setCreateOpen(false);
            showToast(`项目「${project.fullName}」已创建`);
          }}
        />
      )}
      {editingProject && (
        <CreateProjectModal
          projects={projects}
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onUpdate={(id, patch) => {
            onUpdateProject(id, patch);
            setEditingProject(null);
            showToast("项目信息已更新");
          }}
        />
      )}
    </PageShell>
  );
}

function CreateProjectModal({
  projects,
  project,
  onClose,
  onCreate,
  onUpdate,
}: {
  projects: Project[];
  project?: Project;
  onClose: () => void;
  onCreate?: (project: Omit<Project, "completion" | "riskCount" | "imageCount" | "pendingReviewCount">) => void;
  onUpdate?: (id: string, patch: Partial<Project>) => void;
}) {
  const existingSeries = Array.from(new Set(projects.map(project => project.series)));
  const editing = Boolean(project);
  const [series, setSeries] = useState(project?.series ?? existingSeries[0] ?? "");
  const [customSeries, setCustomSeries] = useState("");
  const [name, setName] = useState(project?.name ?? "");
  const [phase, setPhase] = useState(project?.phase ?? "");
  const [startDate, setStartDate] = useState(project?.date ?? "");
  const [endDate, setEndDate] = useState(project?.endDate ?? project?.date ?? "");
  const [owner, setOwner] = useState(project?.owner ?? "");
  const [goals, setGoals] = useState(project?.goals ?? "");
  const [notes, setNotes] = useState(project?.notes ?? "");
  const [coverUrl, setCoverUrl] = useState(project?.coverUrl ?? "");
  const finalSeries = series === "__new__" ? customSeries.trim() : series;
  const canSubmit = Boolean(name.trim() && finalSeries && startDate && endDate && phase);

  const handleCover = async (file: File | undefined) => {
    if (!file) return;
    const next = await resizeProjectCover(file);
    setCoverUrl(next);
  };

  const submit = () => {
    if (!canSubmit) return;
    const cleanName = name.trim();
    const payload = {
      id: `p_${Date.now().toString(36)}`,
      series: finalSeries,
      name: cleanName,
      fullName: `${finalSeries} · ${cleanName}`,
      date: startDate,
      endDate,
      phase,
      owner: owner.trim() || "未指定",
      goals: goals.trim() || "未设置",
      notes: notes.trim() || undefined,
      coverUrl: coverUrl || undefined,
    };
    if (editing && project) {
      onUpdate?.(project.id, payload);
      return;
    }
    onCreate?.(payload);
  };

  return (
    <div className="create-project-backdrop" onClick={onClose}>
      <div className="create-project-modal" onClick={event => event.stopPropagation()}>
        <div className="create-project-head">
          <h3>{editing ? "编辑项目" : "创建项目"}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="create-project-grid">
          <ModalField label="项目名称" required hint={`${name.length}/50`}>
            <input value={name} maxLength={50} onChange={event => setName(event.target.value)} placeholder="请输入项目名称（如：暑期训练营活动）" />
          </ModalField>
          <ModalField label="项目阶段">
            <select value={phase} onChange={event => setPhase(event.target.value)}>
              <option value="">请选择当前阶段</option>
              {PROJECT_PHASES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </ModalField>
          <ModalField label="项目封面">
            <label className={`cover-upload ${coverUrl ? "has-image" : ""}`}>
              {coverUrl ? (
                <img src={coverUrl} alt="项目封面" />
              ) : (
                <>
                  <ImagePlus size={34} />
                  <b>点击上传封面图片</b>
                  <span>建议上传竖版封面，系统会压缩为 3:4 竖版预览</span>
                </>
              )}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => handleCover(event.target.files?.[0])} />
            </label>
          </ModalField>
          <ModalField label="项目描述" hint={`${notes.length}/200`}>
            <textarea value={notes} maxLength={200} onChange={event => setNotes(event.target.value)} placeholder="请输入项目简介、目标或者注意信息（选填）" />
          </ModalField>
          <ModalField label="活动时间" required>
            <div className="date-range">
              <input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />
              <span>~</span>
              <input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} />
            </div>
          </ModalField>
          <ModalField label="项目标签">
            <button className="ghost-add" type="button">+ 添加标签</button>
            <small>用于对项目进行分类和快速筛选（选填）</small>
          </ModalField>
          <ModalField label="项目成员">
            <button className="ghost-add" type="button">+ 添加成员</button>
            <small>默认添加你自己为项目负责人</small>
          </ModalField>
          <ModalField label="可见范围">
            <select value="team" disabled>
              <option value="team">团队内成员可见</option>
            </select>
            <small>仅团队成员可查看和参与该项目</small>
          </ModalField>
          <ModalField label="项目系列">
            <select value={series} onChange={event => setSeries(event.target.value)}>
              {existingSeries.map(item => <option key={item} value={item}>{item}</option>)}
              <option value="__new__">+ 新建项目系列</option>
            </select>
            {series === "__new__" && <input value={customSeries} onChange={event => setCustomSeries(event.target.value)} placeholder="输入新的项目系列" />}
          </ModalField>
          <ModalField label="项目目标">
            <input value={goals} onChange={event => setGoals(event.target.value)} placeholder="如：报名80人 · 到场60人 · 成交20人" />
          </ModalField>
          <ModalField label="项目负责人">
            <input value={owner} onChange={event => setOwner(event.target.value)} placeholder="负责人姓名（选填）" />
          </ModalField>
        </div>
        <div className="create-project-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" disabled={!canSubmit} onClick={submit}>{editing ? "保存修改" : "创建项目"}</button>
        </div>
      </div>
    </div>
  );
}

function ModalField({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="modal-field">
      <span>{label}{required && <b>*</b>}{hint && <em>{hint}</em>}</span>
      {children}
    </label>
  );
}

function resizeProjectCover(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 420;
      canvas.height = 560;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas unavailable"));
        return;
      }
      const targetRatio = canvas.width / canvas.height;
      const sourceRatio = img.width / img.height;
      let sx = 0;
      let sy = 0;
      let sw = img.width;
      let sh = img.height;
      if (sourceRatio > targetRatio) {
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetRatio;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

function MetricCard({ icon: Icon, label, value, sub, color, progress }: { icon: any; label: string; value: string; sub: string; color: string; progress: number }) {
  return (
    <section className="metric-card">
      <div className="metric-icon" style={{ background: color }}><Icon size={20} /></div>
      <div>
        <span>{label}</span>
        <b>{value}</b>
        <TrendLine text={sub} />
      </div>
      <i><em style={{ width: `${Math.max(8, Math.min(100, progress))}%`, background: color }} /></i>
    </section>
  );
}

function TrendLine({ text }: { text: string }) {
  const isUp = text.includes("↑");
  const isDown = text.includes("↓");

  if (!isUp && !isDown) {
    return <p className="metric-subtle">{text}</p>;
  }

  const [prefix, value = ""] = text.split(isUp ? "↑" : "↓");

  return (
    <p className={`metric-trend ${isUp ? "is-up" : "is-down"}`}>
      <span>{prefix.trim()}</span>
      <b>{isUp ? "↑" : "↓"}{value.trim()}</b>
    </p>
  );
}

function Panel({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <section className="overview-panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {action && <button onClick={onAction}>{action}</button>}
      </div>
      {children}
    </section>
  );
}

function Milestone({ item, showLine }: { item: { name: string; date: string; status: string }; showLine: boolean }) {
  const done = item.status === "已完成";
  const active = item.status === "进行中";
  return (
    <div className="milestone">
      <div className={`milestone-dot ${done ? "done" : active ? "active" : ""}`}>{done ? "✓" : active ? "!" : "○"}</div>
      {showLine && <div className={`milestone-line ${done ? "done" : ""}`} />}
      <b>{item.name}</b>
      <span>{item.date}</span>
      <em className={done ? "done" : active ? "active" : ""}>{item.status}</em>
    </div>
  );
}

function LegendRow({ item, total }: { item: { label: string; count: number; color: string }; total: number }) {
  return (
    <div className="legend-row">
      <i style={{ background: item.color }} />
      <span>{item.label}</span>
      <b>{item.count}</b>
      <em>{total ? Math.round((item.count / total) * 100) : 0}%</em>
    </div>
  );
}

function OwnerRow({ item }: { item: { owner: string; role: string; done: number; total: number } }) {
  return (
    <div className="owner-row">
      <i>{item.owner.slice(0, 1)}</i>
      <span>{item.owner}（{item.role}）</span>
      <div><em style={{ width: `${item.total ? Math.round((item.done / item.total) * 100) : 0}%` }} /></div>
      <b>{item.done}/{item.total}</b>
    </div>
  );
}

function BlockRow({ task, tasks, onOpen }: { task: Task; tasks: Task[]; onOpen: () => void }) {
  const chain = buildTaskChain(task, tasks);
  const blocker = chain.find(item => !isDoneStatus(item.status)) ?? getBlockingDependencies(task, tasks)[0];
  return (
    <button className="block-row" onClick={onOpen}>
      <div className="block-main">
        <AlertTriangle size={14} />
        <div><b>{cleanTaskName(task.name)}</b><span>{task.role} · {task.owner}</span></div>
        <em>等待中</em>
      </div>
      <div className="block-next">
        <span>当前阻塞岗位</span>
        <i>{blocker?.role || "前置"}</i>
      </div>
    </button>
  );
}

function OverviewTaskChainModal({ task, allTasks, onClose }: { task: Task; allTasks: Task[]; onClose: () => void }) {
  const chain = buildTaskChain(task, allTasks);
  const currentIndex = Math.max(0, chain.findIndex(item => item.id === task.id));
  const blocker = chain.find(item => !isDoneStatus(item.status));
  const blockerIndex = blocker ? chain.findIndex(item => item.id === blocker.id) : -1;

  return (
    <div className="overview-chain-backdrop" onClick={onClose}>
      <div className="overview-chain-modal" onClick={event => event.stopPropagation()}>
        <div className="overview-chain-head">
          <div>
            <h3>{cleanTaskName(task.name)}</h3>
            <p>
              {blocker
                ? `当前卡在第 ${blockerIndex + 1} 步 / 共 ${chain.length} 步：${cleanTaskName(blocker.name)}`
                : `链路已全部完成，共 ${chain.length} 步`}
              {`；当前查看的是第 ${currentIndex + 1} 步：${cleanTaskName(task.name)}`}
            </p>
          </div>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="overview-chain-body">
          {chain.map((item, index) => (
            <ChainStepCard
              key={item.id}
              task={item}
              allTasks={allTasks}
              isCurrent={item.id === task.id}
              isBlocker={item.id === blocker?.id}
              showArrow={index < chain.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChainStepCard({
  task,
  allTasks,
  isCurrent,
  isBlocker,
  showArrow,
}: {
  task: Task;
  allTasks: Task[];
  isCurrent: boolean;
  isBlocker: boolean;
  showArrow: boolean;
}) {
  const status = effectiveStatus(task, allTasks);
  const colors = statusStyle(status);
  const done = isDoneStatus(task.status);
  return (
    <div className="overview-chain-step">
      <article className={`overview-chain-card ${done ? "is-done" : ""} ${isBlocker ? "is-blocker" : ""} ${isCurrent ? "is-current" : ""}`}>
        <div>
          <span>{task.role}</span>
          {isCurrent && <em>当前任务</em>}
        </div>
        <b>{cleanTaskName(task.name)}</b>
        <p>{task.owner} · 截止 {formatDisplayDateTime(task.deadline)}</p>
        <i style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}>{status}</i>
      </article>
      {showArrow && <strong>→</strong>}
    </div>
  );
}

function cleanTaskName(name: string) {
  return name.replace(/协作任务/g, "").replace(/\s{2,}/g, " ").trim();
}

function RiskRow({ task }: { task: Task }) {
  const hours = getHoursUntilDeadline(task.deadline);
  const overdue = hours < 0;
  const label = overdue ? "已逾期" : `剩余 ${Math.max(0, Math.ceil(hours))} 小时`;
  return (
    <div className="risk-row">
      <span>{task.name}</span>
      <b>{task.owner}</b>
      <i className={overdue ? "high" : "mid"}>{label}</i>
    </div>
  );
}

function isDeadlineAlert(task: Task, now: Date) {
  if (isDoneStatus(task.status)) return false;
  const deadline = getDeadlineTime(task.deadline);
  if (!Number.isFinite(deadline)) return false;
  const hours = (deadline - now.getTime()) / 3600000;
  return hours <= 12;
}

function getHoursUntilDeadline(deadline: string) {
  return (getDeadlineTime(deadline) - Date.now()) / 3600000;
}

function getDeadlineTime(deadline: string) {
  const normalized = deadline.includes("T")
    ? deadline
    : deadline.includes(" ")
      ? deadline.replace(" ", "T")
      : `${deadline}T23:59:59+08:00`;
  return new Date(normalized).getTime();
}

function EmptyText({ text }: { text: string }) {
  return <div className="empty-text">{text}</div>;
}

function AssetPreviewModal({ asset, project, onClose }: { asset: LatestAsset; project: Project; onClose: () => void }) {
  const { image, version } = asset;
  const fileName = `${image.title}_${version.versionStr}.png`;

  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = version.url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyImage = async () => {
    try {
      const blob = await (await fetch(version.url)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
    } catch {
      window.alert("当前浏览器不支持直接复制图片，可以先下载图片后使用。");
    }
  };

  return (
    <div className="asset-preview-backdrop" onClick={onClose}>
      <div className="asset-preview-modal" onClick={event => event.stopPropagation()}>
        <button className="asset-close" onClick={onClose}><X size={18} /></button>
        <section className="asset-preview-left">
          <div className="asset-image-frame">
            <img src={version.url} alt={image.title} />
          </div>
        </section>
        <section className="asset-preview-info">
          <h3>{fileName}</h3>
          <InfoRow label="上传时间" value={formatDisplayDateTime(version.uploadTime)} />
          <InfoRow label="上传人" value={version.uploadedBy} />
          <InfoRow label="所属项目" value={project.fullName} />
          <InfoRow label="来源任务" value={version.sourceTask || image.title} />
          <InfoRow label="状态" value={version.status === "approved" ? "已发布" : version.status === "pending" ? "待审核" : "需修改"} />
          <InfoRow label="备注" value={version.notes || "暂无"} />
          <div className="asset-actions">
            <button onClick={downloadImage}><Download size={15} /> 下载图片</button>
            <button className="primary" onClick={copyImage}><Copy size={15} /> 复制图片</button>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="asset-info-row"><span>{label}</span><b>{value}</b></div>;
}

function buildBlockingTargets(tasks: Task[]) {
  const grouped = new Map<string, Task[]>();
  const standalone: Task[] = [];

  tasks.forEach(task => {
    if (!getBlockingDependencies(task, tasks).length) return;
    if (!task.taskGroupId) {
      standalone.push(task);
      return;
    }
    const list = grouped.get(task.taskGroupId) ?? [];
    list.push(task);
    grouped.set(task.taskGroupId, list);
  });

  const groupedTargets = [...grouped.keys()].map(groupId => {
    const chain = sortChain(tasks.filter(task => task.taskGroupId === groupId));
    return [...chain].reverse().find(task => !isDoneStatus(task.status)) ?? chain[chain.length - 1];
  }).filter((task): task is Task => Boolean(task));

  return [...groupedTargets, ...standalone]
    .filter((task, index, list) => list.findIndex(item => item.id === task.id) === index)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
}

function buildMilestones(project: Project, tasks: Task[]) {
  const sorted = [...tasks].sort((a, b) => a.deadline.localeCompare(b.deadline));
  return [
    { name: "宣传方案确认", date: sorted[0] ? formatDisplayDateTime(sorted[0].deadline) : "05-05", status: "已完成" },
    { name: "主视觉设计", date: sorted[1] ? formatDisplayDateTime(sorted[1].deadline) : "05-10", status: "已完成" },
    { name: "物料制作", date: sorted[2] ? formatDisplayDateTime(sorted[2].deadline) : "05-20", status: "进行中" },
    { name: "宣传发布", date: sorted[3] ? formatDisplayDateTime(sorted[3].deadline) : "05-21", status: "未开始" },
    { name: "活动开始", date: formatDisplayDateTime(project.date), status: "未开始" },
  ];
}

function buildStatusDistribution(tasks: Task[]) {
  const statuses = [
    { label: "已完成", color: "#22c55e" },
    { label: "进行中", color: "#2563eb" },
    { label: "待审核", color: "#f97316" },
    { label: "已逾期", color: "#ef4444" },
    { label: "未开始", color: "#94a3b8" },
  ];
  return statuses.map(item => ({
    ...item,
    count: tasks.filter(task => effectiveStatus(task, tasks) === item.label || (item.label === "已完成" && isDoneStatus(task.status))).length,
  }));
}

function buildDonut(items: { count: number; color: string }[]) {
  const total = items.reduce((sum, item) => sum + item.count, 0) || 1;
  let acc = 0;
  const stops = items.map(item => {
    const start = acc;
    acc += (item.count / total) * 100;
    return `${item.color} ${start}% ${acc}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function buildOwnerTop(tasks: Task[]) {
  const map = new Map<string, { owner: string; role: string; done: number; total: number }>();
  tasks.forEach(task => {
    const item = map.get(task.owner) ?? { owner: task.owner, role: task.role, done: 0, total: 0 };
    item.total += 1;
    if (isDoneStatus(task.status)) item.done += 1;
    map.set(task.owner, item);
  });
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
}

function getCountdownParts(date: string, now: Date) {
  const target = new Date(`${date}T09:00:00+08:00`).getTime();
  const diff = Math.max(0, target - now.getTime());
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    days,
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

const overviewCss = `
.overview-page { display: flex; flex-direction: column; gap: 14px; color: #111827; }
.overview-page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding: 2px 0 4px; }
.overview-page-head span { display: block; color: #94a3b8; font-size: 11px; font-weight: 900; letter-spacing: .08em; }
.overview-page-head h1 { margin: 4px 0 0; color: #111827; font-size: 26px; font-weight: 950; line-height: 1; }
.overview-page-head p { margin: 6px 0 0; color: #94a3b8; font-size: 13px; font-weight: 800; }
.overview-toolbar-actions { display: flex; align-items: center; gap: 8px; }
.overview-toolbar-actions button { height: 34px; display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; border: 1px solid #2563eb; border-radius: 9px; background: #2563eb; color: #fff; font-size: 13px; font-weight: 900; cursor: pointer; box-shadow: 0 10px 22px rgba(37,99,235,.16); }
.overview-toolbar-actions button.ghost { border-color: #dbe6f5; background: #fff; color: #334155; box-shadow: none; }
.overview-toolbar-actions button.danger { border-color: #fecaca; background: #fff7f7; color: #dc2626; box-shadow: none; }
.overview-toolbar-actions button:disabled { opacity: .45; cursor: not-allowed; }
.overview-hero { position: relative; z-index: 5; display: grid; grid-template-columns: 104px minmax(300px, 1fr) minmax(170px, 220px) 250px; gap: 20px; align-items: center; padding: 18px; border: 1px solid #dbe6f5; border-radius: 14px; background: linear-gradient(110deg, #f8fbff 0%, #eef4ff 54%, #ede9ff 100%); overflow: visible; }
.overview-hero::after { content: ""; position: absolute; inset: 0 0 0 auto; width: 46%; opacity: .9; background-image: url("data:image/svg+xml,%3Csvg width='560' height='210' viewBox='0 0 560 210' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='302' y='36' width='142' height='116' rx='16' fill='%23C7D2FE' fill-opacity='.65'/%3E%3Crect x='318' y='58' width='110' height='18' rx='5' fill='%238B5CF6' fill-opacity='.42'/%3E%3Crect x='322' y='92' width='24' height='20' rx='6' fill='white' fill-opacity='.78'/%3E%3Crect x='356' y='92' width='24' height='20' rx='6' fill='white' fill-opacity='.78'/%3E%3Crect x='390' y='92' width='24' height='20' rx='6' fill='white' fill-opacity='.78'/%3E%3Crect x='322' y='124' width='24' height='20' rx='6' fill='white' fill-opacity='.65'/%3E%3Crect x='356' y='124' width='24' height='20' rx='6' fill='white' fill-opacity='.65'/%3E%3Ccircle cx='248' cy='130' r='54' fill='%23A5B4FC' fill-opacity='.52'/%3E%3Ccircle cx='248' cy='130' r='40' fill='white' fill-opacity='.72'/%3E%3Cpath d='M248 104v29l22 13' stroke='%237C3AED' stroke-width='8' stroke-linecap='round'/%3E%3Cpath d='M468 58c34 36 28 88-8 122 46-7 78-44 76-91-1-34-27-64-68-31Z' fill='%23DDD6FE' fill-opacity='.88'/%3E%3Cpath d='M204 42c-38 18-58 51-62 93 29-18 50-47 62-93Z' fill='%23DBEAFE' fill-opacity='.78'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right center; background-size: contain; pointer-events: none; }
.overview-hero > * { position: relative; z-index: 1; }
.hero-cover { width: 88px; height: 112px; display: grid; place-items: center; border-radius: 10px; background: #111827; color: #facc15; font-size: 38px; font-weight: 900; box-shadow: 0 18px 40px rgba(15,23,42,.18); overflow: hidden; }
.hero-cover img { width: 100%; height: 100%; object-fit: cover; }
.hero-title-row { display: flex; align-items: center; gap: 10px; }
.hero-title-row h1 { margin: 0; font-size: 22px; font-weight: 900; }
.hero-title-row span { padding: 3px 8px; border-radius: 6px; background: #dbeafe; color: #2563eb; font-size: 12px; font-weight: 900; }
.hero-meta { display: grid; grid-template-columns: repeat(2, minmax(0, max-content)); gap: 8px 20px; margin-top: 14px; color: #475569; font-size: 12px; font-weight: 800; }
.hero-meta span { display: inline-flex; align-items: center; gap: 6px; }
.hero-people { display: flex; align-items: center; gap: 6px; margin-top: 12px; color: #475569; font-size: 12px; font-weight: 800; }
.hero-people i,.hero-people em { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 999px; background: #fff; border: 1px solid #dbe6f5; color: #111827; font-style: normal; font-weight: 900; }
.hero-project-switcher { position: relative; min-width: 0; }
.hero-project-switcher > button { width: 100%; height: 40px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 12px; border: 1px solid #bfdbfe; border-radius: 999px; background: rgba(255,255,255,.86); color: #2563eb; font-size: 13px; font-weight: 950; cursor: pointer; box-shadow: 0 10px 24px rgba(37,99,235,.08); }
.hero-project-switcher > button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.project-picker-menu { position: absolute; top: calc(100% + 8px); right: 0; z-index: 80; width: min(360px, 80vw); max-height: 300px; overflow-y: auto; padding: 8px; border: 1px solid #dbe6f5; border-radius: 12px; background: #fff; box-shadow: 0 22px 70px rgba(15,23,42,.18); }
.project-picker-menu button { width: 100%; display: grid; gap: 5px; padding: 10px; border: 1px solid transparent; border-radius: 10px; background: transparent; text-align: left; cursor: pointer; }
.project-picker-menu button:hover { background: #f8fafc; }
.project-picker-menu button.active { border-color: #bfdbfe; background: #eff6ff; }
.project-picker-menu b { color: #111827; font-size: 13px; font-weight: 950; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.project-picker-menu span { color: #64748b; font-size: 11px; font-weight: 800; }
.hero-countdown { padding: 15px; border: 1px solid rgba(191,219,254,.8); border-radius: 14px; background: rgba(255,255,255,.72); box-shadow: 0 16px 44px rgba(79,70,229,.1); backdrop-filter: blur(8px); }
.hero-countdown p { margin: 0 0 10px; color: #475569; font-size: 13px; font-weight: 900; }
.countdown-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.countdown-grid label { display: grid; gap: 7px; justify-items: center; }
.countdown-grid strong { display: grid; place-items: center; width: 100%; height: 44px; border-radius: 10px; background: rgba(255,255,255,.86); color: #111827; font-size: 24px; font-weight: 900; }
.countdown-grid span { color: #64748b; font-size: 12px; font-weight: 900; letter-spacing: 0; }
.overview-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.metric-card,.overview-panel { background: #fff; border: 1px solid #e6ecf5; border-radius: 12px; box-shadow: 0 8px 24px rgba(15,23,42,.03); }
.metric-card { min-height: 148px; padding: 20px; display: flex; flex-direction: column; }
.metric-icon { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 10px; color: #fff; box-shadow: 0 8px 20px rgba(15,23,42,.16); }
.metric-card span { display: block; margin-top: 14px; color: #475569; font-size: 13px; font-weight: 900; }
.metric-card b { display: block; margin-top: 8px; color: #111827; font-size: 30px; font-weight: 900; }
.metric-card p { margin: 10px 0 0; font-size: 12px; font-weight: 800; }
.metric-subtle { color: #64748b; }
.metric-trend { display: inline-flex; align-items: baseline; gap: 4px; width: fit-content; }
.metric-trend span { display: inline; margin: 0; color: #64748b; font-size: 12px; font-weight: 800; }
.metric-trend b { display: inline; margin: 0; font-size: 13px; font-weight: 950; }
.metric-trend.is-up b { color: #15803d; }
.metric-trend.is-down b { color: #dc2626; }
.metric-card i { display: block; width: 100%; height: 5px; margin-top: auto; border-radius: 999px; background: #e6ecf5; overflow: hidden; }
.metric-card em { display: block; height: 100%; border-radius: inherit; }
.overview-mid-grid { display: grid; grid-template-columns: 1.25fr .9fr .85fr; gap: 12px; }
.overview-bottom-grid { display: grid; grid-template-columns: .9fr 1.05fr 1.35fr; gap: 12px; }
.overview-panel { padding: 16px; min-width: 0; }
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.panel-head h2 { margin: 0; color: #111827; font-size: 15px; font-weight: 900; }
.panel-head button { border: 0; background: transparent; color: #2563eb; font-size: 12px; font-weight: 900; cursor: pointer; }
.milestone-row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.milestone { position: relative; display: grid; justify-items: center; gap: 7px; text-align: center; }
.milestone-dot { z-index: 1; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 999px; background: #e5e7eb; color: #64748b; font-size: 12px; font-weight: 900; }
.milestone-dot.done { background: #22c55e; color: #fff; }
.milestone-dot.active { background: #2563eb; color: #fff; }
.milestone-line { position: absolute; top: 14px; left: 50%; right: -50%; height: 2px; background: #e5e7eb; }
.milestone-line.done { background: #86efac; }
.milestone b { min-height: 32px; color: #111827; font-size: 12px; font-weight: 900; line-height: 1.35; }
.milestone span { color: #64748b; font-size: 11px; font-weight: 800; }
.milestone em { padding: 3px 7px; border-radius: 6px; background: #f1f5f9; color: #64748b; font-size: 11px; font-style: normal; font-weight: 900; }
.milestone em.done { background: #dcfce7; color: #16a34a; }
.milestone em.active { background: #dbeafe; color: #2563eb; }
.status-panel { display: grid; grid-template-columns: 140px 1fr; gap: 14px; align-items: center; }
.donut { width: 136px; height: 136px; display: grid; place-items: center; border-radius: 999px; position: relative; }
.donut::after { content: ""; position: absolute; inset: 34px; border-radius: inherit; background: #fff; }
.donut b,.donut strong { position: relative; z-index: 1; display: block; text-align: center; }
.donut b { align-self: end; color: #64748b; font-size: 12px; }
.donut strong { align-self: start; color: #111827; font-size: 22px; font-weight: 900; }
.status-legend,.owner-list,.block-stack,.risk-table { display: flex; flex-direction: column; gap: 8px; }
.legend-row,.owner-row,.risk-row { display: grid; align-items: center; gap: 8px; color: #334155; font-size: 12px; font-weight: 800; }
.legend-row { grid-template-columns: 8px 1fr auto 38px; }
.legend-row i { width: 8px; height: 8px; border-radius: 999px; }
.legend-row em { color: #64748b; font-style: normal; text-align: right; }
.owner-row { grid-template-columns: 24px minmax(80px,1fr) 90px 34px; }
.owner-row i { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 999px; background: #f1f5f9; font-style: normal; }
.owner-row div { height: 4px; border-radius: 999px; background: #dbeafe; overflow: hidden; }
.owner-row em { display: block; height: 100%; border-radius: inherit; background: #2563eb; }
.owner-row b { text-align: right; }
.block-row { width: 100%; padding: 10px; border-radius: 10px; background: #fff7f7; border: 1px solid #fecaca; text-align: left; cursor: pointer; transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
.block-row:hover { transform: translateY(-1px); border-color: #f87171; box-shadow: 0 10px 24px rgba(239,68,68,.1); }
.block-main,.block-next { display: flex; align-items: center; gap: 8px; }
.block-main svg { color: #ef4444; }
.block-main div { flex: 1; min-width: 0; }
.block-main b,.block-next span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 900; color: #111827; }
.block-main span { color: #64748b; font-size: 11px; font-weight: 800; }
.block-main em,.block-next i { flex-shrink: 0; padding: 3px 7px; border-radius: 6px; background: #fee2e2; color: #dc2626; font-size: 11px; font-style: normal; font-weight: 900; }
.block-next { margin-top: 8px; padding-left: 22px; }
.block-next i { background: #f1f5f9; color: #64748b; }
.risk-row { grid-template-columns: minmax(120px,1fr) 48px 82px; padding: 7px 0; border-bottom: 1px solid #eef2f7; }
.risk-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.risk-row em { color: #dc2626; font-style: normal; }
.risk-row i { padding: 3px 6px; border-radius: 5px; background: #dbeafe; color: #2563eb; font-style: normal; text-align: center; }
.risk-row i.mid { background: #ffedd5; color: #f97316; }
.risk-row i.high { background: #fee2e2; color: #dc2626; }
.latest-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.latest-card { display: block; text-align: left; border: 0; background: transparent; cursor: pointer; min-width: 0; }
.latest-card img { width: 100%; height: 92px; object-fit: cover; border-radius: 8px; background: #111827; }
.latest-card b { display: block; margin-top: 7px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #111827; font-size: 12px; font-weight: 900; }
.latest-card span { display: block; margin-top: 3px; color: #64748b; font-size: 11px; font-weight: 800; }
.latest-card em { display: inline-flex; margin-top: 6px; padding: 3px 7px; border-radius: 6px; background: #dcfce7; color: #16a34a; font-size: 11px; font-style: normal; font-weight: 900; }
.empty-text { min-height: 120px; display: grid; place-items: center; color: #94a3b8; font-size: 13px; font-weight: 900; }
.asset-preview-backdrop { position: fixed; inset: 0; z-index: 220; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(15,23,42,.46); backdrop-filter: blur(5px); }
.asset-preview-modal { position: relative; width: min(760px, calc(100vw - 32px)); display: grid; grid-template-columns: minmax(280px, 1fr) 320px; gap: 28px; padding: 26px; border-radius: 16px; background: #fff; box-shadow: 0 28px 90px rgba(15,23,42,.26); }
.asset-close { position: absolute; right: 14px; top: 14px; width: 32px; height: 32px; border: 0; border-radius: 999px; background: #fff; color: #64748b; cursor: pointer; }
.asset-preview-left { display: flex; flex-direction: column; gap: 12px; }
.asset-image-frame { min-height: 360px; display: grid; place-items: center; padding: 18px; border-radius: 12px; background: #f1f5f9; }
.asset-image-frame img { max-width: 100%; max-height: 420px; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 30px rgba(15,23,42,.14); }
.asset-preview-info { padding-top: 20px; }
.asset-preview-info h3 { margin: 0 0 20px; color: #111827; font-size: 16px; font-weight: 900; }
.asset-info-row { display: grid; grid-template-columns: 72px 1fr; gap: 12px; margin-bottom: 13px; align-items: start; }
.asset-info-row span { color: #64748b; font-size: 12px; font-weight: 800; }
.asset-info-row b { color: #334155; font-size: 12px; font-weight: 900; line-height: 1.5; }
.asset-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 28px; }
.asset-actions button { height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid #bfdbfe; border-radius: 8px; background: #fff; color: #2563eb; font-size: 13px; font-weight: 900; cursor: pointer; }
.asset-actions button.primary { border-color: #2563eb; background: #2563eb; color: #fff; }
.overview-chain-backdrop { position: fixed; inset: 0; z-index: 230; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(15,23,42,.46); backdrop-filter: blur(5px); }
.overview-chain-modal { width: min(860px, calc(100vw - 32px)); max-height: calc(100vh - 64px); overflow: hidden; border-radius: 16px; background: #fff; box-shadow: 0 28px 90px rgba(15,23,42,.26); }
.overview-chain-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px 22px; border-bottom: 1px solid #e6ecf5; }
.overview-chain-head h3 { margin: 0; color: #111827; font-size: 18px; font-weight: 950; }
.overview-chain-head p { margin: 7px 0 0; color: #64748b; font-size: 13px; font-weight: 800; }
.overview-chain-head button { width: 32px; height: 32px; display: grid; place-items: center; border: 0; border-radius: 999px; background: #f8fafc; color: #64748b; cursor: pointer; }
.overview-chain-body { display: flex; align-items: stretch; gap: 10px; padding: 22px; overflow-x: auto; }
.overview-chain-step { display: flex; align-items: center; gap: 10px; flex: 0 0 auto; }
.overview-chain-step > strong { color: #94a3b8; font-size: 18px; }
.overview-chain-card { width: 178px; min-height: 138px; padding: 13px; border: 1px solid #dbe6f5; border-radius: 12px; background: #fbfcfe; }
.overview-chain-card.is-done { border-color: #86efac; background: linear-gradient(180deg, #f0fdf4, #ffffff); }
.overview-chain-card.is-blocker { border: 2px solid #ef4444; background: #fff7f7; box-shadow: 0 12px 26px rgba(239,68,68,.12); }
.overview-chain-card.is-current { outline: 2px solid #2563eb; outline-offset: 2px; }
.overview-chain-card div { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.overview-chain-card span { color: #2563eb; font-size: 12px; font-weight: 950; }
.overview-chain-card em { padding: 2px 6px; border-radius: 999px; background: #dbeafe; color: #2563eb; font-size: 10px; font-style: normal; font-weight: 950; }
.overview-chain-card b { display: block; min-height: 36px; margin-top: 10px; color: #111827; font-size: 13px; font-weight: 950; line-height: 1.35; }
.overview-chain-card p { margin: 8px 0 10px; color: #64748b; font-size: 11px; font-weight: 800; }
.overview-chain-card i { display: inline-flex; padding: 4px 8px; border: 1px solid; border-radius: 999px; font-size: 11px; font-style: normal; font-weight: 950; }
.create-project-backdrop { position: fixed; inset: 0; z-index: 240; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(15,23,42,.42); backdrop-filter: blur(6px); }
.create-project-modal { width: min(760px, calc(100vw - 32px)); max-height: calc(100vh - 52px); display: flex; flex-direction: column; border-radius: 14px; background: #fff; box-shadow: 0 28px 90px rgba(15,23,42,.28); overflow: hidden; }
.create-project-head { display: flex; align-items: center; justify-content: space-between; padding: 22px 28px 12px; }
.create-project-head h3 { margin: 0; color: #111827; font-size: 18px; font-weight: 950; }
.create-project-head button { width: 32px; height: 32px; display: grid; place-items: center; border: 0; border-radius: 999px; background: #fff; color: #64748b; cursor: pointer; }
.create-project-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 34px; padding: 8px 28px 20px; overflow-y: auto; }
.modal-field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.modal-field > span { display: flex; align-items: center; gap: 3px; min-height: 18px; color: #334155; font-size: 12px; font-weight: 950; }
.modal-field > span b { color: #ef4444; }
.modal-field > span em { margin-left: auto; color: #94a3b8; font-size: 11px; font-style: normal; font-weight: 800; }
.modal-field input,.modal-field select,.modal-field textarea { width: 100%; min-height: 38px; border: 1px solid #dbe6f5; border-radius: 8px; background: #fff; color: #111827; font-size: 13px; font-weight: 800; outline: none; padding: 9px 11px; }
.modal-field textarea { min-height: 108px; resize: vertical; font-family: inherit; line-height: 1.5; }
.modal-field small { color: #94a3b8; font-size: 11px; font-weight: 800; }
.cover-upload { width: min(190px, 100%); min-height: 252px; display: grid; place-items: center; justify-self: start; gap: 6px; padding: 16px; border: 1px dashed #cbd5e1; border-radius: 10px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); color: #2563eb; text-align: center; cursor: pointer; overflow: hidden; }
.cover-upload b { color: #334155; font-size: 12px; font-weight: 950; }
.cover-upload span { color: #94a3b8; font-size: 11px; font-weight: 800; line-height: 1.45; }
.cover-upload input { display: none; }
.cover-upload.has-image { padding: 0; border-style: solid; }
.cover-upload img { width: 100%; height: 252px; object-fit: cover; }
.date-range { display: grid; grid-template-columns: 1fr 20px 1fr; align-items: center; gap: 8px; }
.date-range span { text-align: center; color: #94a3b8; font-size: 14px; font-weight: 900; }
.ghost-add { width: fit-content; height: 34px; padding: 0 13px; border: 1px solid #dbeafe; border-radius: 8px; background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 950; cursor: pointer; }
.create-project-actions { display: flex; justify-content: flex-end; gap: 12px; padding: 16px 28px 24px; border-top: 1px solid #eef2f7; }
.create-project-actions button { height: 38px; min-width: 104px; border: 1px solid #dbe6f5; border-radius: 8px; background: #fff; color: #334155; font-size: 13px; font-weight: 950; cursor: pointer; }
.create-project-actions button.primary { border-color: #2563eb; background: #2563eb; color: #fff; }
.create-project-actions button:disabled { border-color: #e2e8f0; background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
@media (max-width: 1180px) { .overview-hero { grid-template-columns: 88px 1fr; } .hero-project-switcher,.hero-countdown { grid-column: 1 / -1; } .overview-kpis,.overview-mid-grid,.overview-bottom-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 760px) { .overview-page-head { align-items: flex-start; flex-direction: column; } .overview-toolbar-actions { flex-wrap: wrap; } .overview-hero,.overview-kpis,.overview-mid-grid,.overview-bottom-grid,.asset-preview-modal,.create-project-grid { grid-template-columns: 1fr; } .hero-cover { width: 80px; height: 96px; } .hero-meta { grid-template-columns: 1fr; } .milestone-row,.latest-grid { grid-template-columns: 1fr 1fr; } .status-panel { grid-template-columns: 1fr; justify-items: center; } .asset-image-frame { min-height: 260px; } .overview-chain-body { flex-direction: column; overflow-y: auto; max-height: calc(100vh - 150px); } .overview-chain-step { flex-direction: column; align-items: stretch; } .overview-chain-step > strong { transform: rotate(90deg); text-align: center; } .overview-chain-card { width: auto; } .create-project-modal { max-height: calc(100vh - 24px); } .create-project-head,.create-project-grid,.create-project-actions { padding-left: 18px; padding-right: 18px; } }
`;
