import { Task } from "../data/tasks";
import { ProjectImage } from "../pages/ProjectImageLibrary";

export interface DeliveryItem {
  id: string;
  title: string;
  source: string;
  sourceTask: string;
  taskId?: string;
  imageId?: string;
  versionId?: string;
  materialItemId?: string;
  status?: "approved" | "pending" | "rejected";
  version: string;
  url: string;
  versionCount: number;
  hasUpdate: boolean;
}

export function getLatestDownstreamDeliveries(task: Task, nextTasks: Task[], images: ProjectImage[]): DeliveryItem[] {
  const deliveryMap = new Map<string, DeliveryItem>();

  nextTasks.forEach(nextTask => {
    if (!nextTask.resultImageUrl) return;
    deliveryMap.set(`task_${nextTask.id}`, {
      id: `task_${nextTask.id}`,
      title: nextTask.resultFileName || nextTask.name,
      source: nextTask.role,
      sourceTask: nextTask.name,
      taskId: nextTask.id,
      version: nextTask.submittedAt ? nextTask.submittedAt.slice(0, 10) : "任务交付",
      url: nextTask.resultImageUrl,
      versionCount: 1,
      hasUpdate: false,
    });
  });

  const grouped = new Map<string, {
    title: string;
    imageId: string;
    materialItemId?: string;
    versions: {
      id: string;
      source: string;
      sourceTask: string;
      version: string;
      url: string;
      uploadTime: string;
      status: "approved" | "pending" | "rejected";
    }[];
  }>();

  images.forEach(image => {
    if (image.projectId !== task.projectId) return;
    const matchesTask = nextTasks.some(nextTask =>
      image.title.includes(nextTask.name) ||
      nextTask.name.includes(image.title) ||
      image.versions.some(version => version.sourceTask.includes(nextTask.name)),
    );
    const matchesFieldTask = image.title.includes(task.name) || task.name.includes(image.title);
    if (!matchesTask && !matchesFieldTask) return;

    const key = image.materialItemId || image.title;
    const group = grouped.get(key) ?? {
      title: image.title,
      imageId: image.id,
      materialItemId: image.materialItemId,
      versions: [],
    };
    image.versions.forEach(version => {
      if (!version.url) return;
      group.versions.push({
        id: version.id,
        source: version.uploadedBy,
        sourceTask: version.sourceTask,
        version: `${version.versionStr} · ${version.uploadTime}`,
        url: version.url,
        uploadTime: version.uploadTime,
        status: version.status,
      });
    });
    grouped.set(key, group);
  });

  grouped.forEach((group, key) => {
    const sorted = group.versions.sort((a, b) => b.uploadTime.localeCompare(a.uploadTime));
    const latest = sorted[0];
    if (!latest) return;
    deliveryMap.set(`image_${key}`, {
      id: `image_${key}`,
      title: group.title,
      source: latest.source,
      sourceTask: latest.sourceTask,
      taskId: nextTasks.find(nextTask => nextTask.name === latest.sourceTask)?.id,
      imageId: group.imageId,
      versionId: latest.id,
      materialItemId: group.materialItemId,
      status: latest.status,
      version: latest.version,
      url: latest.url,
      versionCount: sorted.length,
      hasUpdate: sorted.length > 1,
    });
  });

  return Array.from(deliveryMap.values());
}

export function findLatestMaterialImage(item: { id: string; name: string }, task: Task, images: ProjectImage[]) {
  const versions = images
    .filter(next => {
      if (next.projectId !== task.projectId) return false;
      if (next.materialItemId === item.id) return true;
      return next.title.includes(item.name) || next.title.includes(task.name) || item.name.includes(next.title);
    })
    .flatMap(image => image.versions.map(version => ({ url: version.url, uploadTime: version.uploadTime })))
    .filter(version => version.url)
    .sort((a, b) => b.uploadTime.localeCompare(a.uploadTime));
  return versions[0]?.url;
}
