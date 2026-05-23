import { useState } from "react";
import { Send } from "lucide-react";
import { Project } from "../data/projects";
import { Task, TaskRole, TaskPriority, TaskResultType, TASK_ROLES } from "../data/tasks";
import { ROLE_COLOR, PRIORITY_STYLES } from "../lib/taskUtils";
import { PageShell } from "../components/PageShell";
import { NavKey } from "../components/Sidebar";

interface PublishTaskProps {
  projects: Project[];
  currentProject: Project;
  onSwitchProject: (p: Project) => void;
  onPublish: (task: Task) => void;
  onNavigate: (key: NavKey) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
  showToast: (msg: string) => void;
}

const PRIORITIES: TaskPriority[] = ["普通", "重要", "紧急"];
const RESULT_TYPES: TaskResultType[] = ["图片", "文案", "表格", "视频", "其他"];

export function PublishTask({
  projects, currentProject, onSwitchProject, onPublish, onNavigate,
  isMobile, onOpenDrawer, showToast,
}: PublishTaskProps) {
  const [projectId, setProjectId] = useState<string>(currentProject.id);
  const [role, setRole] = useState<TaskRole>("设计");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [owner, setOwner] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("普通");
  const [needUpload, setNeedUpload] = useState(true);
  const [resultType, setResultType] = useState<TaskResultType>("图片");
  const [needReview, setNeedReview] = useState(true);
  const [isKey, setIsKey] = useState(false);

  const canSubmit = name.trim() && owner.trim() && deadline;

  const handleSubmit = () => {
    if (!canSubmit) {
      showToast("请填写必填项");
      return;
    }
    const task: Task = {
      id: `t_${Date.now().toString(36)}`,
      projectId,
      role,
      name: name.trim(),
      desc: desc.trim() || undefined,
      owner: owner.trim(),
      deadline,
      priority,
      needUpload,
      resultType: needUpload ? resultType : undefined,
      needReview,
      isKey,
      status: "未开始",
      uploaded: false,
    };
    onPublish(task);
    const targetProject = projects.find(p => p.id === projectId);
    showToast(`任务「${task.name}」已发布到${targetProject?.fullName ?? ""} · ${role}`);
    onNavigate("control.board");
  };

  return (
    <PageShell
      title="发布任务"
      breadcrumb="项目总控 / 发布任务"
      description="向各岗位派发任务"
      isMobile={isMobile}
      onOpenDrawer={onOpenDrawer}
      showProjectBar
      projects={projects}
      currentProject={currentProject}
      onSwitchProject={onSwitchProject}
    >
      <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.4fr) minmax(0, 1fr)", alignItems: "start" }}>
        {/* Left column: core fields */}
        <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
          <SectionTitle title="基础信息" />

          <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
            <Row label="所属项目" required>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} style={inputStyle}>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
            </Row>
            <Row label="所属岗位" required>
              <select value={role} onChange={e => setRole(e.target.value as TaskRole)} style={inputStyle}>
                {TASK_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Row>
          </div>

          <Row label="任务名称" required>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="如：主海报 v3" style={inputStyle} />
          </Row>

          <Row label="任务说明">
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} placeholder="可选，详细要求" style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          </Row>

          <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
            <Row label="负责人" required>
              <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="姓名" style={inputStyle} />
            </Row>
            <Row label="截止时间" required>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inputStyle} />
            </Row>
          </div>

          <Row label="优先级">
            <div className="flex gap-1.5 flex-wrap">
              {PRIORITIES.map(p => {
                const s = PRIORITY_STYLES[p];
                const active = priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className="px-4 py-1.5 rounded-full"
                    style={{
                      background: active ? s.bg : "#FAFAF8",
                      border: `1px solid ${active ? s.border : "#E8E3D8"}`,
                      color: active ? s.text : "#777",
                      fontSize: 12, fontWeight: active ? 600 : 500, cursor: "pointer", flex: 1, minWidth: 80,
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </Row>
        </div>

        {/* Right column: settings + actions */}
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
            <SectionTitle title="成果与审核" />

            <div className="rounded-xl p-3 mb-3" style={{ background: "#FAFAF8", border: "1px solid #EDE9DF" }}>
              <Checkbox label="需要上传成果" checked={needUpload} onChange={setNeedUpload} />
              {needUpload && (
                <div className="mt-2 ml-6">
                  <div style={{ fontSize: 11, color: "#777", marginBottom: 6 }}>成果类型</div>
                  <div className="flex flex-wrap gap-1.5">
                    {RESULT_TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => setResultType(t)}
                        className="px-2.5 py-1 rounded-full"
                        style={{
                          background: resultType === t ? "#FFF9E6" : "#FFFFFF",
                          border: `1px solid ${resultType === t ? "#F4C542" : "#E8E3D8"}`,
                          color: resultType === t ? "#8A6500" : "#777",
                          fontSize: 11, fontWeight: resultType === t ? 600 : 500, cursor: "pointer",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl p-3" style={{ background: "#FAFAF8", border: "1px solid #EDE9DF" }}>
              <Checkbox label="需要审核" checked={needReview} onChange={setNeedReview} />
              <Checkbox label="关键节点（影响整体进度）" checked={isKey} onChange={setIsKey} />
            </div>
          </div>

          <div className="rounded-2xl p-4 flex items-center gap-2" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
            <button
              onClick={() => onNavigate("control.board")}
              className="flex-1 px-4 py-2.5 rounded-full"
              style={{ background: "#FFFFFF", border: "1px solid #E8E3D8", cursor: "pointer", fontSize: 13, color: "#555" }}
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full"
              style={{
                background: canSubmit ? "#F4C542" : "#F0EDE4",
                border: `1px solid ${canSubmit ? "#E0B232" : "#E8E3D8"}`,
                cursor: canSubmit ? "pointer" : "not-allowed",
                fontSize: 13, color: canSubmit ? "#141414" : "#AAA", fontWeight: 600,
              }}
            >
              <Send size={13} /> 发布任务
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 10,
  border: "1px solid #E8E3D8", background: "#FAFAF8",
  fontSize: 13, color: "#141414", outline: "none",
};

function SectionTitle({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: "#141414", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid #F0EDE4" }}>
      {title}
    </div>
  );
}

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "#CC3333" }}>*</span>}
      </div>
      {children}
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer py-1" style={{ userSelect: "none" }}>
      <span
        className="flex items-center justify-center rounded"
        style={{
          width: 16, height: 16,
          background: checked ? "#F4C542" : "#FFFFFF",
          border: `1.5px solid ${checked ? "#E0B232" : "#CCCCCC"}`,
          flexShrink: 0,
        }}
      >
        {checked && <span style={{ color: "#141414", fontSize: 11, fontWeight: 800, lineHeight: 1 }}>✓</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: "none" }} />
      <span style={{ fontSize: 13, color: "#141414" }}>{label}</span>
    </label>
  );
}
