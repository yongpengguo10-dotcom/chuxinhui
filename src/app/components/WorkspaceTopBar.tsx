import { Bell, ImageIcon, Menu, Search } from "lucide-react";

interface WorkspaceTopBarProps {
  isMobile: boolean;
  userName: string;
  userRole: string;
  onOpenDrawer: () => void;
}

export function WorkspaceTopBar({ isMobile, userName, userRole, onOpenDrawer }: WorkspaceTopBarProps) {
  return (
    <header className="workspace-topbar">
      <style>{workspaceTopBarCss}</style>
      <div className="workspace-top-title">
        {isMobile && <button onClick={onOpenDrawer}><Menu size={18} /></button>}
        <b>项目中心</b>
      </div>
      <div className="workspace-top-tools">
        <div className="workspace-top-search"><Search size={15} /><span>搜索任务、素材（⌘ + K）</span></div>
        <button><ImageIcon size={15} /></button>
        <button className="workspace-bell-button"><Bell size={15} /><i>12</i></button>
        <div className="workspace-user">
          <span>{userName.slice(0, 1)}</span>
          <b>{userName}</b>
          <em>{userRole}</em>
        </div>
      </div>
    </header>
  );
}

const workspaceTopBarCss = `
.workspace-topbar { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; background: #fff; border-bottom: 1px solid #e6ecf5; flex-shrink: 0; }
.workspace-top-title { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 900; }
.workspace-top-title button,.workspace-top-tools button { display: inline-flex; align-items: center; justify-content: center; border: 1px solid #e6ecf5; background: #fff; border-radius: 9px; height: 34px; min-width: 34px; cursor: pointer; }
.workspace-top-tools { display: flex; align-items: center; gap: 12px; }
.workspace-top-search { width: 280px; height: 34px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid #e6ecf5; border-radius: 999px; color: #98a2b3; font-size: 12px; font-weight: 700; }
.workspace-bell-button { position: relative; }
.workspace-bell-button i { position: absolute; right: -4px; top: -5px; background: #ef4444; color: #fff; border-radius: 999px; font-size: 9px; padding: 1px 4px; font-style: normal; }
.workspace-user { display: grid; grid-template-columns: 34px auto; column-gap: 8px; align-items: center; }
.workspace-user span { grid-row: span 2; width: 34px; height: 34px; display: grid; place-items: center; background: #f3f4f6; border-radius: 999px; font-weight: 900; }
.workspace-user b { font-size: 12px; line-height: 1; }
.workspace-user em { font-size: 11px; color: #667085; font-style: normal; }
@media (max-width: 1180px) { .workspace-top-search { width: 210px; } }
@media (max-width: 720px) { .workspace-topbar { padding: 0 12px; } .workspace-top-search,.workspace-user,.workspace-top-tools > button { display: none; } }
`;
