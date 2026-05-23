import { ProjectImage } from "../pages/ProjectImageLibrary";

export function isVisibleInProjectLibrary(image: ProjectImage) {
  const latest = image.versions[image.versions.length - 1];
  return latest?.status === "approved";
}

export function getLibraryDedupKey(image: ProjectImage) {
  return image.sourceTaskId ? `${image.sourceTaskId}:${image.materialItemId || image.title}` : image.id;
}

export function latestLibraryImages(images: ProjectImage[]) {
  const latestBySource = new Map<string, ProjectImage>();
  images.filter(isVisibleInProjectLibrary).forEach(image => {
    const key = getLibraryDedupKey(image);
    const current = latestBySource.get(key);
    const currentTime = current?.versions[current.versions.length - 1]?.uploadTime ?? "";
    const nextTime = image.versions[image.versions.length - 1]?.uploadTime ?? "";
    if (!current || nextTime.localeCompare(currentTime) > 0) latestBySource.set(key, image);
  });
  return Array.from(latestBySource.values());
}
