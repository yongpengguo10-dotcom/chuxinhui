import type { ReactNode } from "react";
import { Task } from "../data/tasks";
import { formatDisplayDateTime } from "../lib/dateFormat";
import { isDoneStatus, priorityStyle } from "../lib/taskUtils";

interface WorkspaceTaskMetaProps {
  task: Task;
  status: string;
  dependencies: Task[];
}

interface WorkspaceDetailBlockProps {
  title: string;
  children: ReactNode;
}

interface WorkspaceDependencyResultsProps {
  dependencies: Task[];
  emptyText?: string;
  showToast: (msg: string) => void;
}

export function WorkspaceTaskMeta({ task, status, dependencies }: WorkspaceTaskMetaProps) {
  const priority = priorityStyle(task.priority);

  return (
    <div className="workspace-task-meta">
      <style>{workspaceTaskDetailsCss}</style>
      <Meta label="任务状态" value={status} />
      <Meta label="负责人" value={task.owner} />
      <Meta label="截止时间" value={formatDisplayDateTime(task.deadline)} />
      <Meta label="优先级" value={task.priority} color={priority.text} />
      <Meta label="前置任务" value={dependencies.length ? dependencies.map(dep => dep.name).join("、") : "无"} />
      <Meta label="成果要求" value={task.resultType || "图片"} />
    </div>
  );
}

export function WorkspaceDetailBlock({ title, children }: WorkspaceDetailBlockProps) {
  return (
    <section className="workspace-detail-block">
      <style>{workspaceTaskDetailsCss}</style>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function WorkspaceDependencyResults({
  dependencies,
  emptyText = "无前置任务，可以直接开始。",
  showToast,
}: WorkspaceDependencyResultsProps) {
  if (!dependencies.length) return <div className="workspace-empty-deps"><style>{workspaceTaskDetailsCss}</style>{emptyText}</div>;

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("已复制前置成果");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      showToast(ok ? "已复制前置成果" : "复制失败，请手动复制");
    }
  };

  return (
    <div className="workspace-dependency-list">
      <style>{workspaceTaskDetailsCss}</style>
      {dependencies.map(dep => {
        const done = isDoneStatus(dep.status);
        const copyContent = dep.resultContent || dep.resultNote || dep.resultLink || "";
        const isFieldMaterialResult = dep.role === "现场执行" && Boolean(dep.resultMaterials?.length);
        return (
          <div key={dep.id} className={done ? "done" : ""}>
            <div className="workspace-dependency-head">
              <b>{dep.name}</b>
              <span>{done ? "已完成" : "未完成"}</span>
              {copyContent && <button onClick={() => copyText(copyContent)}>复制</button>}
            </div>
            {isFieldMaterialResult ? (
              <FieldMaterialResult task={dep} />
            ) : (
              <p>{copyContent || "暂未提交可用成果"}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldMaterialResult({ task }: { task: Task }) {
  const materials = task.resultMaterials ?? [];
  return (
    <div className="workspace-material-result">
      <div className="workspace-material-summary">
        <b>现场物料交付</b>
        <span>{materials.length} 项物料 · 含尺寸、数量、摆放位置和参考图</span>
      </div>
      <div className="workspace-material-table-wrap">
        <table>
          <thead>
            <tr>
              <th>物料</th>
              <th>尺寸 / 规格</th>
              <th>数量</th>
              <th>摆放位置</th>
              <th>位置参考图</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            {materials.map(item => (
              <tr key={item.id}>
                <td><b>{item.name}</b></td>
                <td>{item.size || "-"}</td>
                <td>{item.quantity || "-"}</td>
                <td>{item.scene || "-"}</td>
                <td>
                  {item.placementImage ? (
                    <img src={item.placementImage} alt={`${item.name}位置参考`} />
                  ) : (
                    <span className="workspace-material-empty">未上传</span>
                  )}
                </td>
                <td>{item.notes || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Meta({ label, value, color }: { label: string; value: string; color?: string }) {
  return <div><span>{label}</span><b style={{ color }}>{value}</b></div>;
}

const workspaceTaskDetailsCss = `
.workspace-task-meta { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #e6ecf5; border-radius: 9px; overflow: hidden; }
.workspace-task-meta div { padding: 12px; background: #fbfcfe; border-right: 1px solid #e6ecf5; border-bottom: 1px solid #e6ecf5; }
.workspace-task-meta span { display: block; color: #667085; font-size: 11px; font-weight: 800; margin-bottom: 5px; }
.workspace-task-meta b { display: block; color: #111827; font-size: 12px; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.workspace-detail-block { margin-top: 16px; padding-top: 14px; border-top: 1px solid #eef2f7; }
.workspace-detail-block h3 { margin: 0 0 10px; font-size: 13px; font-weight: 900; }
.workspace-detail-block p { margin: 0; color: #344054; font-size: 13px; line-height: 1.65; white-space: pre-wrap; }
.workspace-dependency-list { display: flex; flex-direction: column; gap: 8px; }
.workspace-dependency-list > div,.workspace-empty-deps { padding: 10px; border: 1px solid #e6ecf5; border-radius: 8px; background: #fbfcfe; color: #344054; font-size: 13px; line-height: 1.65; }
.workspace-dependency-list > div.done { border-color: #86efac; background: #f0fdf4; }
.workspace-dependency-head { display: flex; align-items: center; gap: 8px; margin: -2px -2px 8px; padding: 0 !important; border: 0 !important; background: transparent !important; }
.workspace-dependency-head b { flex: 1; min-width: 0; font-size: 12px; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.workspace-dependency-head span { flex-shrink: 0; font-size: 11px; font-weight: 900; color: #2563eb; }
.workspace-dependency-head button { flex-shrink: 0; height: 26px; padding: 0 9px; border-radius: 7px; border: 1px solid #bfdbfe; background: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 900; cursor: pointer; }
.workspace-dependency-head button:hover { background: #dbeafe; border-color: #93c5fd; }
.workspace-material-result { margin-top: 8px; padding: 0 !important; border: 0 !important; background: transparent !important; }
.workspace-material-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; padding: 8px 10px !important; border: 1px solid #bfdbfe !important; border-radius: 8px; background: #eff6ff !important; }
.workspace-material-summary b { color: #2563eb; font-size: 12px; font-weight: 900; }
.workspace-material-summary span { color: #344054; font-size: 11px; font-weight: 800; }
.workspace-material-table-wrap { overflow: auto; border: 1px solid #dbe6f5; border-radius: 8px; background: #fff; }
.workspace-material-table-wrap table { width: 100%; min-width: 680px; border-collapse: collapse; }
.workspace-material-table-wrap th,.workspace-material-table-wrap td { padding: 8px; border-bottom: 1px solid #eef2f7; color: #344054; font-size: 12px; text-align: left; vertical-align: middle; }
.workspace-material-table-wrap th { color: #667085; background: #fbfcfe; font-size: 11px; font-weight: 900; }
.workspace-material-table-wrap td b { color: #111827; font-size: 12px; font-weight: 900; }
.workspace-material-table-wrap img { width: 74px; height: 52px; object-fit: cover; border-radius: 7px; background: #f3f4f6; }
.workspace-material-empty { color: #98a2b3; font-size: 11px; font-weight: 800; }
@media (max-width: 720px) { .workspace-task-meta { grid-template-columns: 1fr 1fr; } }
`;
