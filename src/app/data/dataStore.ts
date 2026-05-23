import { Person, CATEGORIES, mockPeople } from "./mockData";
import { Project, mockProjects } from "./projects";
import { Task, mockTasks } from "./tasks";
import { MOCK_IMAGES, ProjectImage } from "../pages/ProjectImageLibrary";

export interface WorkbenchState {
  version: 1;
  projects: Project[];
  tasks: Task[];
  projectImages: ProjectImage[];
  people: Person[];
  categories: string[];
  reports: Array<{ id: string; title: string; html: string; createdAt: string }>;
  checkins: Array<{ id: string; projectId: string; personName: string; phone?: string; checkedAt: string; status: string }>;
  benefits: Array<{ id: string; personId: string; name: string; status: string; remaining: number }>;
}

export const WORKBENCH_STORAGE_KEY = "chuxinhui.workbench.v1";
const LEGACY_PEOPLE_KEY = "chuxinhui.people-directory.v1";

export function createDefaultWorkbenchState(): WorkbenchState {
  return {
    version: 1,
    projects: mockProjects,
    tasks: mockTasks,
    projectImages: MOCK_IMAGES,
    people: mockPeople,
    categories: CATEGORIES,
    reports: [],
    checkins: [],
    benefits: [],
  };
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    status: task.status ?? "未开始",
    uploaded: Boolean(task.uploaded),
    dependencyIds: Array.isArray(task.dependencyIds) ? task.dependencyIds : [],
    linkedTaskIds: Array.isArray(task.linkedTaskIds) ? task.linkedTaskIds : [],
    collaborators: Array.isArray(task.collaborators) ? task.collaborators : [],
    deliveryFeedbacks: Array.isArray(task.deliveryFeedbacks) ? task.deliveryFeedbacks : [],
  };
}

function normalizeState(parsed: Partial<WorkbenchState>): WorkbenchState {
  const defaults = createDefaultWorkbenchState();
  return {
    version: 1,
    projects: Array.isArray(parsed.projects) ? parsed.projects : defaults.projects,
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTask) : defaults.tasks,
    projectImages: Array.isArray(parsed.projectImages) ? parsed.projectImages : defaults.projectImages,
    people: Array.isArray(parsed.people) ? parsed.people : defaults.people,
    categories: Array.isArray(parsed.categories) ? parsed.categories : defaults.categories,
    reports: Array.isArray(parsed.reports) ? parsed.reports : defaults.reports,
    checkins: Array.isArray(parsed.checkins) ? parsed.checkins : defaults.checkins,
    benefits: Array.isArray(parsed.benefits) ? parsed.benefits : defaults.benefits,
  };
}

export function loadWorkbenchState(): WorkbenchState {
  try {
    const raw = window.localStorage.getItem(WORKBENCH_STORAGE_KEY);
    if (raw) return normalizeState(JSON.parse(raw));

    const legacyRaw = window.localStorage.getItem(LEGACY_PEOPLE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as Partial<Pick<WorkbenchState, "people" | "categories">>;
      return {
        ...createDefaultWorkbenchState(),
        people: Array.isArray(legacy.people) ? legacy.people : mockPeople,
        categories: Array.isArray(legacy.categories) ? legacy.categories : CATEGORIES,
      };
    }
  } catch {
    return createDefaultWorkbenchState();
  }
  return createDefaultWorkbenchState();
}

export function saveWorkbenchState(state: WorkbenchState) {
  try {
    window.localStorage.setItem(WORKBENCH_STORAGE_KEY, JSON.stringify({ ...state, version: 1 }));
  } catch (error) {
    console.warn("保存本地数据失败，可能是图片过大导致浏览器本地空间不足。", error);
  }
}

export function downloadWorkbenchBackup(state: WorkbenchState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `初心会工作台备份-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function readWorkbenchBackup(file: File): Promise<WorkbenchState> {
  const parsed = JSON.parse(await file.text()) as Partial<WorkbenchState>;
  return normalizeState(parsed);
}
