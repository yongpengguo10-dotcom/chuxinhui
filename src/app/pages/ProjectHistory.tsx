import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Gauge,
  Image as ImageIcon,
  Layers3,
  MoreHorizontal,
  Search,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { Project } from "../data/projects";
import { Task } from "../data/tasks";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ProjectImage } from "./ProjectImageLibrary";

type HistoryStatus = "已完成" | "已取消";
type StatusFilter = "全部状态" | HistoryStatus;

interface ProjectHistoryProps {
  projects: Project[];
  tasks: Task[];
  projectImages: ProjectImage[];
  showToast: (msg: string) => void;
}

interface HistoryProject {
  project: Project;
  status: HistoryStatus;
  startDate: string;
  endDate: string;
}

interface ProjectWithOptionalStatus extends Project {
  status?: string;
  createdAt?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const HISTORY_STATUSES: StatusFilter[] = ["全部状态", "已完成", "已取消"];

export function ProjectHistory({ projects, tasks, projectImages, showToast }: ProjectHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("全部状态");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("全部人员");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("全部项目");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailProject, setDetailProject] = useState<HistoryProject | null>(null);

  const historyProjects = useMemo(() => {
    return projects
      .filter(project => !isArchivedProject(project))
      .map(project => {
        const status = resolveHistoryStatus(project);
        return {
          project,
          status,
          startDate: project.date,
          endDate: project.endDate || project.date,
        };
      });
  }, [projects]);

