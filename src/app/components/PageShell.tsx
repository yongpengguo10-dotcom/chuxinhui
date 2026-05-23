import { Menu } from "lucide-react";
import { Project } from "../data/projects";
import { ProjectContextBar } from "./ProjectContextBar";

interface PageShellProps {
  title: string;
  breadcrumb: string;
  description?: string;
  isMobile: boolean;
  onOpenDrawer: () => void;
  showProjectBar?: boolean;
  compactProjectBar?: boolean;
  projects?: Project[];
  currentProject?: Project;
  onSwitchProject?: (p: Project) => void;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

export function PageShell({
  title, breadcrumb, description,
  isMobile, onOpenDrawer,
  showProjectBar = false, compactProjectBar = false,
  projects, currentProject, onSwitchProject,
  toolbar, children,
}: PageShellProps) {
  return (
    <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
      {showProjectBar && projects && currentProject && onSwitchProject && (
        <ProjectContextBar
          projects={projects}
          currentProject={currentProject}
          onSwitch={onSwitchProject}
          compact={compactProjectBar || isMobile}
        />
      )}

      <header style={{ padding: isMobile ? "14px 16px 0" : "20px 28px 0", flexShrink: 0 }}>
        <div className={isMobile ? "flex items-center gap-3 mb-3" : "flex items-end justify-between mb-3 flex-wrap gap-3"}>
          <div className={isMobile ? "flex items-center gap-3" : ""}>
            {isMobile && (
              <button
                onClick={onOpenDrawer}
                className="flex items-center justify-center rounded-full"
                style={{ width: 36, height: 36, background: "#FFFFFF", border: "1.5px solid #E8E3D8", cursor: "pointer", flexShrink: 0 }}
              >
                <Menu size={16} style={{ color: "#141414" }} />
              </button>
            )}
            <div>
              {!isMobile && breadcrumb && (
                <div style={{ fontSize: 11, fontWeight: 600, color: "#AAAAAA", letterSpacing: "0.1em", marginBottom: 4 }}>
                  {breadcrumb}
                </div>
              )}
              <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: "#141414", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {title}
              </h1>
              {!isMobile && description && (
                <div style={{ fontSize: 13, color: "#AAAAAA", marginTop: 4 }}>{description}</div>
              )}
            </div>
          </div>
          {toolbar && <div className="flex items-center gap-2 flex-wrap">{toolbar}</div>}
        </div>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px 16px 24px" : "16px 28px 28px", scrollbarWidth: "thin" }}>
        {children}
      </div>
    </main>
  );
}
