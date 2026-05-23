import { Menu, Construction } from "lucide-react";
import { Project } from "../data/projects";
import { ProjectContextBar } from "../components/ProjectContextBar";

interface PlaceholderPageProps {
  title: string;
  breadcrumb: string;
  description: string;
  features: string[];
  phaseHint: string;
  showProjectBar?: boolean;
  compactProjectBar?: boolean;
  projects?: Project[];
  currentProject?: Project;
  onSwitchProject?: (p: Project) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
}

export function PlaceholderPage({
  title, breadcrumb, description, features, phaseHint,
  showProjectBar = false, compactProjectBar = false,
  projects, currentProject, onSwitchProject,
  isMobile, onOpenDrawer,
}: PlaceholderPageProps) {
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
        <div className={isMobile ? "flex items-center gap-3 mb-3" : "mb-3"}>
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
            {!isMobile && (
              <div style={{ fontSize: 11, fontWeight: 600, color: "#AAAAAA", letterSpacing: "0.1em", marginBottom: 4 }}>
                {breadcrumb}
              </div>
            )}
            <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: "#141414", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {title}
            </h1>
            {!isMobile && (
              <div style={{ fontSize: 13, color: "#AAAAAA", marginTop: 4 }}>{description}</div>
            )}
          </div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px" : "20px 28px 28px" }}>
        <div
          className="rounded-2xl p-8"
          style={{ background: "#FFFFFF", border: "1px solid #EDE9DF", maxWidth: 720 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center rounded-2xl" style={{ width: 48, height: 48, background: "#FFF4C7", border: "1.5px solid #F4D060" }}>
              <Construction size={20} style={{ color: "#8A6500" }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#141414" }}>{title} · 即将上线</div>
              <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{phaseHint}</div>
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#444", lineHeight: 1.9, marginBottom: 16 }}>{description}</p>

          <div style={{ fontSize: 12, fontWeight: 600, color: "#777", marginBottom: 10, letterSpacing: "0.05em" }}>
            规划功能
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {features.map(f => (
              <li
                key={f}
                className="flex items-start gap-2 py-2 px-3 rounded-lg mb-1.5"
                style={{ background: "#FAFAF8", border: "1px solid #F0EDE4" }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 99, background: "#F4C542", marginTop: 7, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#141414" }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
