import { useEffect, useMemo, useRef, useState } from "react";
import { Project } from "../data/projects";
import { Task } from "../data/tasks";
import { DateTimePicker } from "../components/DateTimePicker";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { NavKey } from "../components/Sidebar";
import { isDoneStatus, isOverdue, projectStats } from "../lib/taskUtils";
import { ImageVersion, ProjectImage } from "./ProjectImageLibrary";

interface ProjectOverviewProps {
  projects: Project[];
  currentProject: Project;
  tasks: Task[];
  projectImages: ProjectImage[];
  setProjectImages: React.Dispatch<React.SetStateAction<ProjectImage[]>>;
  onSwitchProject: (p: Project) => void;
  onCreateProject: (p: Omit<Project, "completion" | "riskCount" | "imageCount" | "pendingReviewCount">) => void;
  onUpdateProject: (id: string, patch: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  canCreateProject: boolean;
  currentRole: string;
  onRoleChange?: (role: string) => void;
  createProjectRequest?: number;
  showToast: (msg: string) => void;
  onNavigate: (key: NavKey) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
}

const COVER_IMAGE = "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&q=80&w=1200";
const MEMBER_AVATARS = [
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&q=80&w=200",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
];

export function ProjectOverview({
  projects,
  currentProject,
  tasks,
  projectImages,
  onSwitchProject,
  onCreateProject,
  onUpdateProject,
  canCreateProject,
  createProjectRequest,
  onNavigate,
  showToast,
}: ProjectOverviewProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [coverReplaceOpen, setCoverReplaceOpen] = useState(false);
  const [selectedChainTaskId, setSelectedChainTaskId] = useState<string | null>(null);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);

  useEffect(() => {
    if (!createProjectRequest) return;
    setCreateModalOpen(true);
  }, [createProjectRequest]);

  const selectedProject = useMemo(() => {
    return projects.find(project => project.id === currentProject.id) ?? currentProject;
  }, [projects, currentProject]);

