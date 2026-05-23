import { Task } from "../data/tasks";
import { effectiveStatus, isDoneStatus } from "./taskUtils";

export function getNextTasks(task: Task, projectTasks: Task[]) {
  const byId = new Map(projectTasks.map(item => [item.id, item]));
  const linked = (task.linkedTaskIds ?? []).map(id => byId.get(id)).filter(Boolean) as Task[];
  const dependent = projectTasks.filter(item => item.dependencyIds?.includes(task.id));
  return Array.from(new Map([...linked, ...dependent].map(item => [item.id, item])).values());
}

export function buildTaskChain(task: Task, tasks: Task[]) {
  if (task.taskGroupId) {
    const group = tasks.filter(item => item.taskGroupId === task.taskGroupId);
    if (group.length > 1) return sortChain(group);
  }

  const byId = new Map(tasks.map(item => [item.id, item]));
  const out: Task[] = [];
  const addBefore = (item: Task) => {
    item.dependencyIds?.forEach(id => {
      const dependency = byId.get(id);
      if (dependency) addBefore(dependency);
    });
    if (!out.some(existing => existing.id === item.id)) out.push(item);
  };
  addBefore(task);

  let current = task;
  while (current.linkedTaskIds?.length) {
    const next = current.linkedTaskIds.map(id => byId.get(id)).find(Boolean);
    if (!next || out.some(existing => existing.id === next.id)) break;
    out.push(next);
    current = next;
  }

  return out.length ? out : [task];
}

export function sortChain(group: Task[]) {
  const byId = new Map(group.map(task => [task.id, task]));
  const start = group.find(task => !task.dependencyIds?.some(id => byId.has(id))) ?? group[0];
  const out: Task[] = [start];
  while (out.length < group.length) {
    const last = out[out.length - 1];
    const next = group.find(task => !out.includes(task) && task.dependencyIds?.includes(last.id));
    if (!next) {
      const rest = group.find(task => !out.includes(task));
      if (!rest) break;
      out.push(rest);
    } else {
      out.push(next);
    }
  }
  return out;
}

export function hasPendingDownstreamAcceptance(
  task: Task,
  projectTasks: Task[],
  hasDownstreamDeliveries: boolean,
  accepted: boolean,
) {
  return isDoneStatus(effectiveStatus(task, projectTasks)) && hasDownstreamDeliveries && !accepted;
}
