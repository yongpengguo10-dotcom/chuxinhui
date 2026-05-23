import { useState } from "react";
import {
  LayoutDashboard, Briefcase, Sparkles, FolderClosed, Users, Image, Images,
  PenTool, FileText, Video, Settings2, Headphones, MapPin,
  Lock, LogOut, ChevronUp, ChevronDown, X,
} from "lucide-react";
import { canAccessNav, ROLE_OPTIONS, UserRole } from "../data/permissions";

export type NavKey =
  | "overview"
  | "control.create"
  | "control.publish"
  | "control.board"
  | "control.risk"
  | "control.review"
  | "recruitment"
  | "market.design"
  | "market.copy"
  | "market.video"
  | "market.ops"
  | "market.cs"
  | "market.field"
  | "benefits"
  | "checkin"
  | "ai.report"
  | "library.people"
  | "library.project-images"
  | "library.common-images";

interface SidebarProps {
  activeNav: NavKey;
  onNavChange: (nav: NavKey) => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  isMobile?: boolean;
  onCloseDrawer?: () => void;
}

interface NavItem {
  key?: NavKey;
  label: string;
  icon: any;
  children?: NavItem[];
}

const NAV_TREE: NavItem[] = [
  { key: "overview", label: "项目总览", icon: LayoutDashboard },
  {
    label: "项目总控", icon: Briefcase, children: [
      { key: "control.publish", label: "发布任务", icon: PenTool },
      { key: "control.board", label: "任务分发", icon: FolderClosed },
      { key: "control.risk", label: "风险跟进", icon: Settings2 },
      { key: "control.review", label: "待审核成果", icon: FileText },
    ],
  },
  {
    label: "市场中心", icon: Sparkles, children: [
      { key: "market.design", label: "设计工作台", icon: PenTool },
      { key: "market.copy", label: "文案工作台", icon: FileText },
      { key: "market.video", label: "短视频工作台", icon: Video },
      { key: "market.ops", label: "运营工作台", icon: Settings2 },
      { key: "market.cs", label: "客服工作台", icon: Headphones },
      { key: "market.field", label: "现场执行", icon: MapPin },
    ],
  },
  {
    label: "素材库", icon: FolderClosed, children: [
      { key: "library.people", label: "客户中心", icon: Users },
      { key: "library.project-images", label: "项目图片库", icon: Image },
      { key: "library.common-images", label: "公司通用图片", icon: Images },
    ],
  },
];

function filterNavTree(role: UserRole) {
  return NAV_TREE.map(item => {
    if (!item.children) return item.key && canAccessNav(role, item.key) ? item : null;
    const children = item.children.filter(child => child.key && canAccessNav(role, child.key));
    return children.length ? { ...item, children } : null;
  }).filter(Boolean) as NavItem[];
}

function findParentKey(active: NavKey, navTree: NavItem[]): string | null {
  for (const item of navTree) {
    if (item.children?.some(c => c.key === active)) return item.label;
  }
  return null;
}