  const projectTasks = useMemo(
    () => tasks.filter(task => task.projectId === selectedProject.id),
    [tasks, selectedProject.id],
  );
  const stats = useMemo(() => projectStats(tasks, selectedProject.id), [tasks, selectedProject.id]);
  const recruitmentStats = useMemo(
    () => getRecruitmentMetric(projectTasks, selectedProject.goals),
    [projectTasks, selectedProject.goals],
  );
  const riskCount = stats.risk + stats.overdue + stats.blocked;
  const urgentRiskCount = projectTasks.filter(task => {
    const isRisk = task.status === "有风险" || isOverdue(task);
    if (!isRisk || isDoneStatus(task.status)) return false;
    const deadline = new Date(task.deadline).getTime();
    const now = new Date().getTime();
    return deadline - now <= 12 * 60 * 60 * 1000;
  }).length;
  const pendingCount = Math.max(0, projectTasks.filter(task => !isDoneStatus(task.status)).length);
  const countdown = useMemo(() => getCountdownState(selectedProject.date), [selectedProject.date]);
  const nearDueTasks = useMemo(() => {
    return projectTasks
      .filter(task => !isDoneStatus(task.status))
      .filter(task => getDaysUntilDeadline(task.deadline) === 1)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 4);
  }, [projectTasks]);
  const progressOverview = useMemo(() => getProjectProgressOverview(projectTasks), [projectTasks]);
  const selectedChainTask = useMemo(
    () => projectTasks.find(task => task.id === selectedChainTaskId) ?? null,
    [projectTasks, selectedChainTaskId],
  );
  const metrics = [
    {
      icon: "fi fi-rr-badge-check",
      label: "整体完成度",
      value: `${stats.completionPct}%`,
      hint: `${stats.done}/${stats.total || 0} 任务完成`,
      tone: "blue",
      width: stats.completionPct,
    },
    {
      icon: "fi fi-rr-users-alt",
      label: "已确认客户",
      value: `${recruitmentStats.confirmed}人`,
      hint: `目标 ${recruitmentStats.target} 人`,
      tone: "green",
      width: recruitmentStats.pct,
    },
    {
      icon: "fi fi-rr-clipboard-check",
      label: "待审核成果",
      value: `${stats.pendingReview}项`,
      hint: stats.pendingReview > 0 ? "等待负责人审核" : "暂无待审核",
      tone: "orange",
      width: stats.total ? Math.round((stats.pendingReview / stats.total) * 100) : 0,
    },
    {
      icon: "fi fi-rr-triangle-warning",
      label: "风险任务",
      value: `${riskCount}项`,
      hint: urgentRiskCount > 0 ? "12 小时内截止" : "当前无临近风险",
      tone: "red",
      width: stats.total ? Math.round((riskCount / stats.total) * 100) : 0,
    },
  ] as const;

  return (
    <main className="overview-homepage">
      <style>{overviewCss}</style>

      <div className="overview-canvas">
        <section className="overview-content">
          <aside className="overview-left-panel">
            <button type="button" className="poster-card" onClick={() => setCoverReplaceOpen(true)}>
              <div className="poster-image-wrap">
                <ImageWithFallback src={selectedProject.coverUrl || COVER_IMAGE} alt={selectedProject.fullName} />
              </div>
            </button>

            <span className="phase-chip">{selectedProject.phase}</span>
            <p className="project-copy">
              {selectedProject.notes || `${selectedProject.fullName}项目内部主页，集中查看项目资料、最新素材和当前协作进度。`}
            </p>

            <div className="project-meta-list">
              <MetaRow icon={<Flaticon name="fi fi-rr-calendar" />} label="活动时间" value={formatDateRange(selectedProject.date, selectedProject.endDate)} />
              <MetaRow icon={<Flaticon name="fi fi-rr-user" />} label="项目负责人" value={selectedProject.owner} />
              <MetaRow icon={<Flaticon name="fi fi-rr-clock-three" />} label="当前阶段" value={selectedProject.phase} />
              <MetaRow icon={<Flaticon name="fi fi-rr-target" />} label="项目目标" value={selectedProject.goals} />
            </div>

            <div className="project-members">
              <strong>项目成员</strong>
              <div className="project-member-avatars">
                {MEMBER_AVATARS.map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    className="project-member-avatar"
                    style={{ zIndex: MEMBER_AVATARS.length - index }}
                  >
                    <ImageWithFallback src={src} alt={`成员${index + 1}`} />
                  </div>
                ))}
                <div className="project-member-avatar more">+3</div>
              </div>
            </div>
          </aside>

          <section className="overview-main-panel">
            <div className="hero-block">
              <div className="hero-left">
                <div className="project-dropdown-wrap" ref={projectMenuRef}>
                  <button
                    type="button"
                    className="project-dropdown-trigger"
                    onClick={() => setProjectMenuOpen(prev => !prev)}
                  >
                    <span>{selectedProject.fullName}</span>
                    <Flaticon name="fi fi-rr-angle-small-down" />
                  </button>

                  {projectMenuOpen && (
                    <div className="project-dropdown-menu">
                      {projects.map(project => (
                        <button
                          key={project.id}
                          type="button"
                          className={project.id === selectedProject.id ? "is-current" : ""}
                          onClick={() => {
                            onSwitchProject(project);
                            setProjectMenuOpen(false);
                          }}
                        >
                          <strong>{project.fullName}</strong>
                          <span>{project.phase} · {project.date}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <h2 className="hero-title">{selectedProject.fullName}</h2>
                <p className="hero-description">当前项目有 {pendingCount} 个与你相关的待处理任务</p>

                <div className="hero-actions">
                  <button type="button" className="hero-primary" onClick={() => onNavigate("control.board")}>
                    进入我的工作台
                    <Flaticon name="fi fi-rr-arrow-right" />
                  </button>
                  <button type="button" className="hero-secondary" onClick={() => onNavigate("library.project-images")}>
                    <Flaticon name="fi fi-rr-folder-open" />
                    查看项目资源库
                  </button>
                </div>
              </div>

              <div className="hero-right">
                <div className="countdown-shell">
                  <div className="countdown-ring">
                    <svg viewBox="0 0 200 200" aria-hidden="true">
                      <circle className="countdown-base" cx="100" cy="100" r="88" />
                      <circle
                        className="countdown-active"
                        cx="100"
                        cy="100"
                        r="88"
                        style={{
                          strokeDasharray: `${countdown.circumference}`,
                          strokeDashoffset: `${countdown.offset}`,
                        }}
                      />
                    </svg>
                    <div className="countdown-copy">
                      <span className="countdown-top-label">{countdown.title}</span>
                      <strong>{countdown.daysLeft}</strong>
                      <em>天</em>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <section className="overview-metric-strip">
              {metrics.map(item => {
                return (
                  <article
                    key={item.label}
                    className="overview-metric-item"
                    role={item.label === "整体完成度" ? "button" : undefined}
                    tabIndex={item.label === "整体完成度" ? 0 : undefined}
                    onClick={item.label === "整体完成度" ? () => setProgressDialogOpen(true) : undefined}
                    onKeyDown={item.label === "整体完成度" ? event => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setProgressDialogOpen(true);
                      }
                    } : undefined}
                  >
                    <div className="overview-metric-heading">
                      <span className={`overview-metric-icon tone-${item.tone}`}>
                        <Flaticon name={item.icon} />
                      </span>
                      <span>{item.label}</span>
                    </div>
                    <strong className="overview-metric-value">{item.value}</strong>
                    <span className={`overview-metric-hint hint-${item.tone}`}>{item.hint}</span>
                    <div className="overview-metric-track">
                      <i className={`tone-${item.tone}`} style={{ width: `${item.width}%` }} />
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="panel-row">
              <article className="info-panel owner-panel">
                <div className="owner-panel-header">
                  <h3>临期任务</h3>
                  <button type="button" className="owner-more-link" onClick={() => onNavigate("control.board")}>
                    查看更多任务
                    <Flaticon name="fi fi-rr-arrow-right" />
                  </button>
                </div>
                <div className="task-card-grid">
                  {nearDueTasks.length > 0 ? nearDueTasks.map(task => (
                    <article key={task.id} className="task-card" onClick={() => setSelectedChainTaskId(task.id)} role="button" tabIndex={0}>
                      <div className="task-card-head">
                        <span className="task-card-alert">
                          <Flaticon name={getTaskStatusIcon(task.status)} />
                        </span>
                        <span className={`task-card-status status-${getTaskStatusTone(task.status)}`}>{task.status}</span>
                      </div>
                      <strong className="task-card-title">{task.name}</strong>
                      <span className="task-card-meta">{task.role} · {task.owner}</span>
                      {getBlockingRole(task, projectTasks) ? (
                        <div className="task-card-blocker">
                          <span>当前阻塞岗位</span>
                          <b>{getBlockingRole(task, projectTasks)}</b>
                        </div>
                      ) : (
                        <div className="task-card-blocker">
                          <span>剩余时间</span>
                          <b>1 天</b>
                        </div>
                      )}
                    </article>
                  )) : (
                    <div className="active-task-empty">当前没有临期任务</div>
                  )}
                </div>
              </article>
            </section>
          </section>
        </section>
      </div>

      {createModalOpen && (
        <CreateProjectDialog
          projects={projects}
          projectImages={projectImages}
          onClose={() => setCreateModalOpen(false)}
          onCreate={project => {
            onCreateProject(project);
            setCreateModalOpen(false);
            showToast(`已创建项目「${project.fullName}」`);
          }}
        />
      )}

      {coverReplaceOpen && (
        <CoverReplaceDialog
          projects={projects}
          projectImages={projectImages}
          projectName={selectedProject.fullName}
          currentCoverUrl={selectedProject.coverUrl || COVER_IMAGE}
          onClose={() => setCoverReplaceOpen(false)}
          onConfirm={coverUrl => {
            onUpdateProject(selectedProject.id, { coverUrl });
            setCoverReplaceOpen(false);
            showToast("项目封面已替换");
          }}
        />
      )}

      {selectedChainTask && (
        <TaskChainDialog
          currentTask={selectedChainTask}
          projectTasks={projectTasks}
          onClose={() => setSelectedChainTaskId(null)}
        />
      )}

      {progressDialogOpen && (
        <ProgressLagDialog
          overview={progressOverview}
          onClose={() => setProgressDialogOpen(false)}
        />
      )}
    </main>
  );
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="project-meta-row">
      <span className="project-meta-icon">{icon}</span>
      <span className="project-meta-label">{label}</span>
      <strong className="project-meta-value">{value}</strong>
    </div>
  );
}

function CreateProjectDialog({
  projects,
  projectImages,
  onClose,
  onCreate,
}: {
  projects: Project[];
  projectImages: ProjectImage[];
  onClose: () => void;
  onCreate: (project: Omit<Project, "completion" | "riskCount" | "imageCount" | "pendingReviewCount">) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const seriesMenuRef = useRef<HTMLDivElement>(null);
  const phaseMenuRef = useRef<HTMLDivElement>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [name, setName] = useState("");
  const [phase, setPhase] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [series, setSeries] = useState("");
  const [customSeries, setCustomSeries] = useState("");
  const [owner, setOwner] = useState("当前用户");
  const [goals, setGoals] = useState("");
  const [error, setError] = useState("");
  const [customPhase, setCustomPhase] = useState("");
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [seriesMenuOpen, setSeriesMenuOpen] = useState(false);
  const [phaseMenuOpen, setPhaseMenuOpen] = useState(false);

  const seriesOptions = Array.from(new Set(projects.map(project => project.series))).filter(Boolean);
  const phaseOptions = Array.from(new Set([
    "立项启动",
    "市场预热",
    "集中邀约",
    "活动执行",
    "活动复盘",
    ...projects.map(project => project.phase),
  ])).filter(Boolean);
  const libraryCovers = useMemo(() => mapProjectImagesToAssetCards(projectImages, projects), [projectImages, projects]);
  const projectSeries = (series === "__custom__" ? customSeries : series).trim() || "未分类项目";
  const projectPhase = (phase === "__custom__" ? customPhase : phase).trim();
  const fullName = `${projectSeries} · ${name.trim()}`;

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (seriesMenuRef.current && !seriesMenuRef.current.contains(event.target as Node)) {
        setSeriesMenuOpen(false);
      }
      if (phaseMenuRef.current && !phaseMenuRef.current.contains(event.target as Node)) {
        setPhaseMenuOpen(false);
      }
    };

    if (!seriesMenuOpen && !phaseMenuOpen) return;
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [seriesMenuOpen, phaseMenuOpen]);

  const readCoverFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请上传 JPG 或 PNG 图片");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("图片大小不能超过 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = event => {
      setCoverUrl(String(event.target?.result ?? ""));
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const imageFile = Array.from(event.clipboardData.files).find(file => file.type.startsWith("image/"));
    if (imageFile) readCoverFile(imageFile);
  };

  const submit = () => {
    if (!coverUrl) {
      setError("请上传项目封面");
      return;
    }
    if (!name.trim()) {
      setError("请输入项目名称");
      return;
    }
    if (!projectPhase) {
      setError("请选择项目阶段");
      return;
    }
    if (!startDate) {
      setError("请选择活动开始日期");
      return;
    }

    onCreate({
      id: `p_${Date.now()}`,
      series: projectSeries,
      name: name.trim(),
      fullName,
      date: startDate,
      endDate: endDate || undefined,
      phase: projectPhase,
      owner: owner.trim() || "当前用户",
      goals: goals.trim() || "待补充项目目标",
      notes: notes.trim() || undefined,
      coverUrl,
    });
  };

  return (
    <div className="create-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="create-dialog" role="dialog" aria-modal="true" aria-labelledby="create-project-title" onMouseDown={event => event.stopPropagation()}>
        <header className="create-dialog-header">
          <h2 id="create-project-title">创建项目</h2>
          <button type="button" className="create-dialog-close" onClick={onClose} aria-label="关闭">
            <Flaticon name="fi fi-rr-cross-small" />
          </button>
        </header>

        <div className="create-dialog-body">
          <div className="create-dialog-left">
            <FieldLabel label="项目封面" required />
            <p className="field-tip">推荐尺寸 1200 × 800，支持 JPG / PNG 格式，大小不超过 10MB</p>
            <div
              className={`cover-upload ${coverUrl ? "has-cover" : ""}`}
              tabIndex={0}
              role="button"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onPaste={handlePaste}
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault();
                readCoverFile(event.dataTransfer.files?.[0]);
              }}
            >
              {coverUrl ? (
                <>
                  <ImageWithFallback src={coverUrl} alt="项目封面预览" />
                  <button
                    type="button"
                    className="cover-replace-button"
                    onClick={event => {
                      event.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    重新选择
                  </button>
                </>
              ) : (
                <>
                  <Flaticon name="fi fi-rr-picture" />
                  <strong>拖动图片到此处上传</strong>
                  <span>或粘贴图片（Ctrl / ⌘ + V）</span>
                  <button type="button" onClick={event => {
                    event.stopPropagation();
                    setLibraryModalOpen(true);
                  }}>
                    <Flaticon name="fi fi-rr-folder-open" />
                    从素材库选择
                  </button>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" hidden onChange={event => readCoverFile(event.target.files?.[0])} />
            </div>

            <FieldLabel label="活动时间" required />
            <div className="date-grid">
              <DateInput label="开始日期" value={startDate} onChange={setStartDate} />
              <span className="date-separator">~</span>
              <DateInput label="结束日期" value={endDate} onChange={setEndDate} />
            </div>

            <FieldLabel label="项目成员" />
            <div className="member-add-row">
              <button type="button" className="secondary-mini-button">
                <Flaticon name="fi fi-rr-user-add" />
                添加成员
              </button>
              <span>默认添加你自己为项目负责人</span>
            </div>

            <FieldLabel label="项目系列" />
            <div className="menu-select" ref={seriesMenuRef}>
              <button
                type="button"
                className={`menu-select-trigger ${series ? "has-value" : ""}`}
                onClick={() => {
                  setSeriesMenuOpen(prev => !prev);
                  setPhaseMenuOpen(false);
                }}
              >
                <span>{series === "__custom__" ? "创建新系列" : (series || "选择项目系列（可选）")}</span>
                <Flaticon name="fi fi-rr-angle-small-down" />
              </button>
              {seriesMenuOpen && (
                <div className="menu-select-dropdown">
                  <button type="button" onClick={() => { setSeries(""); setCustomSeries(""); setSeriesMenuOpen(false); }}>
                    选择项目系列（可选）
                  </button>
                  {seriesOptions.map(option => (
                    <button
                      key={option}
                      type="button"
                      className={series === option ? "is-current" : ""}
                      onClick={() => {
                        setSeries(option);
                        setCustomSeries("");
                        setSeriesMenuOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={series === "__custom__" ? "is-current" : ""}
                    onClick={() => {
                      setSeries("__custom__");
                      setSeriesMenuOpen(false);
                    }}
                  >
                    创建新系列
                  </button>
                </div>
              )}
            </div>
            {series === "__custom__" && (
              <input
                className="create-input inline-create-input"
                value={customSeries}
                onChange={event => setCustomSeries(event.target.value)}
                placeholder="输入新项目系列名称"
              />
            )}
          </div>

          <div className="create-dialog-right">
            <FieldLabel label="项目名称" required count={`${name.length}/50`} />
            <input
              className="create-input"
              value={name}
              maxLength={50}
              onChange={event => setName(event.target.value)}
              placeholder="请输入项目名称（如：暑期训练营活动）"
            />

            <FieldLabel label="项目阶段" required />
            <div className="menu-select" ref={phaseMenuRef}>
              <button
                type="button"
                className={`menu-select-trigger ${phase ? "has-value" : ""}`}
                onClick={() => {
                  setPhaseMenuOpen(prev => !prev);
                  setSeriesMenuOpen(false);
                }}
              >
                <span>{phase === "__custom__" ? "创建新阶段" : (phase || "请选择当前阶段")}</span>
                <Flaticon name="fi fi-rr-angle-small-down" />
              </button>
              {phaseMenuOpen && (
                <div className="menu-select-dropdown">
                  <button type="button" onClick={() => { setPhase(""); setCustomPhase(""); setPhaseMenuOpen(false); }}>
                    请选择当前阶段
                  </button>
                  {phaseOptions.map(option => (
                    <button
                      key={option}
                      type="button"
                      className={phase === option ? "is-current" : ""}
                      onClick={() => {
                        setPhase(option);
                        setCustomPhase("");
                        setPhaseMenuOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={phase === "__custom__" ? "is-current" : ""}
                    onClick={() => {
                      setPhase("__custom__");
                      setPhaseMenuOpen(false);
                    }}
                  >
                    创建新阶段
                  </button>
                </div>
              )}
            </div>
            {phase === "__custom__" && (
              <input
                className="create-input inline-create-input"
                value={customPhase}
                onChange={event => setCustomPhase(event.target.value)}
                placeholder="输入新项目阶段名称"
              />
            )}

            <FieldLabel label="项目负责人" />
            <input className="create-input" value={owner} onChange={event => setOwner(event.target.value)} placeholder="请输入项目负责人" />

            <FieldLabel label="项目目标" />
            <input className="create-input" value={goals} onChange={event => setGoals(event.target.value)} placeholder="如：到场120人 · 成交8家" />

            <FieldLabel label="项目描述" count={`${notes.length}/200`} />
            <textarea
              className="create-textarea"
              value={notes}
              maxLength={200}
              onChange={event => setNotes(event.target.value)}
              placeholder="请输入项目简介、目标或者注意信息（选填）"
            />
          </div>
        </div>

        <footer className="create-dialog-footer">
          {error && <p className="create-dialog-error">{error}</p>}
          <div className="create-dialog-actions">
            <button type="button" className="dialog-cancel-button" onClick={onClose}>取消</button>
            <button type="button" className="dialog-submit-button" onClick={submit}>创建项目</button>
          </div>
        </footer>
      </section>

      {libraryModalOpen && (
        <AssetPickerDialog
          images={libraryCovers}
          selectedUrl={coverUrl}
          onClose={() => setLibraryModalOpen(false)}
          onSelect={image => {
            setCoverUrl(image.url);
            setError("");
            setLibraryModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CoverReplaceDialog({
  projects,
  projectImages,
  projectName,
  currentCoverUrl,
  onClose,
  onConfirm,
}: {
  projects: Project[];
  projectImages: ProjectImage[];
  projectName: string;
  currentCoverUrl: string;
  onClose: () => void;
  onConfirm: (coverUrl: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nextCoverUrl, setNextCoverUrl] = useState("");
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [error, setError] = useState("");
  const libraryCovers = useMemo(() => mapProjectImagesToAssetCards(projectImages, projects), [projectImages, projects]);

  const readCoverFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请上传 JPG 或 PNG 图片");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("图片大小不能超过 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = event => {
      setNextCoverUrl(String(event.target?.result ?? ""));
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    readCoverFile(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="replace-cover-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="replace-cover-dialog" role="dialog" aria-modal="true" aria-labelledby="replace-cover-title" onMouseDown={event => event.stopPropagation()}>
        <header className="replace-cover-header">
          <div>
            <h2 id="replace-cover-title">替换图片</h2>
            <p>建议上传尺寸为 1200 × 800，支持 JPG / PNG 格式，大小不超过 10MB</p>
          </div>
          <button type="button" className="replace-cover-close" onClick={onClose} aria-label="关闭">
            <Flaticon name="fi fi-rr-cross-small" />
          </button>
        </header>

        <div className="replace-cover-body">
          <div className="replace-cover-current">
            <h3>当前图片</h3>
            <ImageWithFallback src={currentCoverUrl} alt={`${projectName} 当前封面`} />
          </div>

          <div className="replace-cover-divider" aria-hidden="true">
            <span />
            <Flaticon name="fi fi-rr-arrow-right" />
            <span />
          </div>

          <div className="replace-cover-next">
            <h3>上传新图片</h3>
            <div
              className={`replace-upload-box ${nextCoverUrl ? "has-preview" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={event => event.preventDefault()}
              onDrop={handleDrop}
            >
              {nextCoverUrl ? (
                <ImageWithFallback src={nextCoverUrl} alt="新封面预览" />
              ) : (
                <>
                  <Flaticon name="fi fi-rr-cloud-upload-alt" />
                  <strong>点击上传或拖拽文件到此处</strong>
                  <span>支持 JPG / PNG，大小不超过 10MB</span>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" hidden onChange={event => readCoverFile(event.target.files?.[0])} />
            </div>
            <div className="replace-cover-or"><span />或<span /></div>
            <button type="button" className="replace-library-button" onClick={() => setLibraryModalOpen(true)}>
              <Flaticon name="fi fi-rr-picture" />
              从素材库里选择
              <Flaticon name="fi fi-rr-angle-small-right" />
            </button>
            {error && <p className="replace-cover-error">{error}</p>}
          </div>
        </div>

        <footer className="replace-cover-footer">
          <button type="button" className="dialog-cancel-button" onClick={onClose}>取消</button>
          <button type="button" className="dialog-submit-button" disabled={!nextCoverUrl} onClick={() => nextCoverUrl && onConfirm(nextCoverUrl)}>
            确定替换
          </button>
        </footer>
      </section>

      {libraryModalOpen && (
        <AssetPickerDialog
          images={libraryCovers}
          selectedUrl={nextCoverUrl || currentCoverUrl}
          onClose={() => setLibraryModalOpen(false)}
          onSelect={image => {
            setNextCoverUrl(image.url);
            setError("");
            setLibraryModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function TaskChainDialog({
  currentTask,
  projectTasks,
  onClose,
}: {
  currentTask: Task;
  projectTasks: Task[];
  onClose: () => void;
}) {
  const chain = useMemo(() => buildTaskChain(currentTask, projectTasks), [currentTask, projectTasks]);
  const currentIndex = chain.steps.findIndex(step => step.id === currentTask.id);
  const blockedIndex = chain.steps.findIndex(step => step.id === chain.blockedTaskId);
  const activeIndex = blockedIndex >= 0 ? blockedIndex : currentIndex;
  const progressPct = chain.steps.length > 1 ? (activeIndex / (chain.steps.length - 1)) * 100 : 100;

  return (
    <div className="task-chain-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="task-chain-dialog" role="dialog" aria-modal="true" aria-labelledby="task-chain-title" onMouseDown={event => event.stopPropagation()}>
        <header className="task-chain-header">
          <div>
            <h2 id="task-chain-title">{chain.title}</h2>
            <p>
              当前卡在第 {Math.max(1, blockedIndex >= 0 ? blockedIndex + 1 : currentIndex + 1)} 步 / 共 {chain.steps.length} 步：
              {chain.steps[blockedIndex >= 0 ? blockedIndex : currentIndex]?.role ?? currentTask.role}
            </p>
          </div>
          <button type="button" className="task-chain-close" onClick={onClose} aria-label="关闭">
            <Flaticon name="fi fi-rr-cross-small" />
          </button>
        </header>

        <div className="task-chain-body">
          {chain.steps.length > 0 ? (
            <>
              <div className="task-chain-flow" style={{ ["--task-chain-count" as string]: chain.steps.length }}>
                <div className="task-chain-steps" style={{ gridTemplateColumns: `repeat(${chain.steps.length}, minmax(0, 1fr))` }}>
                {chain.steps.map((step, index) => {
                  const isCurrent = step.id === currentTask.id;
                  const isBlocked = chain.blockedTaskId === step.id;
                  const displayStatus = getChainDisplayStatus(step, projectTasks);
                  return (
                    <div key={step.id} className={isCurrent ? "task-step-card is-current" : "task-step-card"}>
                      <div className="task-step-head">
                        <span className="task-step-index">{index + 1}</span>
                        <div className="task-step-role-wrap">
                          <span className="task-step-role">{step.role}</span>
                          {isCurrent && <span className="task-step-current-tag">当前任务</span>}
                        </div>
                        {isBlocked && <span className="task-step-dot" />}
                      </div>
                      <strong className="task-step-title">{step.name}</strong>
                      <span className="task-step-meta">{step.owner} · 截止 {formatMonthDay(step.deadline)}</span>
                      <span className={`task-step-status status-${getTaskStatusTone(displayStatus)}`}>{displayStatus}</span>
                    </div>
                  );
                })}
                </div>

                <div className="task-chain-progress">
                  <div className="task-chain-progress-track">
                    <i style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="task-chain-progress-dots" style={{ gridTemplateColumns: `repeat(${chain.steps.length}, minmax(0, 1fr))` }}>
                    {chain.steps.map((step, index) => (
                      <span
                        key={step.id}
                        className={[
                          index < activeIndex ? "is-done" : "",
                          index === activeIndex ? "is-active" : "",
                        ].filter(Boolean).join(" ")}
                      >
                        {index + 1}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="task-chain-empty">当前任务暂无完整任务链数据</div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProgressLagDialog({
  overview,
  onClose,
}: {
  overview: ReturnType<typeof getProjectProgressOverview>;
  onClose: () => void;
}) {
  return (
    <div className="progress-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="progress-dialog" role="dialog" aria-modal="true" aria-labelledby="progress-dialog-title" onMouseDown={event => event.stopPropagation()}>
        <header className="progress-dialog-header">
          <div className="progress-dialog-title-wrap">
            <span className="progress-dialog-icon">
              <Flaticon name="fi fi-rr-time-forward" />
            </span>
            <div>
              <h2 id="progress-dialog-title">整体完成进度滞后</h2>
              <p>当前整体完成进度滞后于计划，请及时关注未完成的任务并推进执行。</p>
            </div>
          </div>
          <button type="button" className="progress-dialog-close" onClick={onClose} aria-label="关闭">
            <Flaticon name="fi fi-rr-cross-small" />
          </button>
        </header>

        <div className="progress-dialog-body">
          <section className="progress-overview-card">
            <div className="progress-overview-main">
              <div>
                <span>整体完成进度</span>
                <strong>{overview.actualPct}%</strong>
                <em>{overview.doneCount}/{overview.totalCount} 任务完成</em>
              </div>
              <div>
                <span>计划进度</span>
                <strong>{overview.planPct}%</strong>
                <em>{overview.plannedDoneCount}/{overview.totalCount} 计划节点</em>
              </div>
              <div className="lag-column">
                <span>滞后</span>
                <strong>{overview.lagPct}%</strong>
              </div>
            </div>
            <div className="progress-overview-track">
              <i className="planned" style={{ width: `${overview.planPct}%` }} />
              <i className="actual" style={{ width: `${overview.actualPct}%` }} />
            </div>
          </section>

          <section className="progress-task-section">
            <h3><span className="done-dot" /> 已完成任务 ({overview.completedTasks.length})</h3>
            <div className="progress-task-list">
              {overview.completedTasks.map(task => (
                <article key={task.id} className="progress-task-row">
                  <div className="progress-task-main">
                    <strong>{task.name}</strong>
                    <span>{task.role} · {task.owner}</span>
                  </div>
                  <span className="progress-task-time">完成时间：{formatFullDate(task.doneAt || task.deadline)}</span>
                  <span className="progress-task-tag done">已完成</span>
                </article>
              ))}
            </div>
          </section>

          <section className="progress-task-section">
            <h3><span className="todo-dot" /> 未完成任务 ({overview.pendingTasks.length})</h3>
            <div className="progress-task-list">
              {overview.pendingTasks.map(task => {
                const pendingLabel = getPendingTaskLabel(task.deadline);
                return (
                  <article key={task.id} className="progress-task-row">
                    <div className="progress-task-main">
                      <strong>{task.name}</strong>
                      <span>{task.role} · {task.owner}</span>
                    </div>
                    <span className="progress-task-time">计划完成：{formatFullDate(task.deadline)}</span>
                    <span className={`progress-task-tag ${pendingLabel.tone}`}>{pendingLabel.label}</span>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function AssetPickerDialog({
  images,
  selectedUrl,
  onClose,
  onSelect,
}: {
  images: AssetPickerImage[];
  selectedUrl: string;
  onClose: () => void;
  onSelect: (image: AssetPickerImage) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(images.find(image => image.url === selectedUrl)?.id ?? "");
  const selectedImage = images.find(image => image.id === selectedId);
  const categories = useMemo(() => {
    const categorySet = new Set(images.map(image => image.categoryId));
    return ASSET_PICKER_CATEGORIES.filter(category => category.id === "all" || categorySet.has(category.id));
  }, [images]);
  const filtered = images.filter(image => {
    const matchesQuery = `${image.title}${image.projectName}${image.uploadedBy}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCategory = activeCategory === "all" || image.categoryId === activeCategory;
    const matchesType = typeFilter === "all" || typeFilter === "image";
    return matchesQuery && matchesCategory && matchesType;
  });

  return (
    <div className="asset-picker-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="asset-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="asset-picker-title" onMouseDown={event => event.stopPropagation()}>
        <header className="asset-picker-header">
          <div>
            <h3 id="asset-picker-title">从素材库选择</h3>
            <p>选择系统素材库中的图片作为项目封面</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">
            <Flaticon name="fi fi-rr-cross-small" />
          </button>
        </header>
        <div className="asset-picker-toolbar">
          <label className="asset-picker-search">
            <Flaticon name="fi fi-rr-search" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索素材名称、项目或上传人" />
          </label>
          <label className="asset-picker-type">
            <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
              <option value="all">全部类型</option>
              <option value="image">图片</option>
              <option value="video">视频</option>
              <option value="document">文档</option>
            </select>
            <Flaticon name="fi fi-rr-angle-small-down" />
          </label>
        </div>
        <div className="asset-picker-body">
          <aside className="asset-picker-sidebar" aria-label="素材分类">
            {categories.map(category => (
              <button
                key={category.id}
                type="button"
                className={activeCategory === category.id ? "is-active" : ""}
                onClick={() => setActiveCategory(category.id)}
              >
                <Flaticon name={category.icon} />
                <span>{category.label}</span>
              </button>
            ))}
          </aside>
          <div className="asset-picker-content">
            <div className="asset-picker-grid">
              {filtered.length ? filtered.map(image => {
                const selected = selectedId === image.id;
                return (
                  <button
                    key={image.id}
                    type="button"
                    className={selected ? "asset-card is-selected" : "asset-card"}
                    onClick={() => setSelectedId(image.id)}
                    aria-pressed={selected}
                  >
                    <span className="asset-card-check">
                      {selected && <Flaticon name="fi fi-rr-check" />}
                    </span>
                    <ImageWithFallback src={image.url} alt={image.title} />
                    <span className="asset-card-copy">
                      <strong>{image.title}</strong>
                      <em>{getAssetCategoryLabel(image.categoryId)} · {image.versionStr}</em>
                      <small>{image.projectName}</small>
                    </span>
                  </button>
                );
              }) : (
                <div className="asset-picker-empty">
                  <Flaticon name="fi fi-rr-search-alt" />
                  <strong>暂无匹配素材</strong>
                  <span>换个关键词或分类再试试</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <footer className="asset-picker-footer">
          <span>已选择 {selectedImage ? 1 : 0} 项{selectedImage ? ` · ${selectedImage.title}` : ""}</span>
          <div>
            <button type="button" className="dialog-cancel-button" onClick={onClose}>取消</button>
            <button
              type="button"
              className="dialog-submit-button"
              disabled={!selectedImage}
              onClick={() => selectedImage && onSelect(selectedImage)}
            >
              确认选择
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

type AssetPickerImage = {
  id: string;
  title: string;
  url: string;
  projectName: string;
  categoryId: string;
  uploadedBy: string;
  status: ImageVersion["status"];
  versionStr: string;
};

const ASSET_PICKER_CATEGORIES = [
  { id: "all", label: "全部素材", icon: "fi fi-rr-apps" },
  { id: "poster", label: "图片", icon: "fi fi-rr-picture" },
  { id: "moments", label: "海报模板", icon: "fi fi-rr-layout-fluid" },
  { id: "long", label: "长图", icon: "fi fi-rr-document" },
  { id: "qrcode", label: "二维码", icon: "fi fi-rr-qr-scan" },
  { id: "field", label: "现场照", icon: "fi fi-rr-camera" },
  { id: "other", label: "其他", icon: "fi fi-rr-folder" },
] as const;

function getAssetCategoryLabel(categoryId: string) {
  return ASSET_PICKER_CATEGORIES.find(category => category.id === categoryId)?.label ?? "其他";
}

function mapProjectImagesToAssetCards(projectImages: ProjectImage[], projects: Project[]): AssetPickerImage[] {
  return projectImages
    .filter(image => image.versions.length > 0)
    .map(image => {
      const version = image.versions[image.versions.length - 1];
      const project = projects.find(item => item.id === image.projectId);
      return {
        id: image.id,
        title: image.title,
        url: version.url,
        projectName: project?.fullName ?? "项目素材",
        categoryId: image.categoryId,
        uploadedBy: version.uploadedBy,
        status: version.status,
        versionStr: version.versionStr,
      };
    });
}

function FieldLabel({ label, required, count }: { label: string; required?: boolean; count?: string }) {
  return (
    <div className="field-label-row">
      <label>{label}{required && <span>*</span>}</label>
      {count && <em>{count}</em>}
    </div>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="date-input">
      <Flaticon name="fi fi-rr-calendar" />
      <div className="date-input-picker">
        <DateTimePicker value={value} onChange={onChange} placeholder="年 / 月 / 日" />
      </div>
    </label>
  );
}

function Flaticon({ name }: { name: string }) {
  return <i className={name} aria-hidden="true" />;
}

function formatDateRange(start: string, end?: string) {
  return end ? `${start} ~ ${end}` : start;
}

function getRecruitmentMetric(projectTasks: Task[], goals: string) {
  const target = extractTargetPeople(goals);
  const recruitmentTasks = projectTasks.filter(task => task.role === "招商");
  const sourceTasks = recruitmentTasks.length > 0 ? recruitmentTasks : projectTasks;
  const done = sourceTasks.filter(task => isDoneStatus(task.status)).length;
  const inProgress = sourceTasks.filter(task => task.status === "进行中" || task.status === "待审核").length;
  const weightedPct = sourceTasks.length
    ? Math.round(((done + inProgress * 0.45) / sourceTasks.length) * 100)
    : 0;
  const pct = Math.max(0, Math.min(100, weightedPct));
  return {
    target,
    confirmed: Math.round((target * pct) / 100),
    pct,
  };
}

function getCountdownState(date: string) {
  const targetDate = new Date(date);
  const today = new Date();
  targetDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const windowDays = 30;
  const progress = Math.max(0, Math.min(1, (windowDays - Math.min(daysLeft, windowDays)) / windowDays));
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return {
    daysLeft,
    title: "距离活动开始",
    circumference,
    offset,
  };
}

function formatMonthDay(date: string) {
  const [, month, day] = date.split("-");
  return `${month}-${day}`;
}

function getPriorityTone(priority: Task["priority"]) {
  if (priority === "紧急") return "high";
  if (priority === "重要") return "medium";
  return "normal";
}

function getDaysUntilDeadline(deadline: string) {
  const target = new Date(deadline);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getTaskStatusTone(status: Task["status"]) {
  if (status === "有风险" || status === "已逾期") return "risk";
  if (status === "待审核") return "review";
  if (status === "等待前置任务") return "blocked";
  if (status === "进行中") return "active";
  return "default";
}

function getTaskStatusIcon(status: Task["status"]) {
  if (status === "有风险" || status === "已逾期") return "fi fi-rr-triangle-warning";
  if (status === "待审核") return "fi fi-rr-clipboard-check";
  if (status === "等待前置任务") return "fi fi-rr-ban";
  return "fi fi-rr-time-forward";
}

function getBlockingRole(task: Task, projectTasks: Task[]) {
  if (!task.dependencyIds?.length) return "";
  const dependency = projectTasks.find(item => task.dependencyIds?.includes(item.id));
  return dependency?.role ?? "";
}

function buildTaskChain(currentTask: Task, projectTasks: Task[]) {
  const grouped = currentTask.taskGroupId
    ? projectTasks.filter(task => task.taskGroupId === currentTask.taskGroupId)
    : projectTasks.filter(task =>
      task.id === currentTask.id
      || currentTask.dependencyIds?.includes(task.id)
      || task.dependencyIds?.includes(currentTask.id)
      || currentTask.linkedTaskIds?.includes(task.id)
      || task.linkedTaskIds?.includes(currentTask.id),
    );

  const uniqueSteps = Array.from(new Map(grouped.map(task => [task.id, task])).values());
  const steps = sortTasksByChain(uniqueSteps);
  const blockedTask = findBlockedTask(steps, projectTasks);

  return {
    title: currentTask.taskGroupId ? `任务链详情 · ${currentTask.name}` : `任务链详情`,
    steps: steps.length > 0 ? steps : [currentTask],
    blockedTaskId: blockedTask?.id ?? "",
  };
}

function sortTasksByChain(tasks: Task[]) {
  if (tasks.length <= 1) return tasks;

  const byId = new Map(tasks.map(task => [task.id, task]));
  const incomingCount = new Map<string, number>(tasks.map(task => [task.id, 0]));
  const adjacency = new Map<string, Task[]>(tasks.map(task => [task.id, []]));

  for (const task of tasks) {
    for (const depId of task.dependencyIds ?? []) {
      if (!byId.has(depId)) continue;
      adjacency.get(depId)?.push(task);
      incomingCount.set(task.id, (incomingCount.get(task.id) ?? 0) + 1);
    }
  }

  const queue = tasks
    .filter(task => (incomingCount.get(task.id) ?? 0) === 0)
    .sort(compareTaskFlowOrder);
  const sorted: Task[] = [];

  while (queue.length > 0) {
    const task = queue.shift()!;
    sorted.push(task);
    for (const nextTask of adjacency.get(task.id) ?? []) {
      const nextCount = (incomingCount.get(nextTask.id) ?? 1) - 1;
      incomingCount.set(nextTask.id, nextCount);
      if (nextCount === 0) {
        queue.push(nextTask);
        queue.sort(compareTaskFlowOrder);
      }
    }
  }

  const missing = tasks.filter(task => !sorted.find(item => item.id === task.id)).sort(compareTaskFlowOrder);
  return [...sorted, ...missing];
}

function compareTaskFlowOrder(a: Task, b: Task) {
  const roleOrder = getFlowRoleOrder();
  const roleDiff = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
  if (roleDiff !== 0) return roleDiff;
  const deadlineDiff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  if (deadlineDiff !== 0) return deadlineDiff;
  return a.name.localeCompare(b.name, "zh-CN");
}

function getFlowRoleOrder() {
  return ["文案", "现场执行", "设计", "审核", "运营", "招商", "短视频", "客服"] as const;
}

function findBlockedTask(steps: Task[], projectTasks: Task[]) {
  for (const step of steps) {
    const dependency = (step.dependencyIds ?? [])
      .map(id => projectTasks.find(task => task.id === id))
      .find(Boolean);

    if (dependency && !isDoneStatus(dependency.status) && dependency.status !== "已定稿") {
      return dependency;
    }

    if (step.status === "等待前置任务") {
      return step;
    }
  }

  return null;
}

function getChainDisplayStatus(task: Task, projectTasks: Task[]) {
  const dependencies = (task.dependencyIds ?? [])
    .map(id => projectTasks.find(item => item.id === id))
    .filter((item): item is Task => Boolean(item));

  const hasPendingDependency = dependencies.some(dep => !isDoneStatus(dep.status) && dep.status !== "已定稿");
  if (hasPendingDependency) return "等待前置任务" as const;
  return task.status;
}

function getProjectProgressOverview(projectTasks: Task[]) {
  const totalCount = projectTasks.length;
  const doneTasks = projectTasks.filter(task => isDoneStatus(task.status));
  const pendingTasks = projectTasks.filter(task => !isDoneStatus(task.status));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const plannedDoneCount = projectTasks.filter(task => {
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline.getTime() <= today.getTime();
  }).length;

  const actualPct = totalCount ? Math.round((doneTasks.length / totalCount) * 100) : 0;
  const planPct = totalCount ? Math.round((plannedDoneCount / totalCount) * 100) : 0;
  const lagPct = Math.max(0, planPct - actualPct);

  return {
    actualPct,
    planPct,
    lagPct,
    doneCount: doneTasks.length,
    totalCount,
    plannedDoneCount,
    completedTasks: doneTasks.slice().sort((a, b) => new Date(b.reviewedAt || b.submittedAt || b.deadline).getTime() - new Date(a.reviewedAt || a.submittedAt || a.deadline).getTime()),
    pendingTasks: pendingTasks.slice().sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()),
  };
}

function formatFullDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${year}-${month}-${day}`;
}

function getPendingTaskLabel(deadline: string) {
  const days = getDaysUntilDeadline(deadline);
  if (days < 0) return { label: `已逾期 ${Math.abs(days)} 天`, tone: "overdue" };
  if (days === 0) return { label: "今日到期", tone: "soon" };
  if (days <= 3) return { label: `剩余 ${days} 天`, tone: "soon" };
  return { label: `剩余 ${days} 天`, tone: "normal" };
}

function extractTargetPeople(goals: string) {
  const toArrival = goals.match(/到场\s*(\d+)\s*人/);
  if (toArrival) return Number(toArrival[1]);
  const signups = goals.match(/报名\s*(\d+)\s*人/);
  if (signups) return Number(signups[1]);
  const generic = goals.match(/(\d+)\s*人/);
  return generic ? Number(generic[1]) : 0;
}

const overviewCss = `
  .overview-homepage,
  .overview-web-only {
    min-height: 100%;
    height: 100%;
    background: #f9fafb;
    color: #111827;
    font-family: "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .overview-homepage {
    min-width: 1120px;
    overflow-x: auto;
  }

  .overview-homepage *,
  .overview-web-only * {
    box-sizing: border-box;
  }

  .overview-homepage .fi {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .overview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    height: 92px;
    min-width: 1120px;
    padding: 0 clamp(24px, 3vw, 52px);
    background: rgba(255, 255, 255, 0.98);
    border-bottom: 1px solid #f3f4f6;
  }

  .overview-header-brand {
    display: flex;
    align-items: center;
    gap: 18px;
    min-width: 180px;
    flex-shrink: 0;
  }

  .brand-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: #111827;
    font-size: 30px;
    line-height: 1;
  }

  .overview-header-brand strong {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .overview-header-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: clamp(24px, 3vw, 44px);
    flex: 1;
    min-width: 0;
  }

  .overview-header-nav button {
    position: relative;
    border: none;
    background: transparent;
    padding: 4px 0 18px;
    color: #111827;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .overview-header-nav button.is-active::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    border-radius: 999px;
    background: #111827;
  }

  .overview-header-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    min-width: 260px;
    flex-shrink: 0;
  }

  .header-icon-button {
    position: relative;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: #111827;
    cursor: pointer;
  }

  .header-icon-button .fi {
    font-size: 21px;
  }

  .header-icon-button.has-badge::after {
    content: "12";
    position: absolute;
    top: -1px;
    right: -3px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 999px;
    background: #ef4444;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }

  .header-user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    border: 1px solid #f3f4f6;
    background: #f3f4f6;
    flex-shrink: 0;
  }

  .header-user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .header-create-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
    border: none;
    border-radius: 12px;
    background: #111827;
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
  }

  .header-create-button .fi,
  .hero-primary .fi,
  .hero-secondary .fi,
  .owner-more-link .fi,
  .project-dropdown-trigger .fi {
    font-size: 16px;
  }

  .overview-canvas {
    height: calc(100% - 92px);
    overflow: auto;
    min-width: 1120px;
    background:
      radial-gradient(circle at top center, rgba(255, 255, 255, 0.85), rgba(249, 250, 251, 0.96) 52%, #f9fafb 100%);
  }

  .overview-content {
    display: grid;
    grid-template-columns: clamp(280px, 22vw, 336px) minmax(0, 1fr);
    gap: 24px;
    max-width: 1792px;
    min-width: 1120px;
    margin: 0 auto;
    padding: 24px clamp(24px, 3.4vw, 64px) 32px;
  }

  .overview-left-panel {
    padding-right: 24px;
    border-right: 1px solid #f3f4f6;
  }

  .poster-card {
    display: block;
    width: 100%;
    overflow: hidden;
    border: 1px solid #f3f4f6;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 10px 32px rgba(17, 24, 39, 0.04);
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
  }

  .poster-card:hover {
    border-color: #e5e7eb;
    box-shadow: 0 14px 36px rgba(17, 24, 39, 0.08);
    transform: translateY(-1px);
  }

  .poster-image-wrap {
    height: 196px;
    overflow: hidden;
    background: #f9fafb;
  }

  .poster-image-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .phase-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 14px;
    margin-top: 24px;
    border-radius: 999px;
    background: #111827;
    color: #ffffff;
    font-size: 14px;
    font-weight: 600;
  }

  .project-copy {
    margin: 16px 0 0;
    color: #4b5563;
    font-size: 15px;
    line-height: 1.85;
  }

  .project-meta-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-top: 24px;
    padding-top: 18px;
    border-top: 1px solid #f3f4f6;
  }

  .project-meta-row {
    display: grid;
    grid-template-columns: 16px 84px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
  }

  .project-meta-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #111827;
  }

  .project-meta-icon .fi {
    font-size: 16px;
  }

  .project-meta-label {
    color: #111827;
    font-size: 14px;
    font-weight: 600;
  }

  .project-meta-value {
    color: #374151;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
  }

  .project-members {
    margin-top: 40px;
  }

  .project-members strong {
    display: block;
    margin-bottom: 18px;
    color: #111827;
    font-size: 18px;
    font-weight: 600;
  }

  .project-member-avatars {
    display: flex;
    align-items: center;
  }

  .project-member-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid #ffffff;
    background: #ffffff;
    box-shadow: 0 8px 18px rgba(17, 24, 39, 0.06);
  }

  .project-member-avatar + .project-member-avatar,
  .project-member-avatar + .project-member-avatar.more,
  .project-member-avatar.more + .project-member-avatar {
    margin-left: -8px;
  }

  .project-member-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .project-member-avatar.more {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #374151;
    font-size: 18px;
    font-weight: 500;
    background: #ffffff;
  }

  .overview-main-panel {
    min-width: 0;
  }

  .hero-block {
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(190px, 16vw, 280px);
    gap: 24px;
    align-items: start;
    padding-bottom: 24px;
    border-bottom: 1px solid #f3f4f6;
  }

  .hero-left {
    min-width: 0;
  }

  .project-dropdown-wrap {
    position: relative;
    display: inline-block;
  }

  .project-dropdown-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-width: 308px;
    height: 48px;
    padding: 0 16px;
    border: 1px solid #f3f4f6;
    border-radius: 12px;
    background: #ffffff;
    color: #111827;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  }

  .project-dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 20;
    width: 340px;
    padding: 8px;
    border: 1px solid #f3f4f6;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 16px 32px rgba(17, 24, 39, 0.08);
  }

  .project-dropdown-menu button {
    width: 100%;
    padding: 12px 14px;
    border: none;
    border-radius: 10px;
    background: transparent;
    text-align: left;
    cursor: pointer;
  }

  .project-dropdown-menu button:hover,
  .project-dropdown-menu button.is-current {
    background: #f9fafb;
  }

  .project-dropdown-menu strong,
  .project-dropdown-menu span {
    display: block;
  }

  .project-dropdown-menu strong {
    color: #111827;
    font-size: 14px;
    font-weight: 600;
  }

  .project-dropdown-menu span {
    margin-top: 4px;
    color: #6b7280;
    font-size: 12px;
  }

  .hero-title {
    margin: 24px 0 0;
    color: #111827;
    font-size: clamp(42px, 3.2vw, 60px);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.05em;
  }

  .hero-description {
    margin: 16px 0 0;
    color: #4b5563;
    font-size: 18px;
    font-weight: 500;
    line-height: 1.65;
  }

  .hero-actions {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 24px;
  }

  .hero-primary,
  .hero-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 40px;
    padding: 0 24px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
  }

  .hero-primary {
    min-width: 190px;
    border: none;
    background: #111827;
    color: #ffffff;
  }

  .hero-secondary {
    min-width: 194px;
    border: 1px solid #f3f4f6;
    background: #ffffff;
    color: #111827;
  }

  .hero-right {
    display: flex;
    justify-content: center;
    padding-top: 8px;
  }

  .countdown-shell {
    display: grid;
    justify-items: center;
    width: 200px;
    gap: 16px;
  }

  .countdown-ring {
    position: relative;
    width: 200px;
    height: 200px;
  }

  .countdown-shell svg {
    width: 200px;
    height: 200px;
    transform: rotate(-90deg);
  }

  .countdown-base,
  .countdown-active {
    fill: none;
    stroke-width: 12;
    stroke-linecap: round;
  }

  .countdown-base {
    stroke: #d1d5db;
  }

  .countdown-active {
    stroke: #111827;
    transition: stroke-dashoffset 220ms ease;
  }

  .countdown-copy {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transform: translate(-50%, -50%);
    text-align: center;
  }

  .countdown-top-label,
  .countdown-copy em {
    color: #374151;
  }

  .countdown-top-label {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.3;
  }

  .countdown-copy strong {
    color: #111827;
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .countdown-copy em {
    margin-top: 4px;
    font-size: 14px;
    font-weight: 500;
    font-style: normal;
    line-height: 1.2;
  }

  .overview-metric-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin-top: 24px;
    overflow: hidden;
    border: 1px solid #f3f4f6;
    border-radius: 8px;
    background: #ffffff;
  }

  .overview-metric-item {
    min-height: 186px;
    padding: 24px clamp(24px, 3vw, 64px) 22px 24px;
  }

  .overview-metric-item[role="button"] {
    cursor: pointer;
    transition: background 160ms ease, box-shadow 160ms ease;
  }

  .overview-metric-item[role="button"]:hover,
  .overview-metric-item[role="button"]:focus-visible {
    background: #fcfcfd;
    box-shadow: inset 0 0 0 1px #eef1f4;
    outline: none;
  }

  .overview-metric-item + .overview-metric-item {
    border-left: 1px solid #e5e7eb;
  }

  .overview-metric-heading {
    display: flex;
    align-items: center;
    gap: clamp(16px, 1.6vw, 28px);
    min-height: 52px;
  }

  .overview-metric-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: clamp(42px, 3vw, 52px);
    height: clamp(42px, 3vw, 52px);
    border-radius: 50%;
    color: #ffffff;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(17, 24, 39, 0.16);
  }

  .overview-metric-icon .fi {
    font-size: clamp(18px, 1.4vw, 22px);
  }

  .overview-metric-heading span:last-child {
    color: #6b7280;
    font-size: clamp(17px, 1.35vw, 22px);
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
  }

  .overview-metric-value {
    display: block;
    margin-top: 40px;
    color: #000000;
    font-size: clamp(48px, 3.4vw, 64px);
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0;
  }

  .overview-metric-hint {
    display: block;
    margin-top: 28px;
    color: #4b5563;
    font-size: clamp(17px, 1.25vw, 22px);
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
  }

  .overview-metric-track {
    height: 6px;
    margin-top: 28px;
    overflow: hidden;
    border-radius: 999px;
    background: #e5e7eb;
  }

  .overview-metric-track i {
    display: block;
    height: 100%;
    border-radius: inherit;
  }

  .hint-blue {
    color: #4b5563;
  }

  .hint-green {
    color: #4b5563;
  }

  .hint-orange {
    color: #4b5563;
  }

  .hint-red {
    color: #4b5563;
  }

  .tone-blue {
    background: #1677ff;
    color: #1677ff;
  }

  .tone-green {
    background: #16a34a;
    color: #16a34a;
  }

  .tone-orange {
    background: #ff8a1f;
    color: #ff8a1f;
  }

  .tone-red {
    background: #ef4444;
    color: #ef4444;
  }

  .overview-metric-icon.tone-blue,
  .overview-metric-icon.tone-green,
  .overview-metric-icon.tone-orange,
  .overview-metric-icon.tone-red {
    color: #ffffff;
  }

  .panel-row {
    display: block;
    margin-top: 24px;
  }

  .info-panel {
    min-height: 214px;
    padding: 24px;
    border: 1px solid #f3f4f6;
    border-radius: 16px;
    background: #ffffff;
  }

  .info-panel h3 {
    margin: 0;
    color: #111827;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .info-panel {
    min-width: 0;
  }

  .owner-panel {
    min-height: auto;
    max-height: none;
  }

  .owner-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .task-card-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  .task-card {
    min-height: 120px;
    padding: 16px;
    border: 1px solid #e9e9ec;
    border-radius: 12px;
    background: #ffffff;
    cursor: pointer;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }

  .task-card:hover,
  .task-card:focus-visible {
    border-color: #d5d9e2;
    box-shadow: 0 10px 24px rgba(17, 24, 39, 0.08);
    transform: translateY(-1px);
    outline: none;
  }

  .task-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .task-card-alert {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: #1a1a1a;
    font-size: 18px;
  }

  .task-card-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 68px;
    height: 30px;
    padding: 0 12px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }

  .status-active,
  .status-default {
    background: #f3f4f6;
    color: #1a1a1a;
  }

  .status-review {
    background: #fff7ed;
    color: #c2410c;
  }

  .status-risk {
    background: #fee2e2;
    color: #b91c1c;
  }

  .status-blocked {
    background: #f3f4f6;
    color: #4b5563;
  }

  .task-card-title {
    display: block;
    margin-top: 12px;
    color: #111827;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .task-card-meta {
    display: block;
    margin-top: 4px;
    color: #6b7280;
    font-size: 14px;
  }

  .task-card-blocker {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    color: #111827;
    font-size: 12px;
    font-weight: 600;
    flex-wrap: wrap;
  }

  .task-card-blocker b {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    height: 30px;
    padding: 0 12px;
    border-radius: 10px;
    background: #f3f4f6;
    color: #1a1a1a;
    font-size: 12px;
    font-weight: 600;
  }

  .active-task-empty {
    padding: 12px 0 4px;
    color: #9ca3af;
    font-size: 14px;
  }

  .owner-more-link {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    width: fit-content;
    margin-top: 0;
    border: none;
    background: transparent;
    padding: 0;
    color: #1677ff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    flex-shrink: 0;
  }

  .task-chain-backdrop {
    position: fixed;
    inset: 0;
    z-index: 130;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
  }

  .task-chain-dialog {
    width: min(960px, calc(100vw - 48px));
    overflow: hidden;
    border: 1px solid #e5e5e5;
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 28px 80px rgba(17, 24, 39, 0.22);
  }

  .task-chain-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding: 24px;
    border-bottom: 1px solid #e5e5e5;
  }

  .task-chain-header h2 {
    margin: 0;
    color: #1a1a1a;
    font-size: 20px;
    font-weight: 600;
  }

  .task-chain-header p {
    margin: 10px 0 0;
    color: #666666;
    font-size: 14px;
    line-height: 1.6;
  }

  .task-chain-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #1a1a1a;
    cursor: pointer;
  }

  .task-chain-body {
    padding: 24px;
  }

  .task-chain-flow {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .task-chain-steps {
    display: grid;
    gap: 16px;
  }

  .task-step-card {
    position: relative;
    min-height: 128px;
    padding: 16px;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    background: #ffffff;
  }

  .task-step-card.is-current {
    border-color: #111111;
    box-shadow: 0 0 0 1px #111111;
  }

  .task-step-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .task-step-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #111111;
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .task-step-role-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .task-step-role {
    color: #666666;
    font-size: 14px;
    font-weight: 600;
  }

  .task-step-current-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    background: #f3f4f6;
    color: #111111;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  .task-step-dot {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ff4d4f;
    box-shadow: 0 0 0 2px #ffffff;
  }

  .task-step-title {
    display: block;
    margin-top: 14px;
    color: #111111;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
  }

  .task-step-meta {
    display: block;
    margin-top: 14px;
    color: #999999;
    font-size: 13px;
  }

  .task-step-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    margin-top: 12px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
  }

  .task-chain-progress {
    position: relative;
    padding-top: 4px;
  }

  .task-chain-progress-track {
    position: absolute;
    top: 15px;
    left: calc((100% / var(--task-chain-count, 4)) / 2);
    right: calc((100% / var(--task-chain-count, 4)) / 2);
    z-index: 0;
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: #e5e5e5;
  }

  .task-chain-progress-track i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #111111;
  }

  .task-chain-progress-dots {
    position: relative;
    z-index: 1;
    display: grid;
    gap: 16px;
  }

  .task-chain-progress-dots span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin: 0 auto;
    border: 1px solid #d1d5db;
    border-radius: 50%;
    color: #999999;
    font-size: 12px;
    font-weight: 600;
    background: #ffffff;
    box-shadow: 0 0 0 6px #ffffff;
  }

  .task-chain-progress-dots span.is-done {
    border-color: #111111;
    background: #111111;
    color: #ffffff;
  }

  .task-chain-progress-dots span.is-active {
    border-color: #111111;
    background: #111111;
    color: #ffffff;
    box-shadow: 0 0 0 4px rgba(17, 17, 17, 0.08);
  }

  .task-chain-empty {
    color: #999999;
    font-size: 14px;
    line-height: 1.6;
  }

  .progress-dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 135;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
  }

  .progress-dialog {
    width: min(720px, calc(100vw - 48px));
    max-height: min(80vh, 820px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 24px 72px rgba(17, 24, 39, 0.2);
  }

  .progress-dialog-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding: 24px;
    border-bottom: 1px solid #e5e5e5;
  }

  .progress-dialog-title-wrap {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .progress-dialog-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #fa8c16;
    color: #ffffff;
    font-size: 14px;
    flex-shrink: 0;
  }

  .progress-dialog-header h2 {
    margin: 0;
    color: #1a1a1a;
    font-size: 18px;
    font-weight: 600;
  }

  .progress-dialog-header p {
    margin: 8px 0 0;
    color: #666666;
    font-size: 14px;
    line-height: 1.6;
  }

  .progress-dialog-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: #999999;
    cursor: pointer;
  }

  .progress-dialog-body {
    padding: 20px 24px 24px;
    overflow: auto;
  }

  .progress-overview-card {
    padding: 20px;
    border-radius: 12px;
    background: #f9fafb;
  }

  .progress-overview-main {
    display: grid;
    grid-template-columns: 1fr 1fr 120px;
    gap: 16px;
    align-items: center;
  }

  .progress-overview-main span,
  .progress-overview-main em {
    display: block;
  }

  .progress-overview-main span {
    color: #1a1a1a;
    font-size: 14px;
    font-weight: 600;
  }

  .progress-overview-main strong {
    display: block;
    margin-top: 8px;
    color: #fa541c;
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
  }

  .progress-overview-main > div:nth-child(2) strong {
    color: #1f2937;
  }

  .progress-overview-main em {
    margin-top: 6px;
    color: #1f2937;
    font-size: 13px;
    font-style: normal;
    font-weight: 600;
  }

  .lag-column {
    padding-left: 16px;
    border-left: 1px solid #e5e5e5;
  }

  .progress-overview-track {
    position: relative;
    height: 8px;
    margin-top: 16px;
    overflow: hidden;
    border-radius: 999px;
    background: #e5e5e5;
  }

  .progress-overview-track i {
    position: absolute;
    inset: 0 auto 0 0;
    height: 100%;
    border-radius: inherit;
  }

  .progress-overview-track .planned {
    background: rgba(250, 140, 22, 0.28);
  }

  .progress-overview-track .actual {
    background: #fa8c16;
  }

  .progress-task-section {
    margin-top: 20px;
  }

  .progress-task-section h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 12px;
    color: #1a1a1a;
    font-size: 16px;
    font-weight: 600;
  }

  .done-dot,
  .todo-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .done-dot {
    background: #52c41a;
  }

  .todo-dot {
    background: #ff4d4f;
  }

  .progress-task-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .progress-task-row {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) 160px 110px;
    align-items: center;
    gap: 16px;
    padding: 14px 16px;
    border: 1px solid #f1f3f5;
    border-radius: 10px;
    background: #ffffff;
  }

  .progress-task-main {
    min-width: 0;
  }

  .progress-task-main strong,
  .progress-task-main span {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .progress-task-main strong {
    color: #1a1a1a;
    font-size: 15px;
    font-weight: 600;
  }

  .progress-task-main span,
  .progress-task-time {
    color: #666666;
    font-size: 13px;
  }

  .progress-task-tag {
    justify-self: end;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 88px;
    height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
  }

  .progress-task-tag.done {
    background: rgba(82, 196, 26, 0.12);
    color: #52c41a;
  }

  .progress-task-tag.overdue {
    background: rgba(255, 77, 79, 0.12);
    color: #ff4d4f;
  }

  .progress-task-tag.soon {
    background: rgba(250, 173, 20, 0.14);
    color: #faad14;
  }

  .progress-task-tag.normal {
    background: #f3f4f6;
    color: #6b7280;
  }

  .create-dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(26, 26, 26, 0.52);
    backdrop-filter: blur(2px);
  }

  .create-dialog {
    width: 960px;
    max-height: calc(100vh - 48px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    background: #ffffff;
    color: #1a1a1a;
    box-shadow: 0 24px 80px rgba(17, 24, 39, 0.18);
  }

  .create-dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 72px;
    padding: 0 24px;
    border-bottom: 1px solid #e5e5e5;
  }

  .create-dialog-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .create-dialog-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #1a1a1a;
    cursor: pointer;
  }

  .create-dialog-close .fi {
    font-size: 20px;
  }

  .create-dialog-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    padding: 24px;
    overflow: auto;
  }

  .create-dialog-left,
  .create-dialog-right {
    min-width: 0;
  }

  .field-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 0 0 8px;
  }

  .field-label-row:not(:first-child) {
    margin-top: 16px;
  }

  .field-label-row label {
    color: #1a1a1a;
    font-size: 14px;
    font-weight: 600;
  }

  .field-label-row label span {
    margin-left: 4px;
    color: #ef4444;
  }

  .field-label-row em,
  .field-tip {
    color: #666666;
    font-size: 12px;
    font-style: normal;
    line-height: 1.5;
  }

  .field-tip {
    margin: 0 0 16px;
  }

  .cover-upload {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 280px;
    padding: 24px;
    border: 1px dashed #cfd5df;
    border-radius: 8px;
    background: #ffffff;
    cursor: pointer;
    text-align: center;
  }

  .cover-upload.has-cover {
    position: relative;
    padding: 0;
    overflow: hidden;
    border-style: solid;
  }

  .cover-upload > .fi {
    color: #1a1a1a;
    font-size: 42px;
  }

  .cover-upload strong {
    margin-top: 20px;
    color: #1a1a1a;
    font-size: 16px;
    font-weight: 600;
  }

  .cover-upload span {
    margin-top: 12px;
    color: #666666;
    font-size: 14px;
  }

  .cover-upload button,
  .secondary-mini-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 40px;
    border: 1px solid #d9dee7;
    border-radius: 8px;
    background: #ffffff;
    color: #1a1a1a;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .cover-upload button {
    width: 100%;
    margin-top: 28px;
  }

  .cover-upload img {
    width: 100%;
    height: 100%;
    min-height: 280px;
    object-fit: cover;
  }

  .cover-replace-button {
    position: absolute;
    right: 12px;
    bottom: 12px;
    width: auto !important;
    margin: 0 !important;
    padding: 0 14px;
    background: rgba(255, 255, 255, 0.92) !important;
  }

  .library-cover-picker {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 12px;
  }

  .library-cover-picker button {
    overflow: hidden;
    padding: 0;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    background: #ffffff;
    cursor: pointer;
    text-align: left;
  }

  .library-cover-picker button.is-selected {
    border-color: #1a1a1a;
    box-shadow: 0 0 0 1px #1a1a1a;
  }

  .library-cover-picker img {
    display: block;
    width: 100%;
    height: 64px;
    object-fit: cover;
  }

  .library-cover-picker span {
    display: block;
    padding: 6px 8px;
    color: #666666;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .date-grid {
    display: grid;
    grid-template-columns: 1fr 24px 1fr;
    align-items: center;
    gap: 12px;
  }

  .date-separator {
    text-align: center;
    color: #1a1a1a;
  }

  .date-input,
  .create-input,
  .select-wrap,
  .menu-select-trigger,
  .create-textarea {
    width: 100%;
    border: 1px solid #d9dee7;
    border-radius: 8px;
    background: #ffffff;
  }

  .date-input {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 40px;
    padding: 0 12px;
  }

  .date-input .fi {
    color: #1a1a1a;
    font-size: 16px;
  }

  .date-input-picker {
    flex: 1;
    min-width: 0;
  }

  .date-input-picker .date-time-picker,
  .date-input-picker .date-time-trigger {
    width: 100%;
  }

  .date-input-picker .date-time-trigger {
    min-height: 38px;
    padding: 0;
    border: none;
    background: transparent;
    box-shadow: none;
  }

  .date-input-picker .date-time-icon {
    display: none;
  }

  .date-input input,
  .create-input,
  .select-wrap select,
  .menu-select-trigger,
  .create-textarea {
    color: #1a1a1a;
    font-family: inherit;
    font-size: 14px;
  }

  .date-input input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
  }

  .create-input,
  .select-wrap select,
  .menu-select-trigger {
    height: 40px;
    padding: 0 12px;
    outline: none;
  }

  .inline-create-input {
    margin-top: 8px;
  }

  .select-wrap {
    position: relative;
  }

  .menu-select {
    position: relative;
  }

  .menu-select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    cursor: pointer;
    text-align: left;
  }

  .menu-select-trigger span {
    overflow: hidden;
    color: #a1a1aa;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .menu-select-trigger.has-value span {
    color: #1a1a1a;
  }

  .menu-select-trigger .fi {
    flex-shrink: 0;
    color: #1a1a1a;
    pointer-events: none;
  }

  .menu-select-dropdown {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 8px);
    z-index: 30;
    overflow: hidden;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 18px 40px rgba(17, 24, 39, 0.08);
  }

  .menu-select-dropdown button {
    display: block;
    width: 100%;
    min-height: 40px;
    padding: 10px 12px;
    border: none;
    background: #ffffff;
    color: #1a1a1a;
    font-family: inherit;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }

  .menu-select-dropdown button:hover,
  .menu-select-dropdown button.is-current {
    background: #f7f7f8;
  }

  .select-wrap select {
    appearance: none;
    border: none;
    background: transparent;
  }

  .select-wrap > .fi {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #1a1a1a;
    pointer-events: none;
  }

  .create-textarea {
    min-height: 120px;
    resize: vertical;
    padding: 12px;
    outline: none;
  }

  .member-add-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .secondary-mini-button {
    padding: 0 14px;
  }

  .member-add-row span {
    color: #999999;
    font-size: 12px;
  }

  .create-dialog-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 64px;
    padding: 12px 24px;
    border-top: 1px solid #e5e5e5;
  }

  .create-dialog-error {
    margin: 0;
    color: #ef4444;
    font-size: 13px;
  }

  .create-dialog-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
  }

  .dialog-cancel-button,
  .dialog-submit-button {
    min-width: 124px;
    height: 40px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .dialog-cancel-button {
    border: 1px solid #d9dee7;
    background: #ffffff;
    color: #1a1a1a;
  }

  .dialog-submit-button {
    border: none;
    background: #000000;
    color: #ffffff;
  }

  .asset-picker-backdrop {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(26, 26, 26, 0.36);
  }

  .asset-picker-dialog {
    width: min(960px, calc(100vw - 48px));
    max-height: min(720px, calc(100vh - 48px));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 24px 80px rgba(17, 24, 39, 0.2);
  }

  .asset-picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 72px;
    padding: 18px 24px;
    border-bottom: 1px solid #e5e5e5;
  }

  .asset-picker-header h3 {
    margin: 0;
    color: #1a1a1a;
    font-size: 18px;
    font-weight: 600;
  }

  .asset-picker-header p {
    margin: 6px 0 0;
    color: #666666;
    font-size: 12px;
  }

  .asset-picker-header button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
  }

  .asset-picker-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 24px;
    border-bottom: 1px solid #eeeeee;
  }

  .asset-picker-search,
  .asset-picker-type {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 40px;
    padding: 0 12px;
    border: 1px solid #d9dee7;
    border-radius: 8px;
    background: #ffffff;
  }

  .asset-picker-search {
    flex: 1;
    min-width: 0;
  }

  .asset-picker-type {
    width: 160px;
  }

  .asset-picker-search .fi,
  .asset-picker-type .fi {
    color: #666666;
  }

  .asset-picker-search input,
  .asset-picker-type select {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    color: #1a1a1a;
    font-family: inherit;
    font-size: 14px;
  }

  .asset-picker-type select {
    appearance: none;
    cursor: pointer;
  }

  .asset-picker-body {
    display: grid;
    grid-template-columns: 152px minmax(0, 1fr);
    min-height: 0;
    flex: 1;
  }

  .asset-picker-sidebar {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px 12px;
    border-right: 1px solid #eeeeee;
    background: #fbfbfc;
  }

  .asset-picker-sidebar button {
    display: flex;
    align-items: center;
    gap: 9px;
    height: 38px;
    padding: 0 11px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: #555555;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
  }

  .asset-picker-sidebar button:hover,
  .asset-picker-sidebar button.is-active {
    border-color: #eeeeee;
    background: #ffffff;
    color: #1a1a1a;
  }

  .asset-picker-sidebar .fi {
    width: 15px;
    color: currentColor;
    font-size: 15px;
  }

  .asset-picker-content {
    min-width: 0;
    overflow: auto;
    padding: 16px 20px 20px;
  }

  .asset-picker-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  .asset-card {
    position: relative;
    overflow: hidden;
    padding: 0;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    background: #ffffff;
    cursor: pointer;
    text-align: left;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }

  .asset-card:hover {
    border-color: #cfcfcf;
    transform: translateY(-1px);
  }

  .asset-card.is-selected {
    border-color: #1a1a1a;
    box-shadow: 0 0 0 1px #1a1a1a;
  }

  .asset-card-check {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.86);
    color: transparent;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .asset-card.is-selected .asset-card-check {
    border-color: #1a1a1a;
    background: #1a1a1a;
    color: #ffffff;
  }

  .asset-card-check .fi {
    font-size: 11px;
  }

  .asset-card img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    background: #f5f5f7;
  }

  .asset-card-copy {
    display: block;
    padding: 10px 10px 12px;
  }

  .asset-card strong,
  .asset-card em,
  .asset-card small {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .asset-card strong {
    color: #1a1a1a;
    font-size: 13px;
    font-weight: 600;
  }

  .asset-card em {
    margin-top: 5px;
    color: #999999;
    font-style: normal;
    font-size: 12px;
  }

  .asset-card small {
    margin-top: 4px;
    color: #666666;
    font-size: 12px;
  }

  .asset-picker-empty {
    grid-column: 1 / -1;
    display: flex;
    min-height: 260px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #999999;
    text-align: center;
    font-size: 14px;
  }

  .asset-picker-empty .fi {
    color: #c8c8c8;
    font-size: 28px;
  }

  .asset-picker-empty strong {
    color: #333333;
    font-size: 14px;
    font-weight: 600;
  }

  .asset-picker-empty span {
    color: #999999;
    font-size: 12px;
  }

  .asset-picker-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 64px;
    padding: 12px 24px;
    border-top: 1px solid #e5e5e5;
    background: #ffffff;
  }

  .asset-picker-footer > span {
    min-width: 0;
    overflow: hidden;
    color: #666666;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .asset-picker-footer > div {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .dialog-submit-button:disabled {
    background: #d1d5db;
    color: #ffffff;
    cursor: not-allowed;
  }

  .replace-cover-backdrop {
    position: fixed;
    inset: 0;
    z-index: 110;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(6px);
  }

  .replace-cover-dialog {
    width: min(720px, calc(100vw - 48px));
    overflow: hidden;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 24px 72px rgba(17, 24, 39, 0.22);
  }

  .replace-cover-header {
    position: relative;
    padding: 24px 56px 20px 24px;
  }

  .replace-cover-header h2 {
    margin: 0;
    color: #1a1a1a;
    font-size: 20px;
    font-weight: 600;
    line-height: 1.25;
  }

  .replace-cover-header p {
    margin: 12px 0 0;
    color: #666666;
    font-size: 14px;
    line-height: 1.5;
  }

  .replace-cover-close {
    position: absolute;
    top: 16px;
    right: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: #f5f5f5;
    color: #1a1a1a;
    cursor: pointer;
  }

  .replace-cover-close .fi {
    font-size: 18px;
  }

  .replace-cover-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 56px minmax(0, 1fr);
    gap: 24px;
    padding: 20px 24px 32px;
  }

  .replace-cover-current h3,
  .replace-cover-next h3 {
    margin: 0 0 16px;
    color: #1a1a1a;
    font-size: 14px;
    font-weight: 600;
  }

  .replace-cover-current img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border-radius: 8px;
    background: #f5f5f5;
  }

  .replace-cover-divider {
    display: grid;
    grid-template-rows: 1fr 32px 1fr;
    align-items: center;
    justify-items: center;
    padding-top: 42px;
    color: #1a1a1a;
  }

  .replace-cover-divider span {
    width: 1px;
    height: 100%;
    background: #e5e5e5;
  }

  .replace-cover-divider .fi {
    font-size: 18px;
  }

  .replace-upload-box {
    display: flex;
    min-height: 160px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    border: 1px dashed #cccccc;
    border-radius: 8px;
    background: #ffffff;
    color: #1a1a1a;
    cursor: pointer;
    text-align: center;
  }

  .replace-upload-box.has-preview {
    padding: 0;
    overflow: hidden;
    border-style: solid;
  }

  .replace-upload-box > .fi {
    font-size: 44px;
  }

  .replace-upload-box strong {
    margin-top: 16px;
    color: #1a1a1a;
    font-size: 14px;
    font-weight: 600;
  }

  .replace-upload-box span {
    margin-top: 8px;
    color: #666666;
    font-size: 12px;
    line-height: 1.5;
  }

  .replace-upload-box img {
    width: 100%;
    height: 100%;
    min-height: 160px;
    object-fit: cover;
  }

  .replace-cover-or {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 16px;
    margin: 12px 0;
    color: #666666;
    font-size: 12px;
  }

  .replace-cover-or span {
    height: 1px;
    background: #e5e5e5;
  }

  .replace-library-button {
    display: grid;
    grid-template-columns: 20px 1fr 16px;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 44px;
    padding: 0 16px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    background: #ffffff;
    color: #1a1a1a;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .replace-library-button .fi {
    font-size: 16px;
  }

  .replace-cover-error {
    margin: 10px 0 0;
    color: #ef4444;
    font-size: 12px;
  }

  .replace-cover-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 24px;
    border-top: 1px solid #e5e5e5;
  }

  @media (max-width: 1080px) {
    .asset-picker-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .asset-picker-body {
      grid-template-columns: 1fr;
    }

    .asset-picker-sidebar {
      flex-direction: row;
      overflow-x: auto;
      border-right: none;
      border-bottom: 1px solid #eeeeee;
    }

    .asset-picker-toolbar,
    .asset-picker-footer {
      align-items: stretch;
      flex-direction: column;
    }

    .asset-picker-type {
      width: 100%;
    }

    .asset-picker-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .replace-cover-body {
      grid-template-columns: 1fr;
    }

    .replace-cover-divider {
      display: none;
    }
  }


  .overview-web-only-header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 16px 0;
  }

  .overview-web-only-header button {
    width: 40px;
    height: 40px;
    border: 1px solid #f3f4f6;
    border-radius: 50%;
    background: #ffffff;
  }

  .overview-web-only-header span {
    display: block;
    color: #6b7280;
    font-size: 12px;
  }

  .overview-web-only-header strong {
    color: #111827;
    font-size: 16px;
    font-weight: 700;
  }

  .overview-web-only-card {
    margin: 18px 16px 24px;
    padding: 24px 18px;
    border: 1px solid #f3f4f6;
    border-radius: 16px;
    background: #ffffff;
  }

  .overview-web-only-card h1 {
    margin: 0 0 10px;
    color: #111827;
    font-size: 22px;
    font-weight: 800;
    line-height: 1.2;
  }

  .overview-web-only-card p {
    margin: 0;
    color: #4b5563;
    font-size: 14px;
    line-height: 1.7;
  }

  @media (max-width: 1500px) {
    .overview-header {
      height: 82px;
      min-width: 1120px;
    }

    .overview-header-brand {
      min-width: 150px;
    }

    .overview-header-actions {
      min-width: 220px;
      gap: 12px;
    }

    .overview-canvas {
      height: calc(100% - 82px);
    }

    .overview-content {
      min-width: 1120px;
      grid-template-columns: 284px minmax(0, 1fr);
      padding-left: 32px;
      padding-right: 32px;
    }

    .poster-image-wrap {
      height: 178px;
    }

    .project-title {
      font-size: 24px;
    }

    .project-copy {
      font-size: 14px;
    }

    .hero-block {
      grid-template-columns: minmax(0, 1fr) 190px;
    }

    .project-dropdown-trigger {
      min-width: 260px;
    }

    .hero-actions {
      gap: 14px;
    }

    .hero-primary,
    .hero-secondary {
      padding: 0 18px;
    }

    .overview-metric-item {
      min-height: 160px;
    }

    .overview-metric-value {
      margin-top: 28px;
    }

    .overview-metric-hint,
    .overview-metric-track {
      margin-top: 18px;
    }

    .task-card-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 1280px) {
    .task-card-grid {
      grid-template-columns: 1fr;
    }
  }
`;
