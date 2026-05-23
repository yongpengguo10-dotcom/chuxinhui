import { Task } from "../data/tasks";
import type { ReactNode } from "react";
import { effectiveStatus, isBlocked, isDoneStatus, statusStyle } from "../lib/taskUtils";
import { formatWeekDateTime } from "../lib/dateFormat";

export type WorkspaceTaskTab = "全部" | "进行中" | "待审核" | "已完成" | "阻塞";

interface WorkspaceTaskListProps {
  title?: string;
  tasks: Task[];
  allTasks: Task[];
  activeTaskId?: string;
  activeTab: WorkspaceTaskTab;
  action?: ReactNode;
  emptyText?: string;
  onTabChange: (tab: WorkspaceTaskTab) => void;
  onSelectTask: (task: Task) => void;
}

const TABS: WorkspaceTaskTab[] = ["全部", "进行中", "待审核", "已完成", "阻塞"];

export function WorkspaceTaskList({
  title = "我的任务列表",
  tasks,
  allTasks,
  activeTaskId,
  activeTab,
  action,
  emptyText = "当前没有匹配任务",
  onTabChange,
  onSelectTask,
}: WorkspaceTaskListProps) {
  const filteredTasks = filterTasks(activeTab, tasks, allTasks);

  return (
    <section className="workspace-panel workspace-task-panel">
      <style>{workspaceTaskListCss}</style>
      <div className="workspace-panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      <div className="workspace-task-tabs">
        {TABS.map(tab => (
          <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => onTabChange(tab)}>
            {tab} <span>{countTab(tab, tasks, allTasks)}</span>
          </button>
        ))}
      </div>
      <div className="workspace-task-list">
        {filteredTasks.length === 0 ? (
          <div className="workspace-task-empty">{emptyText}</div>
        ) : filteredTasks.map(task => (
          <WorkspaceTaskCard
            key={task.id}
            task={task}
            allTasks={allTasks}
            active={activeTaskId === task.id}
            onClick={() => onSelectTask(task)}
          />
        ))}
      </div>
    </section>
  );
}

function WorkspaceTaskCard({ task, allTasks, active, onClick }: { task: Task; allTasks: Task[]; active: boolean; onClick: () => void }) {
  const status = effectiveStatus(task, allTasks);
  const statusColors = statusStyle(status);
  const blocked = isBlocked(task, allTasks);

  return (
    <button className={`workspace-task-card ${active ? "active" : ""}`} onClick={onClick}>
      <div>
        <b>{task.name}</b>
        <span style={{ background: statusColors.bg, color: statusColors.text }}>{blocked ? "待前置" : status}</span>
      </div>
      <p>截止时间：{formatWeekDateTime(task.deadline)}</p>
      <em>{task.uploaded ? "已提交" : "v0"}</em>
    </button>
  );
}

function filterTasks(tab: WorkspaceTaskTab, tasks: Task[], allTasks: Task[]) {
  return tasks.filter(task => {
    const status = effectiveStatus(task, allTasks);
    if (tab === "进行中") return status === "进行中" || status === "未开始";
    if (tab === "待审核") return status === "待审核";
    if (tab === "已完成") return isDoneStatus(status);
    if (tab === "阻塞") return isBlocked(task, allTasks);
    return true;
  });
}

function countTab(tab: WorkspaceTaskTab, tasks: Task[], allTasks: Task[]) {
  return filterTasks(tab, tasks, allTasks).length;
}

const workspaceTaskListCss = `
.workspace-panel { background: #fff; border: 1px solid #e6ecf5; border-radius: 12px; overflow: hidden; }
.workspace-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; }
.workspace-panel-head h2 { margin: 0; font-size: 16px; font-weight: 900; }
.workspace-panel-head button { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid #dbe6f5; background: #2563eb; color: #fff; font-size: 12px; font-weight: 900; cursor: pointer; }
.workspace-task-tabs { display: flex; gap: 4px; padding: 0 16px 12px; border-bottom: 1px solid #eef2f7; overflow-x: auto; }
.workspace-task-tabs button { border: 0; background: transparent; color: #667085; height: 30px; padding: 0 8px; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap; }
.workspace-task-tabs button.active { color: #2563eb; border-bottom: 2px solid #2563eb; }
.workspace-task-tabs span { margin-left: 4px; }
.workspace-task-list { display: flex; flex-direction: column; gap: 10px; padding: 12px; max-height: 650px; overflow: auto; }
.workspace-task-card { position: relative; display: block; width: 100%; text-align: left; padding: 14px; border-radius: 9px; border: 1px solid #e6ecf5; background: #fff; cursor: pointer; }
.workspace-task-card.active { border-color: #2563eb; background: #eff6ff; box-shadow: inset 3px 0 0 #2563eb; }
.workspace-task-card div { display: flex; justify-content: space-between; gap: 8px; }
.workspace-task-card b { color: #111827; font-size: 13px; font-weight: 900; }
.workspace-task-card span { border-radius: 6px; padding: 3px 7px; font-size: 11px; font-weight: 900; white-space: nowrap; }
.workspace-task-card p { margin: 10px 0 0; color: #667085; font-size: 12px; font-weight: 700; }
.workspace-task-card em { position: absolute; right: 14px; bottom: 12px; color: #98a2b3; font-size: 11px; font-style: normal; font-weight: 800; }
.workspace-task-empty { min-height: 120px; display: grid; place-items: center; color: #98a2b3; font-size: 13px; font-weight: 800; }
`;
