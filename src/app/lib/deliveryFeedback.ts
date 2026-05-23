import { DeliveryFeedback, Task } from "../data/tasks";

export interface CreateDeliveryFeedbackInput {
  title: string;
  note: string;
  materialItemId?: string;
  imageId?: string;
  versionId?: string;
  fromTaskId?: string;
  fromRole?: string;
}

export function createDeliveryFeedback(input: CreateDeliveryFeedbackInput): DeliveryFeedback {
  return {
    id: `feedback_${Date.now()}`,
    title: input.title,
    note: input.note,
    materialItemId: input.materialItemId,
    imageId: input.imageId,
    versionId: input.versionId,
    fromTaskId: input.fromTaskId,
    fromRole: input.fromRole,
    status: "open",
    createdAt: new Date().toISOString(),
  };
}

export function addOpenDeliveryFeedback(
  feedbacks: DeliveryFeedback[] | undefined,
  nextFeedback: DeliveryFeedback,
) {
  return [
    ...(feedbacks ?? []).filter(feedback => {
      if (feedback.status !== "open") return true;
      if (nextFeedback.materialItemId && feedback.materialItemId === nextFeedback.materialItemId) return false;
      return feedback.title !== nextFeedback.title;
    }),
    nextFeedback,
  ];
}

export function resolveDeliveryFeedback(
  feedbacks: DeliveryFeedback[] | undefined,
  feedbackId: string,
) {
  return (feedbacks ?? []).map(feedback =>
    feedback.id === feedbackId
      ? { ...feedback, status: "resolved" as const, resolvedAt: new Date().toISOString() }
      : feedback,
  );
}

export function getOpenDeliveryFeedbacks(task: Task | undefined): DeliveryFeedback[] {
  const structured = (task?.deliveryFeedbacks ?? []).filter(feedback => feedback.status === "open");
  if (structured.length) return structured;
  return parseLegacyFieldFeedbacks(task?.resultNote);
}

function parseLegacyFieldFeedbacks(note: string | undefined): DeliveryFeedback[] {
  if (!note?.includes("现场修改意见：")) return [];
  return note
    .split("现场修改意见：")
    .slice(1)
    .map(block => {
      const [title = "", ...noteLines] = block.trim().split(/\n+/);
      return {
        id: `legacy_${title}`,
        title: title.trim(),
        note: noteLines.join("\n").trim(),
        status: "open" as const,
        createdAt: "",
      };
    })
    .filter(feedback => feedback.title && feedback.note);
}
