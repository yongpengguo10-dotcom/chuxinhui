import { Task } from "../data/tasks";
import { effectiveStatus, isDoneStatus, statusStyle } from "../lib/taskUtils";

interface WorkspaceTaskChainProps {
  task: Task;
  chain: Task[];
  allTasks: Task[];
}

export function WorkspaceTaskChain({ task, chain, allTasks }: WorkspaceTaskChainProps) {
  const rawCurrentIndex = Math.max(0, chain.findIndex(item => item.id === task.id));
  const visibleChain = chain.slice(0, rawCurrentIndex + 1);
  const blocker = visibleChain.find(item => !isDoneStatus(item.status));
  const currentIndex = visibleChain.length - 1;

  return (
    <section className="workspace-task-chain">
      <style>{workspaceTaskChainCss}</style>
      <div className="workspace-chain-head">
        <div>
          <h3>任务链进度</h3>
          <p>
            当前第 {currentIndex + 1} / {visibleChain.length} 步
            {blocker ? `，被「${blocker.owner}」负责的「${blocker.name}」阻塞` : "，链路已完成"}
          </p>
        </div>
        {blocker && <span>当前阻塞：{blocker.role}</span>}
      </div>
      <div className="workspace-chain-row">
        {visibleChain.map((item, index) => {
          const status = effectiveStatus(item, allTasks);
          const done = isDoneStatus(item.status);
          const isBlocker = blocker?.id === item.id;
          const isCurrent = item.id === task.id;
          const colors = statusStyle(status);

          return (
            <div key={item.id} className="workspace-chain-node">
              <div className={`workspace-chain-card ${done ? "done" : ""} ${isBlocker ? "blocker" : ""} ${isCurrent ? "current" : ""}`}>
                <b>{item.name}</b>
                <p>{item.role} · {item.owner}</p>
                <em style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}>{status}</em>
              </div>
              {index < visibleChain.length - 1 && <span className="workspace-chain-arrow">→</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const workspaceTaskChainCss = `
.workspace-task-chain { margin-top: 14px; padding: 13px; border-radius: 10px; border: 1px solid #dbe6f5; background: #fbfcfe; }
.workspace-chain-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.workspace-chain-head h3 { margin: 0; color: #111827; font-size: 13px; font-weight: 900; }
.workspace-chain-head p { margin: 5px 0 0; color: #667085; font-size: 12px; font-weight: 700; line-height: 1.5; }
.workspace-chain-head span { flex-shrink: 0; padding: 5px 8px; border-radius: 7px; background: #fff7f7; border: 1px solid #fecaca; color: #dc2626; font-size: 11px; font-weight: 900; }
.workspace-chain-row { display: flex; align-items: stretch; gap: 8px; overflow-x: auto; padding: 4px 2px 7px; }
.workspace-chain-node { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.workspace-chain-card { width: 130px; min-height: 86px; padding: 10px; border-radius: 8px; border: 1px solid #e6ecf5; background: #ffffff; }
.workspace-chain-card.done { background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%); border-color: #86efac; }
.workspace-chain-card.blocker { background: #fff7f7; border: 2px solid #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12); }
.workspace-chain-card.current { border: 2px solid #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
.workspace-chain-card.blocker.current { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12), 0 0 0 6px rgba(37, 99, 235, 0.1); }
.workspace-chain-card b { display: block; min-height: 32px; color: #111827; font-size: 11px; line-height: 1.45; font-weight: 900; }
.workspace-chain-card p { margin: 6px 0; color: #667085; font-size: 11px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.workspace-chain-card em { display: inline-flex; border: 1px solid; border-radius: 5px; padding: 3px 6px; font-size: 10px; font-style: normal; font-weight: 900; }
.workspace-chain-arrow { color: #98a2b3; font-size: 18px; font-weight: 400; }
`;