export function Sidebar({ activeNav, onNavChange, currentRole, onRoleChange, isMobile = false, onCloseDrawer }: SidebarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const navTree = filterNavTree(currentRole);
  const initialExpanded = new Set<string>();
  const parent = findParentKey(activeNav, navTree);
  if (parent) initialExpanded.add(parent);
  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);
  const currentRoleInfo = ROLE_OPTIONS.find(item => item.role === currentRole) ?? ROLE_OPTIONS[0];

  const toggle = (label: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const handleLeafClick = (key: NavKey) => {
    onNavChange(key);
    if (isMobile) onCloseDrawer?.();
  };

  return (
    <>
      {isMobile && (
        <div
          onClick={onCloseDrawer}
          style={{ position: "fixed", inset: 0, background: "rgba(20,20,20,0.4)", backdropFilter: "blur(2px)", zIndex: 40 }}
        />
      )}
      <aside
        className="flex flex-col h-full"
        style={{
          width: 260,
          minWidth: 260,
          background: "#FFFFFF",
          borderRight: "1px solid #E8E3D8",
          fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
          ...(isMobile ? { position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 41, height: "100vh", boxShadow: "8px 0 32px rgba(0,0,0,0.18)" } : null),
        }}
      >
        {/* Logo area */}
        <div className="px-5 pt-6 pb-4 relative" style={{ borderBottom: "1px solid #F0EDE4" }}>
          {isMobile && (
            <button
              onClick={onCloseDrawer}
              className="absolute flex items-center justify-center rounded-full"
              style={{ top: 14, right: 14, width: 28, height: 28, background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer" }}
            >
              <X size={13} style={{ color: "#141414" }} />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 38, height: 38, background: "#F4C542", flexShrink: 0 }}
            >
              <span style={{ fontSize: 19, fontWeight: 800, color: "#141414", fontFamily: "serif" }}>初</span>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#141414", lineHeight: 1.2 }}>初心会工作台</div>
              <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>项目推进 · 素材沉淀</div>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <nav className="px-2.5 pt-3 flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#E8E3D8 transparent" }}>
          {navTree.map(item => {
            if (!item.children) {
              const active = activeNav === item.key;
              return (
                <NavLeafButton
                  key={item.label}
                  item={item}
                  active={active}
                  onClick={() => item.key && handleLeafClick(item.key)}
                  depth={0}
                />
              );
            }
            const isExpanded = expanded.has(item.label);
            const hasActiveChild = item.children.some(c => c.key === activeNav);
            return (
              <div key={item.label} className="mb-0.5">
                <button
                  onClick={() => toggle(item.label)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 text-left"
                  style={{
                    background: hasActiveChild && !isExpanded ? "#F8F6EF" : "transparent",
                    border: "1px solid transparent",
                    color: "#141414",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => !hasActiveChild && ((e.currentTarget as HTMLElement).style.background = "#F8F6EF")}
                  onMouseLeave={e => !hasActiveChild && ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <item.icon size={15} style={{ color: "#141414", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#141414", flex: 1 }}>{item.label}</span>
                  {hasActiveChild && !isExpanded && (
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: "#F4C542", flexShrink: 0 }} />
                  )}
                  <ChevronDown
                    size={12}
                    style={{
                      color: "#AAAAAA",
                      flexShrink: 0,
                      transition: "transform 0.2s",
                      transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                    }}
                  />
                </button>

                {isExpanded && (
                  <div className="mt-0.5 ml-2 pl-2.5 pb-1" style={{ borderLeft: "2px solid #F0EDE4" }}>
                    {item.children.map(child => (
                      <NavLeafButton
                        key={child.label}
                        item={child}
                        active={activeNav === child.key}
                        onClick={() => child.key && handleLeafClick(child.key)}
                        depth={1}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom user info */}
        <div className="relative" style={{ borderTop: "1px solid #F0EDE4" }}>
          {accountMenuOpen && (
            <div
              className="absolute left-3 right-3 rounded-2xl overflow-hidden"
              style={{
                bottom: "calc(100% + 8px)",
                background: "#FFFFFF",
                border: "1px solid #EDE9DF",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              }}
            >
              {ROLE_OPTIONS.map(option => (
                <button
                  key={option.role}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-150"
                  style={{ background: option.role === currentRole ? "#FFF9E6" : "transparent", border: "none", cursor: "pointer", borderBottom: "1px solid #F0EDE4" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = option.role === currentRole ? "#FFF9E6" : "#F8F6EF"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = option.role === currentRole ? "#FFF9E6" : "transparent"}
                  onClick={() => {
                    onRoleChange(option.role);
                    setAccountMenuOpen(false);
                  }}
                >
                  <div className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: "#F8F6EF", border: "1px solid #E8E3D8", flexShrink: 0 }}>
                    <Lock size={13} style={{ color: option.role === currentRole ? "#8A6500" : "#555" }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#141414", fontWeight: 700 }}>{option.name}</div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{option.subtitle}</div>
                  </div>
                </button>
              ))}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-150"
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#FFF5F5"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                onClick={() => setAccountMenuOpen(false)}
              >
                <div className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: "#FFF5F5", border: "1px solid #FFDDDD", flexShrink: 0 }}>
                  <LogOut size={13} style={{ color: "#DD2222" }} />
                </div>
                <span style={{ fontSize: 13, color: "#DD2222", fontWeight: 500 }}>退出登录</span>
              </button>
            </div>
          )}
          <button
            className="w-full px-5 py-4 flex items-center gap-2.5 transition-all duration-150"
            style={{ background: accountMenuOpen ? "#FFF9E6" : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
            onClick={() => setAccountMenuOpen(v => !v)}
            onMouseEnter={e => !accountMenuOpen && ((e.currentTarget as HTMLElement).style.background = "#F8F6EF")}
            onMouseLeave={e => !accountMenuOpen && ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <div className="rounded-full flex items-center justify-center" style={{ width: 32, height: 32, background: "#F8F6EF", border: "1px solid #E8E3D8", flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: "#777", fontWeight: 600 }}>{currentRoleInfo.name.slice(0, 1)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13, fontWeight: 600, color: "#141414" }}>{currentRoleInfo.name}</div>
              <div style={{ fontSize: 11, color: "#AAAAAA" }}>{currentRoleInfo.subtitle}</div>
            </div>
            <ChevronUp
              size={14}
              style={{
                color: "#AAAAAA",
                flexShrink: 0,
                transition: "transform 0.2s",
                transform: accountMenuOpen ? "rotate(0deg)" : "rotate(180deg)",
              }}
            />
          </button>
        </div>
      </aside>
    </>
  );
}

function NavLeafButton({ item, active, onClick, depth }: { item: NavItem; active: boolean; onClick: () => void; depth: number }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-xl mb-0.5 transition-all duration-150 text-left"
      style={{
        padding: depth === 0 ? "8px 12px" : "6px 10px",
        background: active ? "#FFF4C7" : "transparent",
        border: active ? "1px solid #F4C542" : "1px solid transparent",
        color: "#141414",
        cursor: "pointer",
      }}
      onMouseEnter={e => !active && ((e.currentTarget as HTMLElement).style.background = "#F8F6EF")}
      onMouseLeave={e => !active && ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      <item.icon size={depth === 0 ? 15 : 13} style={{ color: "#141414", flexShrink: 0 }} />
      <span style={{ fontSize: depth === 0 ? 13 : 12.5, fontWeight: active ? 600 : 400, color: "#141414", flex: 1 }}>{item.label}</span>
    </button>
  );
}
