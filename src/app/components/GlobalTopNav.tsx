import { useMemo } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { NavKey } from "./Sidebar";

const HEADER_AVATAR = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200";

const TOP_NAV_ITEMS: { label: string; key: NavKey }[] = [
  { label: "概览", key: "overview" },
  { label: "项目", key: "projects" },
  { label: "任务", key: "control.board" },
  { label: "资源库", key: "library.project-images" },
  { label: "团队", key: "library.people" },
  { label: "报告", key: "ai.report" },
];

interface GlobalTopNavProps {
  activeNav: NavKey;
  onNavigate: (key: NavKey) => void;
  canCreateProject: boolean;
  onCreateProject: () => void;
}

export function GlobalTopNav({
  activeNav,
  onNavigate,
  canCreateProject,
  onCreateProject,
}: GlobalTopNavProps) {
  const activeTopKey = useMemo(() => {
    if (activeNav === "overview") return "overview";
    if (activeNav === "projects") return "projects";
    if (activeNav === "control.board" || activeNav === "control.publish" || activeNav === "control.risk" || activeNav === "control.review") {
      return "control.board";
    }
    if (activeNav === "library.project-images" || activeNav === "library.common-images") return "library.project-images";
    if (activeNav === "library.people") return "library.people";
    if (activeNav === "ai.report") return "ai.report";
    return "overview";
  }, [activeNav]);

  return (
    <>
      <header className="global-top-nav">
        <div className="global-top-nav-brand">
          <span className="brand-logo"></span>
          <strong>项目总览</strong>
        </div>

        <nav className="global-top-nav-links" aria-label="顶部导航">
          {TOP_NAV_ITEMS.map(item => (
            <button
              key={item.label}
              type="button"
              className={activeTopKey === item.key ? "is-active" : ""}
              onClick={() => onNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="global-top-nav-actions">
          <button type="button" className="header-icon-button" aria-label="搜索">
            <i className="fi fi-rr-search" aria-hidden="true" />
          </button>
          <button type="button" className="header-icon-button has-badge" aria-label="通知">
            <i className="fi fi-rr-bell" aria-hidden="true" />
          </button>
          <div className="header-user-avatar">
            <ImageWithFallback src={HEADER_AVATAR} alt="用户头像" />
          </div>
          {canCreateProject && (
            <button type="button" className="header-create-button" onClick={onCreateProject}>
              <i className="fi fi-rr-plus" aria-hidden="true" />
              创建项目
            </button>
          )}
        </div>
      </header>

      <style>{globalTopNavCss}</style>
    </>
  );
}

const globalTopNavCss = `
.global-top-nav {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 32px;
  padding: 18px 36px;
  background: #ffffff;
  border-bottom: 1px solid #eceff3;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
  flex-shrink: 0;
}
.global-top-nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #111111;
}
.global-top-nav-brand .brand-logo {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #111111;
  color: #ffffff;
  font-size: 17px;
}
.global-top-nav-brand strong {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.global-top-nav-links {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.global-top-nav-links button {
  position: relative;
  border: 0;
  background: transparent;
  color: #707784;
  font-size: 14px;
  font-weight: 700;
  padding: 10px 16px;
  border-radius: 999px;
  cursor: pointer;
  transition: color .18s ease, background-color .18s ease;
}
.global-top-nav-links button:hover {
  color: #111111;
  background: #f5f7fa;
}
.global-top-nav-links button.is-active {
  color: #111111;
}
.global-top-nav-links button.is-active::after {
  content: "";
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 1px;
  height: 2px;
  border-radius: 999px;
  background: #111111;
}
.global-top-nav-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}
.header-icon-button {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid #e6eaf0;
  background: #ffffff;
  color: #111111;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.header-icon-button .fi {
  font-size: 16px;
  line-height: 1;
}
.header-icon-button.has-badge::after {
  content: "";
  position: absolute;
  top: 10px;
  right: 10px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #ef4444;
  border: 2px solid #ffffff;
}
.header-user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid #e6eaf0;
  background: #f3f4f6;
}
.header-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.header-create-button {
  border: 0;
  border-radius: 12px;
  background: #111111;
  color: #ffffff;
  height: 42px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.header-create-button .fi {
  font-size: 14px;
  line-height: 1;
}
@media (max-width: 1100px) {
  .global-top-nav {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 16px 20px;
  }
  .global-top-nav-links {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
  .global-top-nav-actions {
    justify-content: flex-start;
  }
}
`;
