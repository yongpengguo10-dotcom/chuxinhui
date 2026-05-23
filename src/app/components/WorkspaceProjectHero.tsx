import { Project, daysUntil } from "../data/projects";

interface WorkspaceHeroMetric {
  label: string;
  value: string;
  danger?: boolean;
  bar?: number;
}

interface WorkspaceProjectHeroProps {
  project: Project;
  projects: Project[];
  progressLabel: string;
  progressValue: number;
  metrics: WorkspaceHeroMetric[];
  onSwitchProject: (project: Project) => void;
}

export function WorkspaceProjectHero({
  project,
  projects,
  progressLabel,
  progressValue,
  metrics,
  onSwitchProject,
}: WorkspaceProjectHeroProps) {
  const safeProgress = Math.max(0, Math.min(100, progressValue));

  return (
    <section className="workspace-project-hero">
      <style>{workspaceProjectHeroCss}</style>
      <div className="workspace-project-cover">{(project.name || project.fullName || "项").slice(0, 1)}</div>
      <div className="workspace-project-main">
        <div>
          <b>{project.fullName}</b>
          <span>进行中</span>
        </div>
        <p>活动日期：{project.date} · 距离开始：{Math.max(0, daysUntil(project.date))} 天 · 项目负责人：{project.owner}</p>
      </div>
      <select value={project.id} onChange={event => {
        const next = projects.find(item => item.id === event.target.value);
        if (next) onSwitchProject(next);
      }}>
        {projects.map(item => <option key={item.id} value={item.id}>{item.fullName}</option>)}
      </select>
      <WorkspaceHeroMetric label={progressLabel} value={`${safeProgress}%`} bar={safeProgress} />
      {metrics.slice(0, 3).map(metric => (
        <WorkspaceHeroMetric key={metric.label} {...metric} />
      ))}
    </section>
  );
}

function WorkspaceHeroMetric({ label, value, bar, danger }: WorkspaceHeroMetric) {
  return (
    <div className="workspace-hero-metric">
      <span>{label}</span>
      <b className={danger ? "danger" : ""}>{value}</b>
      {bar !== undefined && <i><em style={{ width: `${Math.max(0, Math.min(100, bar))}%` }} /></i>}
    </div>
  );
}

const workspaceProjectHeroCss = `
.workspace-project-hero { display: grid; grid-template-columns: 64px minmax(220px, 1fr) 120px repeat(4, minmax(110px, 0.45fr)); gap: 18px; align-items: center; padding: 16px; margin-bottom: 12px; background: #fff; border: 1px solid #dbe6f5; border-radius: 10px; }
.workspace-project-cover { width: 58px; height: 58px; display: grid; place-items: center; border-radius: 8px; background: #111827; color: #facc15; font-size: 24px; font-weight: 900; }
.workspace-project-main { min-width: 0; }
.workspace-project-main > div { display: flex; align-items: center; gap: 8px; min-width: 0; }
.workspace-project-main b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 17px; font-weight: 900; }
.workspace-project-main span { flex-shrink: 0; padding: 3px 7px; border-radius: 6px; background: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 900; }
.workspace-project-main p { margin: 10px 0 0; color: #667085; font-size: 12px; font-weight: 700; }
.workspace-project-hero select { height: 34px; min-width: 0; border: 1px solid #dbe6f5; border-radius: 8px; color: #2563eb; font-weight: 800; background: #fff; }
.workspace-hero-metric { min-height: 54px; border-left: 1px solid #e6ecf5; padding-left: 18px; }
.workspace-hero-metric span { display: block; color: #667085; font-size: 12px; font-weight: 800; margin-bottom: 6px; }
.workspace-hero-metric b { font-size: 24px; font-weight: 900; }
.workspace-hero-metric b.danger { color: #ef4444; }
.workspace-hero-metric i { display: block; width: 88px; height: 5px; background: #e6ecf5; border-radius: 999px; overflow: hidden; margin-top: 8px; }
.workspace-hero-metric em { display: block; height: 100%; background: #2563eb; border-radius: inherit; }
@media (max-width: 1180px) { .workspace-project-hero { grid-template-columns: 64px 1fr 120px; } .workspace-hero-metric { display: none; } }
@media (max-width: 720px) { .workspace-project-hero { grid-template-columns: 52px 1fr; gap: 12px; } .workspace-project-hero select { grid-column: 1 / -1; width: 100%; } .workspace-project-cover { width: 52px; height: 52px; } }
`;