  const ownerOptions = useMemo(() => {
    return Array.from(new Set(historyProjects.map(item => item.project.owner).filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  }, [historyProjects]);

  const projectOptions = useMemo(() => {
    return [...historyProjects]
      .sort((a, b) => a.project.fullName.localeCompare(b.project.fullName, "zh-Hans-CN"))
      .map(item => item.project);
  }, [historyProjects]);

  const filteredProjects = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return historyProjects
      .filter(item => statusFilter === "全部状态" || item.status === statusFilter)
      .filter(item => !startDate || item.endDate >= startDate)
      .filter(item => !endDate || item.startDate <= endDate)
      .filter(item => ownerFilter === "全部人员" || item.project.owner === ownerFilter)
      .filter(item => scope === "全部项目" || item.project.id === scope)
      .filter(item => {
        if (!keyword) return true;
        return [item.project.fullName, item.project.name, item.project.series, item.project.owner]
          .some(value => value.toLowerCase().includes(keyword));
      })
      .sort((a, b) => {
        const diff = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        return sortDirection === "desc" ? -diff : diff;
      });
  }, [endDate, historyProjects, ownerFilter, query, scope, sortDirection, startDate, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const pageItems = filteredProjects.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [endDate, ownerFilter, pageSize, query, scope, startDate, statusFilter, sortDirection]);

  useEffect(() => {
    setPage(current => Math.min(current, totalPages));
  }, [totalPages]);

  const resetFilters = () => {
    setStatusFilter("全部状态");
    setStartDate("");
    setEndDate("");
    setOwnerFilter("全部人员");
    setQuery("");
    setScope("全部项目");
    setSortDirection("desc");
  };

  const totalLabel = `共 ${filteredProjects.length} 个项目`;

  return (
    <>
      <main className="project-history-page">
        <aside className="project-history-sidebar">
          <h2>筛选条件</h2>

          <section className="history-filter-group">
            <label>项目状态</label>
            <div className="history-status-options">
              {HISTORY_STATUSES.map(status => (
                <button
                  key={status}
                  type="button"
                  className={statusFilter === status ? "is-active" : ""}
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </section>

          <section className="history-filter-group">
            <label>项目时间</label>
            <div className="history-date-range">
              <input aria-label="开始日期" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />
              <span>~</span>
              <input aria-label="结束日期" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} />
            </div>
          </section>

          <section className="history-filter-group">
            <label>项目负责人</label>
            <select value={ownerFilter} onChange={event => setOwnerFilter(event.target.value)}>
              <option value="全部人员">全部人员</option>
              {ownerOptions.map(owner => <option key={owner} value={owner}>{owner}</option>)}
            </select>
          </section>

          <div className="history-filter-actions">
            <button type="button" className="history-reset-button" onClick={resetFilters}>重置筛选</button>
            <button
              type="button"
              className="history-export-button"
              onClick={() => showToast("导出项目列表入口已保留")}
            >
              <Download size={15} />
              导出项目列表
            </button>
          </div>
        </aside>

        <section className="project-history-content">
          <div className="history-page-heading">
            <div>
              <h1>历史项目</h1>
              <p>查看和管理历史项目。</p>
            </div>
            <div className="history-toolbar">
              <label className="history-search">
                <Search size={16} />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="搜索项目名称或负责人..."
                />
              </label>
              <select value={scope} onChange={event => setScope(event.target.value)} aria-label="项目范围">
                <option value="全部项目">全部项目</option>
                {projectOptions.map(project => <option key={project.id} value={project.id}>{project.fullName}</option>)}
              </select>
            </div>
          </div>

          <div className="history-table-header">
            <span>项目名称</span>
            <span>项目目标</span>
            <span>负责人</span>
            <span>时间范围</span>
            <span>状态</span>
            <span>操作</span>
          </div>

          <div className="history-card-list">
            {pageItems.length ? pageItems.map(item => (
              <ProjectHistoryCard key={item.project.id} item={item} onViewProject={setDetailProject} />
            )) : (
              <div className="history-empty-state">暂无历史项目</div>
            )}
          </div>

          <footer className="history-pagination">
            <span>{totalLabel}</span>
            <div className="history-page-controls">
              <button type="button" disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))} aria-label="上一页">
                <ChevronLeft size={16} />
              </button>
              {getPageNumbers(totalPages, page).map(pageNumber => (
                <button
                  key={pageNumber}
                  type="button"
                  className={page === pageNumber ? "is-active" : ""}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button type="button" disabled={page === totalPages} onClick={() => setPage(current => Math.min(totalPages, current + 1))} aria-label="下一页">
                <ChevronRight size={16} />
              </button>
              <select value={pageSize} onChange={event => setPageSize(Number(event.target.value))} aria-label="每页条数">
                {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size} 条/页</option>)}
              </select>
            </div>
          </footer>
        </section>
      </main>
      {detailProject && (
        <ProjectDetailModal
          item={detailProject}
          images={projectImages}
          tasks={tasks}
          onClose={() => setDetailProject(null)}
          showToast={showToast}
        />
      )}
      <style>{projectHistoryCss}</style>
    </>
  );
}

function ProjectHistoryCard({ item, onViewProject }: { item: HistoryProject; onViewProject: (item: HistoryProject) => void }) {
  const { project, status } = item;
  const initial = (project.name || project.series || project.fullName || "项").slice(0, 1);

  return (
    <article className="history-project-card">
      <div className="history-project-name-cell">
        <div className="history-project-cover">
          {project.coverUrl ? <ImageWithFallback src={project.coverUrl} alt={project.fullName} /> : <span>{initial}</span>}
        </div>
        <div>
          <h3>{project.fullName}</h3>
          <p>{project.notes || `${project.fullName}项目内部主页`}</p>
        </div>
      </div>
      <div className="history-goal-cell">{project.goals || "未填写项目目标"}</div>
      <div className="history-owner-cell">
        <span className="history-owner-avatar">{project.owner.slice(0, 1) || "人"}</span>
        <span>{project.owner || "未分配"}</span>
      </div>
      <div className="history-date-cell">
        <span>{item.startDate}</span>
        <em>~</em>
        <span>{item.endDate}</span>
      </div>
      <div>
        <span className={`history-status-badge ${status === "已完成" ? "done" : "cancelled"}`}>
          <i />
          {status}
        </span>
      </div>
      <div className="history-card-actions">
        <button type="button" onClick={() => onViewProject(item)}>查看详情</button>
        <button type="button" aria-label="更多操作" title="更多操作"><MoreHorizontal size={17} /></button>
      </div>
    </article>
  );
}

function ProjectDetailModal({
  item,
  images,
  tasks,
  onClose,
  showToast,
}: {
  item: HistoryProject;
  images: ProjectImage[];
  tasks: Task[];
  onClose: () => void;
  showToast: (msg: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"images" | "files">("images");
  const { project, status } = item;
  const projectImages = useMemo(() => {
    return images
      .filter(image => image.projectId === project.id)
      .sort((a, b) => getLatestImageTime(b).localeCompare(getLatestImageTime(a)));
  }, [images, project.id]);
  const projectFiles = useMemo(() => getProjectFiles(tasks, project.id), [tasks, project.id]);
  const activeResource = activeTab === "images"
    ? {
      key: "images",
      title: "图片",
      count: projectImages.length,
      actionLabel: `查看全部（${projectImages.length}）`,
      emptyText: "暂无图片",
    }
    : {
      key: "files",
      title: "文件",
      count: projectFiles.length,
      actionLabel: `查看全部（${projectFiles.length}）`,
      emptyText: "暂无文件",
    };
  const initial = (project.name || project.series || project.fullName || "项").slice(0, 1);
  const createdAt = getProjectCreatedAt(project);
  const completeAt = project.endDate || project.date || "暂无";

  return (
    <div className="project-detail-overlay" role="dialog" aria-modal="true" aria-label={`${project.fullName}详情`} onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="project-detail-modal" onMouseDown={event => event.stopPropagation()}>
        <button type="button" className="project-detail-close" aria-label="关闭" onClick={onClose}>
          <X size={22} />
        </button>

        <div className="project-detail-scroll">
          <header className="project-detail-head">
            <div className="project-detail-cover">
              {project.coverUrl ? <ImageWithFallback src={project.coverUrl} alt={project.fullName} /> : <span>{initial}</span>}
            </div>
            <div className="project-detail-title">
              <div className="project-detail-title-line">
                <h2>{project.fullName}</h2>
                <span className={`history-status-badge ${status === "已完成" ? "done" : "cancelled"}`}>
                  <i />
                  {status}
                </span>
              </div>
              <p>{project.notes || `${project.fullName}项目内部主页`}</p>
            </div>
          </header>

          <div className="project-detail-meta-grid">
            <DetailMeta icon={<Target size={15} />} label="项目目标" value={project.goals || "暂无"} />
            <DetailMeta icon={<UserRound size={15} />} label="项目负责人" value={project.owner || "暂无"} avatarText={project.owner?.slice(0, 1)} />
            <DetailMeta icon={<CalendarDays size={15} />} label="创建时间" value={createdAt} />
            <DetailMeta icon={<CalendarDays size={15} />} label="完成时间" value={completeAt} />
            <DetailMeta icon={<Layers3 size={15} />} label="项目阶段" value={project.phase || "暂无"} />
            <DetailMeta icon={<Gauge size={15} />} label="整体完成度" value={`${project.completion ?? 0}%`} />
          </div>

          <div className="project-detail-tabs" role="tablist" aria-label="项目资源">
            <button type="button" className={activeTab === "images" ? "is-active" : ""} onClick={() => setActiveTab("images")}>图片</button>
            <button type="button" className={activeTab === "files" ? "is-active" : ""} onClick={() => setActiveTab("files")}>文件</button>
          </div>

          <ResourceSection
            key={activeResource.key}
            title={activeResource.title}
            count={activeResource.count}
            actionLabel={activeResource.actionLabel}
          >
            {activeTab === "images" ? (
              projectImages.length ? (
                <div className="project-detail-image-grid">
                  {projectImages.map(image => {
                    const latest = image.versions[image.versions.length - 1];
                    return (
                      <article className="detail-image-card" key={image.id}>
                        <div className="detail-image-thumb">
                          {latest?.url ? <ImageWithFallback src={latest.url} alt={image.title} /> : <ImageIcon size={28} />}
                        </div>
                        <div className="detail-resource-body">
                          <strong>{image.title}</strong>
                          <span>{latest?.uploadTime || image.acceptedAt || "暂无时间"}</span>
                          <small>{getImageSizeText(image)}</small>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="project-detail-empty">{activeResource.emptyText}</div>
              )
            ) : (
              projectFiles.length ? (
                <div className="project-detail-file-grid">
                  {projectFiles.map(file => (
                    <article className="detail-file-card" key={file.id}>
                      <span className={`detail-file-icon ${file.type}`}>{file.typeLabel}</span>
                      <div className="detail-resource-body">
                        <strong>{file.name}</strong>
                        <span>{file.createdAt}</span>
                        <small>{file.size || "暂无大小"}</small>
                      </div>
                      <button type="button" aria-label={`下载${file.name}`} onClick={() => handleFileDownload(file, showToast)}>
                        <Download size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="project-detail-empty">{activeResource.emptyText}</div>
              )
            )}
          </ResourceSection>
        </div>

        <footer className="project-detail-footer">
          <button type="button" onClick={onClose}>关闭</button>
        </footer>
      </section>
    </div>
  );
}

function DetailMeta({ icon, label, value, avatarText }: { icon: ReactNode; label: string; value: string; avatarText?: string }) {
  return (
    <div className="project-detail-meta">
      <div className="project-detail-meta-label">
        {icon}
        <span>{label}</span>
      </div>
      <div className="project-detail-meta-value">
        {avatarText && <span className="history-owner-avatar">{avatarText}</span>}
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function ResourceSection({ title, count, actionLabel, children }: { title: string; count: number; actionLabel: string; children: ReactNode }) {
  return (
    <section className="project-detail-resource">
      <div className="project-detail-resource-head">
        <h3>{title}（{count}）</h3>
        <button type="button">{actionLabel}</button>
      </div>
      {children}
    </section>
  );
}

interface DetailFileResource {
  id: string;
  name: string;
  createdAt: string;
  size?: string;
  url?: string;
  type: "doc" | "sheet" | "ppt" | "zip" | "file";
  typeLabel: string;
}

function getProjectCreatedAt(project: Project) {
  const { createdAt } = project as ProjectWithOptionalStatus;
  return createdAt || project.date || "暂无";
}

function getLatestImageTime(image: ProjectImage) {
  return image.versions[image.versions.length - 1]?.uploadTime || image.acceptedAt || "";
}

function getImageSizeText(image: ProjectImage) {
  const latest = image.versions[image.versions.length - 1];
  const imageWithSize = image as ProjectImage & { size?: string };
  const versionWithSize = latest as typeof latest & { size?: string };
  return versionWithSize?.size || imageWithSize.size || "暂无大小";
}

function getProjectFiles(tasks: Task[], projectId: string): DetailFileResource[] {
  const seen = new Set<string>();
  return tasks
    .filter(task => task.projectId === projectId)
    .flatMap(task => {
      const resources: DetailFileResource[] = [];
      if (task.resultFileName) {
        resources.push(toDetailFileResource({
          id: `${task.id}:file`,
          name: task.resultFileName,
          createdAt: task.submittedAt || task.reviewedAt || task.deadline || "暂无时间",
        }));
      }
      if (task.resultLink && task.resultType !== "图片") {
        resources.push(toDetailFileResource({
          id: `${task.id}:link`,
          name: task.resultFileName || `${task.name}交付链接`,
          createdAt: task.submittedAt || task.reviewedAt || task.deadline || "暂无时间",
          url: task.resultLink,
        }));
      }
      return resources;
    })
    .filter(file => {
      const key = `${file.name}:${file.url || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function toDetailFileResource(file: Pick<DetailFileResource, "id" | "name" | "createdAt" | "url">): DetailFileResource {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) return { ...file, type: "sheet", typeLabel: "表" };
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return { ...file, type: "ppt", typeLabel: "演" };
  if (lower.endsWith(".zip") || lower.endsWith(".rar") || lower.endsWith(".7z")) return { ...file, type: "zip", typeLabel: "压" };
  if (lower.endsWith(".doc") || lower.endsWith(".docx") || lower.endsWith(".pdf")) return { ...file, type: "doc", typeLabel: "文" };
  return { ...file, type: "file", typeLabel: "件" };
}

function handleFileDownload(file: DetailFileResource, showToast: (msg: string) => void) {
  if (file.url) {
    window.open(file.url, "_blank", "noopener,noreferrer");
    return;
  }
  showToast("下载入口已保留");
}

function isArchivedProject(project: Project) {
  const { status = "" } = project as ProjectWithOptionalStatus;
  return `${status} ${project.phase || ""}`.includes("归档");
}

function resolveHistoryStatus(project: Project): HistoryStatus {
  const phase = project.phase || "";
  const projectWithStatus = project as ProjectWithOptionalStatus;
  const rawStatus = projectWithStatus.status || phase;

  if (rawStatus.includes("取消") || rawStatus.toLowerCase().includes("cancel")) return "已取消";
  if (rawStatus.includes("完成") || rawStatus.toLowerCase().includes("done") || rawStatus.toLowerCase().includes("complete")) return "已完成";
  if (project.completion >= 100) return "已完成";

  const projectEndTime = new Date(project.endDate || project.date).getTime();
  if (Number.isFinite(projectEndTime) && projectEndTime < Date.now()) return "已完成";

  return "已完成";
}

function getPageNumbers(totalPages: number, currentPage: number) {
  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  return Array.from(pages)
    .filter(page => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

const projectHistoryCss = `
.project-history-page {
  height: 100%;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  background: #f9fafb;
  color: #101828;
  overflow: hidden;
}
.project-history-sidebar {
  border-right: 1px solid #e6eaf0;
  background: #ffffff;
  padding: 46px 36px;
  overflow: auto;
}
.project-history-sidebar h2 {
  margin: 0 0 26px;
  font-size: 16px;
  font-weight: 800;
}
.history-filter-group {
  margin-bottom: 30px;
}
.history-filter-group label {
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 700;
  color: #333946;
}
.history-status-options {
  display: grid;
  gap: 10px;
}
.history-status-options button,
.history-filter-group select,
.history-date-range,
.history-toolbar select {
  width: 100%;
  min-height: 40px;
  border: 1px solid #e1e5eb;
  border-radius: 8px;
  background-color: #ffffff;
  color: #101828;
  font-size: 13px;
  font-weight: 600;
}
.history-status-options button {
  text-align: left;
  padding: 0 16px;
  cursor: pointer;
}
.history-status-options button.is-active {
  border-color: #101828;
  box-shadow: inset 0 0 0 1px #101828;
}
.history-filter-group select,
.history-toolbar select {
  height: 40px;
  padding: 0 14px;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}
.history-date-range {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
}
.history-date-range input {
  min-width: 0;
  border: 0;
  outline: 0;
  font-size: 12px;
  color: #667085;
  background: transparent;
}
.history-date-range span {
  color: #98a2b3;
  font-size: 12px;
}
.history-filter-actions {
  display: grid;
  gap: 12px;
  margin-top: 40px;
}
.history-reset-button,
.history-export-button {
  height: 40px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.history-reset-button {
  border: 0;
  color: #ffffff;
  background: #101010;
}
.history-export-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #e1e5eb;
  color: #101828;
  background: #ffffff;
}
.project-history-content {
  --history-grid-columns: minmax(180px, 1.7fr) minmax(84px, 1fr) 76px 200px 82px 106px;
  --history-grid-gap: 10px;
  --history-row-padding-x: 24px;
  min-width: 0;
  padding: 44px 48px 28px;
  overflow: auto;
}
.history-page-heading {
  max-width: 1500px;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(520px, auto);
  align-items: start;
  gap: 24px;
  margin: 0 auto 30px;
}
.history-page-heading h1 {
  margin: 0;
  font-size: 26px;
  line-height: 1.2;
  font-weight: 850;
  letter-spacing: 0;
}
.history-page-heading p {
  margin: 10px 0 0;
  font-size: 14px;
  color: #667085;
}
.history-toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 360px) 160px;
  gap: 14px;
}
.history-search {
  height: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e1e5eb;
  border-radius: 8px;
  background: #ffffff;
  padding: 0 14px;
  color: #98a2b3;
}
.history-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  color: #101828;
  font-size: 13px;
  background: transparent;
}
.history-table-header,
.history-card-list,
.history-empty-state,
.history-pagination {
  max-width: 1500px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
}
.history-table-header,
.history-project-card {
  display: grid;
  grid-template-columns: var(--history-grid-columns);
  gap: var(--history-grid-gap);
  align-items: center;
  box-sizing: border-box;
}
.history-table-header {
  padding: 0 var(--history-row-padding-x) 14px;
  border-left: 1px solid transparent;
  border-right: 1px solid transparent;
  font-size: 13px;
  color: #333946;
  font-weight: 800;
}
.history-card-list {
  display: grid;
  gap: 12px;
}
.history-project-card {
  width: 100%;
  min-height: 116px;
  padding: 20px var(--history-row-padding-x);
  border: 1px solid #e6eaf0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.03), 0 10px 26px rgba(16, 24, 40, 0.04);
}
.history-project-name-cell {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 18px;
}
.history-project-cover {
  width: 64px;
  height: 64px;
  flex: 0 0 64px;
  overflow: hidden;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #111111, #6b7280);
  color: #ffffff;
}
.history-project-cover span {
  font-size: 26px;
  font-weight: 850;
}
.history-project-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.history-project-name-cell h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 850;
  line-height: 1.35;
  color: #101828;
}
.history-project-name-cell p,
.history-goal-cell,
.history-owner-cell,
.history-date-cell {
  font-size: 14px;
  color: #344054;
}
.history-project-name-cell p {
  margin: 8px 0 0;
  color: #4b5563;
}
.history-goal-cell {
  line-height: 1.6;
}
.history-owner-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
}
.history-owner-avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e8f1ff;
  border: 1px solid #bad6ff;
  color: #1677ff;
  font-size: 12px;
  font-weight: 850;
}
.history-date-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  font-weight: 700;
}
.history-date-cell em {
  font-style: normal;
  color: #667085;
}
.history-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 850;
}
.history-status-badge i {
  width: 7px;
  height: 7px;
  border-radius: 999px;
}
.history-status-badge.done {
  background: #dcf8e8;
  color: #12804a;
}
.history-status-badge.done i {
  background: #12b76a;
}
.history-status-badge.cancelled {
  background: #eef1f5;
  color: #667085;
}
.history-status-badge.cancelled i {
  background: #667085;
}
.history-card-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.history-card-actions button {
  height: 36px;
  border: 1px solid #e1e5eb;
  border-radius: 8px;
  background: #ffffff;
  color: #101828;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
  white-space: nowrap;
}
.history-card-actions button:first-child {
  min-width: 78px;
  padding: 0 10px;
}
.history-card-actions button:last-child {
  width: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.history-empty-state {
  min-height: 260px;
  border: 1px dashed #d0d5dd;
  border-radius: 8px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667085;
  font-size: 14px;
  font-weight: 700;
}
.history-pagination {
  margin: 20px auto 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  color: #344054;
  font-size: 14px;
  font-weight: 700;
}
.history-page-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}
.history-page-controls button {
  min-width: 36px;
  height: 36px;
  border: 1px solid #e1e5eb;
  border-radius: 8px;
  background: #ffffff;
  color: #101828;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.history-page-controls button:disabled {
  opacity: .45;
  cursor: not-allowed;
}
.history-page-controls button.is-active {
  border-color: #101010;
  background: #101010;
  color: #ffffff;
}
.history-page-controls select {
  height: 36px;
  border: 1px solid #e1e5eb;
  border-radius: 8px;
  background-color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  color: #101828;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
}
.project-detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgba(16, 24, 40, 0.54);
  backdrop-filter: blur(2px);
}
.project-detail-modal {
  width: min(1200px, calc(100vw - 64px));
  max-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  position: relative;
  border-radius: 16px;
  border: 1px solid #e6eaf0;
  background: #ffffff;
  box-shadow: 0 24px 80px rgba(16, 24, 40, 0.18);
  overflow: hidden;
}
.project-detail-close {
  position: absolute;
  top: 28px;
  right: 28px;
  z-index: 2;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #101828;
  cursor: pointer;
}
.project-detail-close:hover {
  background: #f2f4f7;
}
.project-detail-scroll {
  padding: 32px 32px 24px;
  overflow: auto;
}
.project-detail-head {
  display: flex;
  align-items: center;
  gap: 18px;
  padding-right: 56px;
}
.project-detail-cover {
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
  border-radius: 8px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #111111, #59616f);
  color: #ffffff;
  font-size: 25px;
  font-weight: 900;
}
.project-detail-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.project-detail-title {
  min-width: 0;
}
.project-detail-title-line {
  display: flex;
  align-items: center;
  gap: 12px;
}
.project-detail-title h2 {
  margin: 0;
  font-size: 22px;
  line-height: 1.3;
  font-weight: 900;
  letter-spacing: 0;
  color: #101828;
}
.project-detail-title p {
  margin: 8px 0 0;
  color: #475467;
  font-size: 14px;
  font-weight: 600;
}
.project-detail-meta-grid {
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 22px;
}
.project-detail-meta {
  min-width: 0;
}
.project-detail-meta-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #667085;
  font-size: 12px;
  font-weight: 800;
}
.project-detail-meta-value {
  margin-top: 9px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.project-detail-meta-value strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #101828;
  font-size: 13px;
  font-weight: 850;
}
.project-detail-tabs {
  margin-top: 34px;
  display: flex;
  align-items: center;
  gap: 28px;
  border-bottom: 1px solid #e6eaf0;
}
.project-detail-tabs button {
  position: relative;
  height: 44px;
  border: 0;
  background: transparent;
  color: #475467;
  font-size: 15px;
  font-weight: 850;
  cursor: pointer;
}
.project-detail-tabs button.is-active {
  color: #101828;
}
.project-detail-tabs button.is-active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  border-radius: 999px;
  background: #101828;
}
.project-detail-resource {
  margin-top: 24px;
}
.project-detail-resource-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.project-detail-resource-head h3 {
  margin: 0;
  color: #101828;
  font-size: 15px;
  font-weight: 900;
}
.project-detail-resource-head button {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #e1e5eb;
  border-radius: 8px;
  background: #ffffff;
  color: #344054;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}
.project-detail-image-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.detail-image-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e1e5eb;
  border-radius: 8px;
  background: #ffffff;
}
.detail-image-thumb {
  aspect-ratio: 1.45;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f2f4f7;
  color: #98a2b3;
  overflow: hidden;
}
.detail-image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.detail-resource-body {
  min-width: 0;
  display: grid;
  gap: 6px;
  padding: 12px;
}
.detail-resource-body strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #101828;
  font-size: 13px;
  font-weight: 900;
}
.detail-resource-body span,
.detail-resource-body small {
  color: #667085;
  font-size: 12px;
  font-weight: 650;
}
.project-detail-file-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.detail-file-card {
  min-width: 0;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 12px;
  border: 1px solid #e1e5eb;
  border-radius: 8px;
  background: #ffffff;
}
.detail-file-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
}
.detail-file-icon.doc { background: #ef4444; }
.detail-file-icon.sheet { background: #12b76a; }
.detail-file-icon.ppt { background: #f97316; }
.detail-file-icon.zip { background: #f59e0b; }
.detail-file-icon.file { background: #667085; }
.detail-file-card .detail-resource-body {
  padding: 0;
}
.detail-file-card button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #475467;
  cursor: pointer;
}
.detail-file-card button:hover {
  background: #f2f4f7;
}
.project-detail-empty {
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #d0d5dd;
  border-radius: 8px;
  background: #ffffff;
  color: #667085;
  font-size: 14px;
  font-weight: 800;
}
.project-detail-footer {
  display: flex;
  justify-content: flex-end;
  padding: 16px 32px 24px;
  background: #ffffff;
}
.project-detail-footer button {
  height: 38px;
  min-width: 88px;
  padding: 0 18px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #ffffff;
  color: #101828;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}
@media (max-width: 1180px) {
  .project-history-page {
    grid-template-columns: 240px minmax(0, 1fr);
  }
  .project-history-sidebar {
    padding: 32px 24px;
  }
  .project-history-content {
    --history-grid-columns: minmax(168px, 1.5fr) minmax(76px, 1fr) 72px 200px 78px 102px;
    --history-grid-gap: 8px;
    --history-row-padding-x: 20px;
    padding: 32px 24px;
  }
  .history-page-heading {
    grid-template-columns: 1fr;
  }
  .history-toolbar {
    grid-template-columns: minmax(220px, 1fr) 150px;
  }
  .project-detail-meta-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .project-detail-image-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .project-detail-file-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .project-history-page {
    grid-template-columns: 1fr;
    overflow: auto;
  }
  .project-history-sidebar,
  .project-history-content {
    overflow: visible;
  }
  .history-toolbar,
  .history-table-header,
  .history-project-card {
    --history-grid-columns: 1fr;
    grid-template-columns: var(--history-grid-columns);
  }
  .history-table-header {
    display: none;
  }
  .history-card-actions,
  .history-pagination {
    justify-content: flex-start;
  }
  .history-pagination {
    align-items: flex-start;
    flex-direction: column;
  }
  .project-detail-overlay {
    padding: 16px;
  }
  .project-detail-modal {
    width: calc(100vw - 32px);
    max-height: calc(100vh - 32px);
  }
  .project-detail-scroll {
    padding: 24px 20px 16px;
  }
  .project-detail-head {
    align-items: flex-start;
    padding-right: 40px;
  }
  .project-detail-meta-grid,
  .project-detail-image-grid,
  .project-detail-file-grid {
    grid-template-columns: 1fr;
  }
  .project-detail-footer {
    padding: 14px 20px 20px;
  }
}
`;
