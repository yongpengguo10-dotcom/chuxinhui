import { useState } from "react";
import { Plus, Send, X } from "lucide-react";
import { Project } from "../data/projects";
import { Task, TASK_ROLES, TaskPriority, TaskResultType, TaskRole } from "../data/tasks";
import { DateTimePicker } from "./DateTimePicker";

interface QuickTaskRequestProps {
  requesterRole: TaskRole | "总控";
  projects?: Project[];
  currentProject: Project;
  sourceTask?: Task | null;
  onCreateTask: (task: Task) => void;
  showToast: (msg: string) => void;
  buttonLabel?: string;
}

const PRIORITIES: TaskPriority[] = ["普通", "重要", "紧急"];
const RESULT_TYPES: TaskResultType[] = ["图片", "文案", "表格", "视频", "其他"];
const OTHER_SCOPE = "__other__";

export function QuickTaskRequest({
  requesterRole,
  projects,
  currentProject,
  sourceTask,
  onCreateTask,
  showToast,
  buttonLabel = "发起协作",
}: QuickTaskRequestProps) {
  const projectOptions = projects?.length ? projects : [currentProject];
  const [open, setOpen] = useState(false);
  const [projectChoice, setProjectChoice] = useState(currentProject.id);
  const [otherScopeName, setOtherScopeName] = useState("");
  const [targetRole, setTargetRole] = useState<TaskRole>("文案");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("重要");
  const [resultType, setResultType] = useState<TaskResultType>("其他");
  const [needReview, setNeedReview] = useState(false);

  const reset = () => {
    setProjectChoice(currentProject.id);
    setOtherScopeName("");
    setTargetRole("文案");
    setName("");
    setDesc("");
    setDeadline("");
    setPriority("重要");
    setResultType("其他");
    setNeedReview(false);
  };

  const submit = () => {
    if (!name.trim() || !deadline) {
      showToast("请填写协作任务名称和截止时间");
      return;
    }

    const isOtherScope = projectChoice === OTHER_SCOPE;
    const selectedProject = projectOptions.find(project => project.id === projectChoice) ?? currentProject;
    const taskProjectId = isOtherScope ? currentProject.id : selectedProject.id;
    const canLinkSourceTask = Boolean(sourceTask && sourceTask.projectId === taskProjectId && !isOtherScope);
    const scopeLine = isOtherScope
      ? `归属：其他/非项目事项${otherScopeName.trim() ? `（${otherScopeName.trim()}）` : ""}`
      : `归属项目：${selectedProject.fullName}`;

    const task: Task = {
      id: `quick_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      projectId: taskProjectId,
      taskGroupId: canLinkSourceTask ? sourceTask?.taskGroupId : `quick_group_${Date.now().toString(36)}`,
      role: targetRole,
      name: name.trim(),
      desc: [
        scopeLine,
        desc.trim(),
        `发起岗位：${requesterRole}`,
        canLinkSourceTask && sourceTask ? `关联任务：${sourceTask.name}` : "",
      ].filter(Boolean).join("\n"),
      owner: targetRole,
      collaborators: canLinkSourceTask && sourceTask ? [sourceTask.owner] : [],
      deadline,
      priority,
      needUpload: true,
      resultType,
      needReview,
      isKey: priority === "紧急",
      linkedTaskIds: canLinkSourceTask && sourceTask ? [sourceTask.id] : [],
      status: "未开始",
      uploaded: false,
    };

    onCreateTask(task);
    showToast(`已向${targetRole}发起协作任务`);
    setOpen(false);
    reset();
  };

  return (
    <>
      <button className="quick-request-button" onClick={() => setOpen(true)}>
        <Plus size={14} /> {buttonLabel}
      </button>

      {open && (
        <div className="quick-request-backdrop" onClick={() => setOpen(false)}>
          <div className="quick-request-modal" onClick={event => event.stopPropagation()}>
            <div className="quick-request-header">
              <div>
                <h3>发起临时协作需求</h3>
                <p>{requesterRole}可以直接向其它岗位发布一条真实任务。</p>
              </div>
              <button onClick={() => setOpen(false)}><X size={16} /></button>
            </div>

            <div className="quick-request-body">
              <label>
                <span>归属项目</span>
                <select value={projectChoice} onChange={event => setProjectChoice(event.target.value)}>
                  {projectOptions.map(project => <option key={project.id} value={project.id}>{project.fullName}</option>)}
                  <option value={OTHER_SCOPE}>其他 / 非项目事项</option>
                </select>
              </label>
              {projectChoice === OTHER_SCOPE && (
                <label>
                  <span>事项名称</span>
                  <input value={otherScopeName} onChange={event => setOtherScopeName(event.target.value)} placeholder="例如：临时场地问题、跨项目支援、突发客户需求" />
                </label>
              )}
              <label>
                <span>目标岗位</span>
                <select value={targetRole} onChange={event => setTargetRole(event.target.value as TaskRole)}>
                  {TASK_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </label>
              <label>
                <span>任务名称</span>
                <input value={name} onChange={event => setName(event.target.value)} placeholder="例如：补一版海报文案 / 确认现场尺寸" />
              </label>
              <label>
                <span>需求说明</span>
                <textarea value={desc} onChange={event => setDesc(event.target.value)} placeholder="写清需要对方交付什么、用途、注意事项..." />
              </label>
              <div className="quick-request-grid">
                <label>
                  <span>截止时间</span>
                  <DateTimePicker value={deadline} onChange={setDeadline} includeTime />
                </label>
                <label>
                  <span>优先级</span>
                  <select value={priority} onChange={event => setPriority(event.target.value as TaskPriority)}>
                    {PRIORITIES.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>
              <div className="quick-request-grid">
                <label>
                  <span>成果类型</span>
                  <select value={resultType} onChange={event => setResultType(event.target.value as TaskResultType)}>
                    {RESULT_TYPES.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="quick-request-check">
                  <input type="checkbox" checked={needReview} onChange={event => setNeedReview(event.target.checked)} />
                  <span>需要审核</span>
                </label>
              </div>
            </div>

            <div className="quick-request-footer">
              <button onClick={() => setOpen(false)}>取消</button>
              <button className="primary" onClick={submit}><Send size={14} /> 发布协作任务</button>
            </div>
          </div>
        </div>
      )}

      <style>{quickRequestCss}</style>
    </>
  );
}

const quickRequestCss = `
.quick-request-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid #2563eb; background: #2563eb; color: #fff; font-size: 12px; font-weight: 900; cursor: pointer; }
.quick-request-backdrop { position: fixed; inset: 0; z-index: 160; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(15,23,42,.38); backdrop-filter: blur(4px); }
.quick-request-modal { width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 32px); display: flex; flex-direction: column; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 24px 80px rgba(15,23,42,.24); overflow: hidden; }
.quick-request-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px 20px; background: #fbfcfe; border-bottom: 1px solid #e8edf5; }
.quick-request-header h3 { margin: 0; color: #111827; font-size: 17px; font-weight: 900; }
.quick-request-header p { margin: 5px 0 0; color: #667085; font-size: 12px; font-weight: 700; }
.quick-request-header button { width: 32px; height: 32px; border-radius: 999px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; }
.quick-request-body { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 18px 20px; overflow: auto; }
.quick-request-body label { display: flex; flex-direction: column; gap: 6px; }
.quick-request-body span { color: #344054; font-size: 12px; font-weight: 900; }
.quick-request-body input,.quick-request-body select,.quick-request-body textarea { width: 100%; border: 1px solid #dbe6f5; border-radius: 9px; background: #fbfcfe; color: #111827; font-size: 13px; outline: 0; padding: 9px 10px; }
.quick-request-body textarea { min-height: 92px; resize: vertical; line-height: 1.55; }
.quick-request-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.quick-request-check { justify-content: flex-end; min-height: 64px; }
.quick-request-check input { width: auto; }
.quick-request-check { flex-direction: row !important; align-items: center; gap: 8px !important; }
.quick-request-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; background: #fbfcfe; border-top: 1px solid #e8edf5; }
.quick-request-footer button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 14px; border-radius: 8px; border: 1px solid #dbe6f5; background: #fff; color: #344054; font-size: 12px; font-weight: 900; cursor: pointer; }
.quick-request-footer button.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
@media (max-width: 640px) { .quick-request-grid { grid-template-columns: 1fr; } }
`;
