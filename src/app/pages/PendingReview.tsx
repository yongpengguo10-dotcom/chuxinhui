import { useMemo, useState } from "react";
import { Check, X, FileCheck2, Image as ImageIcon, FileText, Video, Table, CheckCircle2 } from "lucide-react";
import { Project } from "../data/projects";
import { Task, TaskResultType } from "../data/tasks";
import { roleColor } from "../lib/taskUtils";
import { formatDisplayDateTime } from "../lib/dateFormat";
import { PageShell } from "../components/PageShell";

interface PendingReviewProps {
  projects: Project[];
  currentProject: Project;
  tasks: Task[];
  onSwitchProject: (p: Project) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
  showToast: (msg: string) => void;
}

const RESULT_ICON: Record<TaskResultType, any> = {
  "图片": ImageIcon, "文案": FileText, "视频": Video, "表格": Table, "其他": FileCheck2,
};

export function PendingReview({
  projects, currentProject, tasks, onSwitchProject, onUpdateTask,
  isMobile, onOpenDrawer, showToast,
}: PendingReviewProps) {
  const [rejectFor, setRejectFor] = useState<Task | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const pending = useMemo(
    () => tasks.filter(t => t.projectId === currentProject.id && t.status === "待审核"),
    [tasks, currentProject.id],
  );

  const approve = (t: Task) => {
    onUpdateTask(t.id, { status: t.resultType === "图片" ? "已定稿" : "已完成", reviewedAt: new Date().toISOString() });
    showToast(`「${t.name}」已通过${t.resultType === "图片" ? "并定稿" : ""}`);
  };

  const submitReject = () => {
    if (!rejectFor) return;
    onUpdateTask(rejectFor.id, { status: "进行中", uploaded: false });
    showToast(`已退回「${rejectFor.name}」`);
    setRejectFor(null);
    setRejectNote("");
  };

  return (
    <PageShell
      title="待审核成果"
      breadcrumb="项目总控 / 待审核成果"
      description="集中审核各岗位提交的关键成果"
      isMobile={isMobile}
      onOpenDrawer={onOpenDrawer}
      showProjectBar
      projects={projects}
      currentProject={currentProject}
      onSwitchProject={onSwitchProject}
    >
      {pending.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
          <CheckCircle2 size={28} style={{ color: "#1E7A3D", margin: "0 auto 8px" }} />
          <div style={{ fontSize: 14, color: "#141414", fontWeight: 600 }}>暂无待审核成果</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>所有提交都已处理完毕</div>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {pending.map(t => {
            const c = roleColor(t.role);
            const Icon = t.resultType ? RESULT_ICON[t.resultType] : FileCheck2;
            return (
              <div key={t.id} className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-2 py-0.5 rounded-md"
                    style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 11, fontWeight: 600 }}
                  >
                    {t.role}
                  </span>
                  {t.isKey && (
                    <span style={{ background: "#FFF4C7", border: "1px solid #F4D060", color: "#8A6500", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "1px 5px" }}>
                      关键
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "#999", marginLeft: "auto" }}>{formatDisplayDateTime(t.deadline)}</span>
                </div>

                <div style={{ fontSize: 14, fontWeight: 700, color: "#141414", marginBottom: 4 }}>{t.name}</div>
                {t.desc && <div style={{ fontSize: 12, color: "#777", marginBottom: 8, lineHeight: 1.5 }}>{t.desc}</div>}

                {/* Preview area */}
                <div
                  className="rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: "#FAFAF8",
                    border: "1px dashed #E8E3D8",
                    height: 120,
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {t.resultImageUrl ? (
                    <img src={t.resultImageUrl} alt={t.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
                  ) : t.resultContent ? (
                    <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6, padding: 12, textAlign: "left", width: "100%", whiteSpace: "pre-wrap", overflow: "auto" }}>{t.resultContent}</div>
                  ) : (
                    <>
                      <Icon size={22} style={{ color: "#AAA" }} />
                      <span style={{ fontSize: 11, color: "#999" }}>{t.resultType ?? "成果"}预览</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mb-3" style={{ fontSize: 11, color: "#777" }}>
                  <span>提交人：{t.owner}</span>
                </div>

                <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid #F0EDE4" }}>
                  <button
                    onClick={() => setRejectFor(t)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-full"
                    style={{ background: "#FFFFFF", border: "1px solid #FFCCCC", color: "#CC3333", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    <X size={12} /> 退回
                  </button>
                  <button
                    onClick={() => approve(t)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-full"
                    style={{ background: "#F4C542", border: "1px solid #E0B232", color: "#141414", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    <Check size={12} /> 通过{t.resultType === "图片" ? "并定稿" : ""}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectFor && (
        <div
          onClick={() => setRejectFor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,20,20,0.4)", backdropFilter: "blur(2px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="rounded-2xl p-5"
            style={{ background: "#FFFFFF", border: "1px solid #EDE9DF", width: 420, maxWidth: "calc(100vw - 16px)" }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#141414", marginBottom: 4 }}>退回成果</div>
            <div style={{ fontSize: 12, color: "#777", marginBottom: 12 }}>「{rejectFor.name}」</div>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              rows={4}
              placeholder="请说明退回原因，方便对方修改..."
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10,
                border: "1px solid #E8E3D8", background: "#FAFAF8",
                fontSize: 13, color: "#141414", outline: "none", resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                onClick={() => setRejectFor(null)}
                className="px-4 py-2 rounded-full"
                style={{ background: "#FFFFFF", border: "1px solid #E8E3D8", cursor: "pointer", fontSize: 13, color: "#555" }}
              >
                取消
              </button>
              <button
                onClick={submitReject}
                className="px-4 py-2 rounded-full"
                style={{ background: "#CC3333", border: "1px solid #B71C1C", cursor: "pointer", fontSize: 13, color: "#FFFFFF", fontWeight: 600 }}
              >
                确认退回
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
