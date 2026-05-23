import { useState, useRef, useEffect } from "react";
import { Calendar, User, AlertTriangle, ChevronDown, Layers, CheckCircle2, Repeat } from "lucide-react";
import { Project, daysUntil } from "../data/projects";

interface ProjectContextBarProps {
  projects: Project[];
  currentProject: Project;
  onSwitch: (p: Project) => void;
  compact?: boolean;
}

export function ProjectContextBar({ projects, currentProject, onSwitch, compact = false }: ProjectContextBarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const days = daysUntil(currentProject.date);
  const sortedProjects = [...projects].sort((a, b) => {
    const da = daysUntil(a.date);
    const db = daysUntil(b.date);
    const fa = da < 0 ? Infinity : da;
    const fb = db < 0 ? Infinity : db;
    return fa - fb;
  });

  if (compact) {
    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-2"
        style={{
          background: "#FFFDF0",
          borderBottom: "1px solid #F4D060",
          fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center justify-center rounded-md" style={{ width: 22, height: 22, background: "#F4C542", flexShrink: 0 }}>
            <Layers size={12} style={{ color: "#141414" }} />
          </div>
          <div className="min-w-0">
            <div style={{ fontSize: 13, fontWeight: 700, color: "#141414", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentProject.fullName}
            </div>
            <div style={{ fontSize: 11, color: "#8A6500" }}>
              {days >= 0 ? `距离开始 ${days} 天` : `已结束 ${-days} 天`} · {currentProject.phase}
            </div>
          </div>
        </div>
        <ProjectSwitcher
          containerRef={ref}
          open={open}
          setOpen={setOpen}
          projects={sortedProjects}
          currentProject={currentProject}
          onSwitch={p => { onSwitch(p); setOpen(false); }}
          variant="compact"
        />
      </div>
    );
  }

  return (
    <div
      className="px-6 py-3"
      style={{
        background: "#FFFFFF",
        borderBottom: "1px solid #EDE9DF",
        fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
        flexShrink: 0,
      }}
    >
      <div className="flex items-center gap-5 flex-wrap">
        {/* Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, background: "#F4C542", flexShrink: 0 }}>
            <Layers size={16} style={{ color: "#141414" }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 15, fontWeight: 700, color: "#141414", whiteSpace: "nowrap" }}>
                {currentProject.fullName}
              </span>
              <span
                className="px-2 py-0.5 rounded-full"
                style={{ background: "#FFF4C7", border: "1px solid #F4D060", fontSize: 11, color: "#8A6500", fontWeight: 500 }}
              >
                {currentProject.phase}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#AAAAAA", marginTop: 2 }}>
              所属系列 · {currentProject.series}
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 32, background: "#EDE9DF" }} />

        {/* Stats */}
        <StatItem icon={Calendar} label={`${currentProject.date}`} sub={days >= 0 ? `距开始 ${days} 天` : `已结束 ${-days} 天`} accent={days >= 0 && days <= 7} />
        <StatItem icon={User} label={currentProject.owner} sub="项目负责人" />
        <StatItem icon={CheckCircle2} label={`${currentProject.completion}%`} sub="完成度" accent={currentProject.completion < 40} />
        <StatItem icon={AlertTriangle} label={`${currentProject.riskCount}`} sub="风险任务" danger={currentProject.riskCount > 0} />

        {/* Switcher */}
        <div style={{ marginLeft: "auto" }}>
          <ProjectSwitcher
            containerRef={ref}
            open={open}
            setOpen={setOpen}
            projects={sortedProjects}
            currentProject={currentProject}
            onSwitch={p => { onSwitch(p); setOpen(false); }}
            variant="full"
          />
        </div>
      </div>
    </div>
  );
}

function StatItem({
  icon: Icon, label, sub, accent = false, danger = false,
}: { icon: any; label: string; sub: string; accent?: boolean; danger?: boolean }) {
  const color = danger ? "#CC3333" : accent ? "#8A6500" : "#141414";
  const bg = danger ? "#FFF5F5" : accent ? "#FFF9E6" : "#F8F6EF";
  const border = danger ? "#FFDDDD" : accent ? "#F4D060" : "#E8E3D8";
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, background: bg, border: `1px solid ${border}`, flexShrink: 0 }}>
        <Icon size={13} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#141414", lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: 10, color: "#999", marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

function ProjectSwitcher({
  containerRef, open, setOpen, projects, currentProject, onSwitch, variant,
}: {
  containerRef: React.RefObject<HTMLDivElement>;
  open: boolean;
  setOpen: (b: boolean) => void;
  projects: Project[];
  currentProject: Project;
  onSwitch: (p: Project) => void;
  variant: "full" | "compact";
}) {
  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full transition-all duration-150"
        style={{
          padding: variant === "compact" ? "4px 10px" : "6px 14px",
          background: open ? "#FFF4C7" : "#FFFFFF",
          border: "1.5px solid #E8E3D8",
          cursor: "pointer",
        }}
        onMouseEnter={e => !open && ((e.currentTarget as HTMLElement).style.borderColor = "#F4C542")}
        onMouseLeave={e => !open && ((e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8")}
      >
        <Repeat size={variant === "compact" ? 11 : 12} style={{ color: "#141414" }} />
        <span style={{ fontSize: variant === "compact" ? 11 : 12, color: "#141414", fontWeight: 600 }}>切换项目</span>
        <ChevronDown size={variant === "compact" ? 11 : 12} style={{ color: "#777", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div
          className="absolute right-0 rounded-2xl overflow-hidden"
          style={{
            top: "calc(100% + 6px)",
            minWidth: 320,
            background: "#FFFFFF",
            border: "1px solid #EDE9DF",
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            zIndex: 30,
          }}
        >
          <div className="px-4 py-2.5" style={{ background: "#FAFAF8", borderBottom: "1px solid #F0EDE4" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#777", letterSpacing: "0.05em" }}>选择项目 · 按日期排序</div>
          </div>
          <div className="py-1" style={{ maxHeight: 360, overflowY: "auto" }}>
            {projects.map(p => {
              const active = p.id === currentProject.id;
              const d = daysUntil(p.date);
              return (
                <button
                  key={p.id}
                  onClick={() => onSwitch(p)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-all duration-150"
                  style={{
                    background: active ? "#FFF9E6" : "transparent",
                    border: "none",
                    borderLeft: active ? "3px solid #F4C542" : "3px solid transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => !active && ((e.currentTarget as HTMLElement).style.background = "#F8F6EF")}
                  onMouseLeave={e => !active && ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <div className="min-w-0 flex-1">
                    <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: "#141414", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.fullName}
                    </div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                      {p.date} · {p.phase} · {p.owner}
                    </div>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{
                      background: d < 0 ? "#F2F0EB" : d <= 7 ? "#FFE8E8" : "#FFF4C7",
                      border: "1px solid " + (d < 0 ? "#E8E3D8" : d <= 7 ? "#FFCCCC" : "#F4D060"),
                      fontSize: 10,
                      color: d < 0 ? "#999" : d <= 7 ? "#CC3333" : "#8A6500",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {d < 0 ? "已结束" : d === 0 ? "今日" : `${d} 天`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
