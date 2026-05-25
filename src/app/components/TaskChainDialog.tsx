import { useMemo } from "react";
import { Task } from "../data/tasks";
import { isDoneStatus } from "../lib/taskUtils";

interface TaskChainDialogProps {
  currentTask: Task;
  projectTasks: Task[];
  onClose: () => void;
}

function Flaticon({ name }: { name: string }) {
  return <i className={name} aria-hidden="true" />;
}

export function TaskChainDialog({ currentTask, projectTasks, onClose }: TaskChainDialogProps) {
  const chain = useMemo(() => buildTaskChain(currentTask, projectTasks), [currentTask, projectTasks]);
  const currentIndex = chain.steps.findIndex(step => step.id === currentTask.id);
  const blockedIndex = chain.steps.findIndex(step => step.id === chain.blockedTaskId);
  const activeIndex = blockedIndex >= 0 ? blockedIndex : currentIndex;
  const progressPct = chain.steps.length > 1 ? (activeIndex / (chain.steps.length - 1)) * 100 : 100;

  return (
    <div className="task-chain-backdrop" role="presentation" onMouseDown={onClose}>
      <style>{taskChainDialogCss}</style>
      <section className="task-chain-dialog" role="dialog" aria-modal="true" aria-labelledby="task-chain-title" onMouseDown={event => event.stopPropagation()}>
        <header className="task-chain-header">
          <div>
            <h2 id="task-chain-title">{chain.title}</h2>
            <p>
              当前卡在第 {Math.max(1, blockedIndex >= 0 ? blockedIndex + 1 : currentIndex + 1)} 步 / 共 {chain.steps.length} 步：
              {chain.steps[blockedIndex >= 0 ? blockedIndex : currentIndex]?.role ?? currentTask.role}
            </p>
          </div>
          <button type="button" className="task-chain-close" onClick={onClose} aria-label="关闭">
            <Flaticon name="fi fi-rr-cross-small" />
          </button>
        </header>

        <div className="task-chain-body">
          {chain.steps.length > 0 ? (
            <div className="task-chain-flow" style={{ ["--task-chain-count" as string]: chain.steps.length }}>
              <div className="task-chain-steps" style={{ gridTemplateColumns: `repeat(${chain.steps.length}, minmax(0, 1fr))` }}>
                {chain.steps.map((step, index) => {
                  const isCurrent = step.id === currentTask.id;
                  const isBlocked = chain.blockedTaskId === step.id;
                  const displayStatus = getChainDisplayStatus(step, projectTasks);
                  return (
                    <div key={step.id} className={isCurrent ? "task-step-card is-current" : "task-step-card"}>
                      <div className="task-step-head">
                        <span className="task-step-index">{index + 1}</span>
                        <div className="task-step-role-wrap">
                          <span className="task-step-role">{step.role}</span>
                          {isCurrent && <span className="task-step-current-tag">当前任务</span>}
                        </div>
                        {isBlocked && <span className="task-step-dot" />}
                      </div>
                      <strong className="task-step-title">{step.name}</strong>
                      <span className="task-step-meta">{step.owner} · 截止 {formatMonthDay(step.deadline)}</span>
                      <span className={`task-step-status status-${getTaskStatusTone(displayStatus)}`}>{displayStatus}</span>
                    </div>
                  );
                })}
              </div>

              <div className="task-chain-progress">
                <div className="task-chain-progress-track">
                  <i style={{ width: `${progressPct}%` }} />
                </div>
                <div className="task-chain-progress-dots" style={{ gridTemplateColumns: `repeat(${chain.steps.length}, minmax(0, 1fr))` }}>
                  {chain.steps.map((step, index) => (
                    <span
                      key={step.id}
                      className={[
                        index < activeIndex ? "is-done" : "",
                        index === activeIndex ? "is-active" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      {index + 1}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="task-chain-empty">当前任务暂无完整任务链数据</div>
          )}
        </div>
      </section>
    </div>
  );
}

function buildTaskChain(currentTask: Task, projectTasks: Task[]) {
  const grouped = currentTask.taskGroupId
    ? projectTasks.filter(task => task.taskGroupId === currentTask.taskGroupId)
    : projectTasks.filter(task =>
      task.id === currentTask.id
      || currentTask.dependencyIds?.includes(task.id)
      || task.dependencyIds?.includes(currentTask.id)
      || currentTask.linkedTaskIds?.includes(task.id)
      || task.linkedTaskIds?.includes(currentTask.id),
    );

  const uniqueSteps = Array.from(new Map(grouped.map(task => [task.id, task])).values());
  const steps = sortTasksByChain(uniqueSteps);
  const blockedTask = findBlockedTask(steps, projectTasks);

  return {
    title: currentTask.taskGroupId ? `任务链详情 · ${currentTask.name}` : "任务链详情",
    steps: steps.length > 0 ? steps : [currentTask],
    blockedTaskId: blockedTask?.id ?? "",
  };
}

function sortTasksByChain(tasks: Task[]) {
  if (tasks.length <= 1) return tasks;

  const byId = new Map(tasks.map(task => [task.id, task]));
  const incomingCount = new Map<string, number>(tasks.map(task => [task.id, 0]));
  const adjacency = new Map<string, Task[]>(tasks.map(task => [task.id, []]));

  for (const task of tasks) {
    for (const depId of task.dependencyIds ?? []) {
      if (!byId.has(depId)) continue;
      adjacency.get(depId)?.push(task);
      incomingCount.set(task.id, (incomingCount.get(task.id) ?? 0) + 1);
    }
  }

  const queue = tasks
    .filter(task => (incomingCount.get(task.id) ?? 0) === 0)
    .sort(compareTaskFlowOrder);
  const sorted: Task[] = [];

  while (queue.length > 0) {
    const task = queue.shift()!;
    sorted.push(task);
    for (const nextTask of adjacency.get(task.id) ?? []) {
      const nextCount = (incomingCount.get(nextTask.id) ?? 1) - 1;
      incomingCount.set(nextTask.id, nextCount);
      if (nextCount === 0) {
        queue.push(nextTask);
        queue.sort(compareTaskFlowOrder);
      }
    }
  }

  const missing = tasks.filter(task => !sorted.find(item => item.id === task.id)).sort(compareTaskFlowOrder);
  return [...sorted, ...missing];
}

function compareTaskFlowOrder(a: Task, b: Task) {
  const roleOrder = getFlowRoleOrder();
  const roleDiff = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
  if (roleDiff !== 0) return roleDiff;
  const deadlineDiff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  if (deadlineDiff !== 0) return deadlineDiff;
  return a.name.localeCompare(b.name, "zh-CN");
}

function getFlowRoleOrder() {
  return ["文案", "现场执行", "设计", "审核", "运营", "招商", "短视频", "客服"] as const;
}

function findBlockedTask(steps: Task[], projectTasks: Task[]) {
  for (const step of steps) {
    const dependency = (step.dependencyIds ?? [])
      .map(id => projectTasks.find(task => task.id === id))
      .find(Boolean);

    if (dependency && !isDoneStatus(dependency.status) && dependency.status !== "已定稿") {
      return dependency;
    }

    if (step.status === "等待前置任务") {
      return step;
    }
  }

  return null;
}

function getChainDisplayStatus(task: Task, projectTasks: Task[]) {
  const dependencies = (task.dependencyIds ?? [])
    .map(id => projectTasks.find(item => item.id === id))
    .filter((item): item is Task => Boolean(item));

  const hasPendingDependency = dependencies.some(dep => !isDoneStatus(dep.status) && dep.status !== "已定稿");
  if (hasPendingDependency) return "等待前置任务" as const;
  return task.status;
}

function getTaskStatusTone(status: Task["status"]) {
  if (status === "有风险" || status === "已逾期") return "risk";
  if (status === "待审核") return "review";
  if (status === "等待前置任务") return "blocked";
  if (status === "进行中") return "active";
  return "default";
}

function formatMonthDay(date: string) {
  const [, month, day] = date.split("-");
  return `${month}-${day}`;
}

const taskChainDialogCss = `
  .task-chain-backdrop {
    position: fixed;
    inset: 0;
    z-index: 130;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
  }

  .task-chain-dialog {
    width: min(960px, calc(100vw - 48px));
    overflow: hidden;
    border: 1px solid #e5e5e5;
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 28px 80px rgba(17, 24, 39, 0.22);
  }

  .task-chain-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    padding: 24px;
    border-bottom: 1px solid #e5e5e5;
  }

  .task-chain-header h2 {
    margin: 0;
    color: #1a1a1a;
    font-size: 20px;
    font-weight: 600;
  }

  .task-chain-header p {
    margin: 10px 0 0;
    color: #666666;
    font-size: 14px;
    line-height: 1.6;
  }

  .task-chain-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #1a1a1a;
    cursor: pointer;
  }

  .task-chain-body {
    padding: 24px;
  }

  .task-chain-flow {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .task-chain-steps {
    display: grid;
    gap: 16px;
  }

  .task-step-card {
    position: relative;
    min-height: 128px;
    padding: 16px;
    border: 1px solid #e5e5e5;
    border-radius: 12px;
    background: #ffffff;
  }

  .task-step-card.is-current {
    border-color: #111111;
    box-shadow: 0 0 0 1px #111111;
  }

  .task-step-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .task-step-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #111111;
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .task-step-role-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .task-step-role {
    color: #666666;
    font-size: 14px;
    font-weight: 600;
  }

  .task-step-current-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    background: #f3f4f6;
    color: #111111;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  .task-step-dot {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ff4d4f;
    box-shadow: 0 0 0 2px #ffffff;
  }

  .task-step-title {
    display: block;
    margin-top: 14px;
    color: #111111;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
  }

  .task-step-meta {
    display: block;
    margin-top: 14px;
    color: #999999;
    font-size: 13px;
  }

  .task-step-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    margin-top: 12px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
  }

  .status-active,
  .status-default {
    background: #f3f4f6;
    color: #1a1a1a;
  }

  .status-review {
    background: #fff7ed;
    color: #c2410c;
  }

  .status-risk {
    background: #fee2e2;
    color: #b91c1c;
  }

  .status-blocked {
    background: #f3f4f6;
    color: #4b5563;
  }

  .task-chain-progress {
    position: relative;
    padding-top: 4px;
  }

  .task-chain-progress-track {
    position: absolute;
    top: 15px;
    left: calc((100% / var(--task-chain-count, 4)) / 2);
    right: calc((100% / var(--task-chain-count, 4)) / 2);
    z-index: 0;
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: #e5e5e5;
  }

  .task-chain-progress-track i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #111111;
  }

  .task-chain-progress-dots {
    position: relative;
    z-index: 1;
    display: grid;
    gap: 16px;
  }

  .task-chain-progress-dots span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin: 0 auto;
    border: 1px solid #d1d5db;
    border-radius: 50%;
    color: #999999;
    font-size: 12px;
    font-weight: 600;
    background: #ffffff;
    box-shadow: 0 0 0 6px #ffffff;
  }

  .task-chain-progress-dots span.is-done {
    border-color: #111111;
    background: #111111;
    color: #ffffff;
  }

  .task-chain-progress-dots span.is-active {
    border-color: #111111;
    background: #111111;
    color: #ffffff;
    box-shadow: 0 0 0 4px rgba(17, 17, 17, 0.08);
  }

  .task-chain-empty {
    color: #999999;
    font-size: 14px;
    line-height: 1.6;
  }
`;
