import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowDown,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  FileText,
  GitBranch,
  Image,
  Link2,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Project } from "../data/projects";
import { Task, TaskRole, TaskPriority, TaskResultType, TASK_ROLES } from "../data/tasks";
import { roleColor } from "../lib/taskUtils";
import { formatDisplayDateTime } from "../lib/dateFormat";
import { PageShell } from "../components/PageShell";
import { NavKey } from "../components/Sidebar";

interface PublishTaskProps {
  projects: Project[];
  currentProject: Project;
  tasks: Task[];
  onSwitchProject: (p: Project) => void;
  onPublish: (task: Task | Task[]) => void;
  onNavigate: (key: NavKey) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
  showToast: (msg: string) => void;
}

interface TaskChainStep {
  id: string;
  role: TaskRole;
  name: string;
  owner: string;
  collaborators: string;
  deadline: string;
  resultType: TaskResultType;
  needUpload: boolean;
  needReview: boolean;
  isKey: boolean;
  parentStepId?: string;
}

interface AgentTaskDraft {
  taskName: string;
  desc: string;
  priority: TaskPriority;
  estimatedDays: string;
  steps: TaskChainStep[];
}

const PRIORITIES: TaskPriority[] = ["普通", "重要", "紧急"];
const RESULT_TYPES: TaskResultType[] = ["图片", "文案", "表格", "视频", "其他"];
const ROLE_ICONS: Record<TaskRole, any> = {
  "招商": UserPlus,
  "设计": Image,
  "文案": FileText,
  "短视频": Image,
  "运营": GitBranch,
  "客服": Link2,
  "现场执行": Paperclip,
};

const DEFAULT_ROLE_ICON = Circle;

const DEFAULT_CHAIN_STEPS: TaskChainStep[] = [
  createStep("设计", "主视觉海报设计", "图片", true, true),
];

function createStep(
  role: TaskRole = "设计",
  name = "",
  resultType: TaskResultType = "图片",
  needUpload = true,
  needReview = true,
): TaskChainStep {
  return {
    id: `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    role,
    name,
    owner: "",
    collaborators: "",
    deadline: "",
    resultType,
    needUpload,
    needReview,
    isKey: role === "设计" || role === "文案",
  };
}

export function PublishTask({
  projects, currentProject, tasks, onSwitchProject, onPublish, onNavigate,
  isMobile, onOpenDrawer, showToast,
}: PublishTaskProps) {
  const [mode, setMode] = useState<"chain" | "single">("chain");
  const [projectId, setProjectId] = useState<string>(currentProject.id);
  const [taskName, setTaskName] = useState("5月课程主视觉海报设计");
  const [desc, setDesc] = useState("请基于课程主题和品牌 VI，输出主视觉海报，用于朋友圈和渠道投放。");
  const [priority, setPriority] = useState<TaskPriority>("重要");
  const [estimatedDays, setEstimatedDays] = useState("5");
  const [steps, setSteps] = useState<TaskChainStep[]>(DEFAULT_CHAIN_STEPS);
  const [collaborationEditor, setCollaborationEditor] = useState<{ afterStepId: string; step: TaskChainStep } | null>(null);
  const [editingCollaborationId, setEditingCollaborationId] = useState<string | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentDraft, setAgentDraft] = useState<AgentTaskDraft | null>(null);

  const selectedProject = useMemo(
    () => projects.find(p => p.id === projectId) ?? currentProject,
    [projects, projectId, currentProject],
  );

  const publishSteps = mode === "single" ? steps.slice(0, 1) : flattenSteps(steps);
  const visibleSteps = mode === "single" ? steps.slice(0, 1) : steps.filter(step => !step.parentStepId);
  const canSubmit = taskName.trim() && desc.trim() && publishSteps.length > 0 && publishSteps.every(isStepComplete);
  const chainSteps = publishSteps;
  const finalStep = chainSteps[chainSteps.length - 1];

  const updateStep = (id: string, patch: Partial<TaskChainStep>) => {
    setSteps(prev => prev.map(step => (step.id === id ? { ...step, ...patch } : step)));
  };

  const addStep = () => {
    setSteps(prev => [...prev, createStep("运营", `${taskName || "项目任务"}协同事项`, "其他", true, false)]);
  };

  const removeStep = (id: string) => {
    setSteps(prev => prev.length <= 1 ? prev : prev.filter(step => step.id !== id));
  };

  const moveStep = (id: string, direction: -1 | 1) => {
    setSteps(prev => {
      const index = prev.findIndex(step => step.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const openCollaborationEditor = (step: TaskChainStep) => {
    setCollaborationEditor({
      afterStepId: step.id,
      step: { ...createStep("文案", `${taskName || step.name}协作任务`, "文案", true, true), parentStepId: step.id },
    });
  };

  const saveCollaborationEditor = () => {
    if (!collaborationEditor) return;
    setSteps(prev => {
      const exists = prev.some(step => step.id === collaborationEditor.step.id);
      return exists
        ? prev.map(step => step.id === collaborationEditor.step.id ? collaborationEditor.step : step)
        : [...prev, collaborationEditor.step];
    });
    setCollaborationEditor(null);
    setEditingCollaborationId(null);
  };

  const editCollaborationStep = (step: TaskChainStep) => {
    if (!step.parentStepId) return;
    setEditingCollaborationId(step.id);
    setCollaborationEditor({ afterStepId: step.parentStepId, step });
  };

  const applyAgentDraft = (draft: AgentTaskDraft) => {
    setMode("chain");
    setTaskName(draft.taskName);
    setDesc(draft.desc);
    setPriority(draft.priority);
    setEstimatedDays(draft.estimatedDays);
    setSteps(draft.steps);
    setAgentOpen(false);
    setAgentDraft(null);
    showToast(`已生成 ${draft.steps.length} 步任务链草稿`);
  };

  const removeCollaborationStep = (id: string) => {
    setSteps(prev => prev.filter(step => step.id !== id));
  };

  const moveCollaborationStep = (id: string, direction: -1 | 1) => {
    setSteps(prev => {
      const current = prev.find(step => step.id === id);
      if (!current?.parentStepId) return prev;
      const siblings = prev.filter(step => step.parentStepId === current.parentStepId);
      const currentSiblingIndex = siblings.findIndex(step => step.id === id);
      const targetSibling = siblings[currentSiblingIndex + direction];
      if (!targetSibling) return prev;
      const currentIndex = prev.findIndex(step => step.id === id);
      const targetIndex = prev.findIndex(step => step.id === targetSibling.id);
      const next = [...prev];
      [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
      return next;
    });
  };

  const createTaskId = () => `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const handleSubmit = () => {
    if (!canSubmit) {
      showToast("请补全任务名称、说明、负责人和截止时间");
      return;
    }

    const groupId = `g_${Date.now().toString(36)}`;
    const ids = publishSteps.map(() => createTaskId());
    const nextTasks: Task[] = publishSteps.map((step, index) => ({
      id: ids[index],
      projectId,
      taskGroupId: groupId,
      role: step.role,
      name: step.name.trim(),
      desc: desc.trim(),
      owner: step.owner.trim() || step.role,
      collaborators: splitNames(step.collaborators),
      deadline: step.deadline,
      priority,
      needUpload: step.needUpload,
      resultType: step.needUpload ? step.resultType : undefined,
      needReview: step.needReview,
      isKey: step.isKey,
      dependencyIds: index === 0 ? [] : [ids[index - 1]],
      linkedTaskIds: index === publishSteps.length - 1 ? [] : [ids[index + 1]],
      status: index === 0 ? "未开始" : "等待前置任务",
      uploaded: false,
    }));

    onPublish(nextTasks);
    showToast(mode === "chain" ? `任务链已发布，共 ${nextTasks.length} 个岗位任务` : `任务「${nextTasks[0].name}」已发布`);
    onNavigate("control.board");
  };

  return (
    <PageShell
      title="发布任务"
      breadcrumb=""
      isMobile={isMobile}
      onOpenDrawer={onOpenDrawer}
      projects={projects}
      currentProject={currentProject}
      onSwitchProject={onSwitchProject}
    >
      <div className="flex flex-col gap-2" style={{ height: isMobile ? "auto" : "100%", minHeight: 0 }}>
        <div className="rounded-2xl px-3 py-2 flex items-center justify-between gap-3" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#141414" }}>智能发布助手</div>
            <div style={{ fontSize: 11, color: "#7D8DA1", marginTop: 2 }}>用一句话生成多岗位任务链草稿，确认后再发布。</div>
          </div>
          <button onClick={() => setAgentOpen(true)} className="flex items-center gap-2 rounded-xl px-4 py-2" style={primaryButtonStyle}>
            <Sparkles size={14} /> AI 生成任务链
          </button>
        </div>
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: isMobile ? "1fr" : "minmax(300px, 0.85fr) minmax(440px, 1.2fr) minmax(260px, 0.65fr)",
            alignItems: "stretch",
            flex: 1,
            minHeight: 0,
          }}
        >
        <section className="rounded-2xl p-3" style={{ ...panelStyle, overflow: "auto", minHeight: 0 }}>
          <PanelTitle title="任务基本信息" />
          <Row label="所属项目" required>
            <select
              value={projectId}
              onChange={e => {
                setProjectId(e.target.value);
                const nextProject = projects.find(project => project.id === e.target.value);
                if (nextProject) onSwitchProject(nextProject);
              }}
              style={inputStyle}
            >
              {projects.map(project => <option key={project.id} value={project.id}>{project.fullName}</option>)}
            </select>
          </Row>
          <Row label="任务名称" required>
            <input value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="例如：5月课程主视觉海报设计" style={inputStyle} />
          </Row>
          <Row label="任务说明" required>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="请写清任务背景、用途、核心信息和注意事项" style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.45 }} />
          </Row>

          <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
            <Row label="优先级">
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} style={inputStyle}>
                {PRIORITIES.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </Row>
            <Row label="预计工期">
              <select value={estimatedDays} onChange={e => setEstimatedDays(e.target.value)} style={inputStyle}>
                {["1", "2", "3", "5", "7", "10", "14"].map(day => <option key={day} value={day}>{day} 天</option>)}
              </select>
            </Row>
          </div>

          <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <ModeButton active={mode === "chain"} icon={GitBranch} title="任务链" desc="多岗位顺序协作" onClick={() => setMode("chain")} />
            <ModeButton active={mode === "single"} icon={Link2} title="单个任务" desc="高级/简单模式" onClick={() => setMode("single")} />
          </div>

          <div className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: "#FBFCFE", border: "1px dashed #CBD7EA", color: "#7D8DA1" }}>
            <Paperclip size={15} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>附件（可选）</div>
              <div style={{ fontSize: 10, marginTop: 2 }}>支持 JPG / PNG / PDF / AI / PSD，当前版本先预留入口</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl p-3" style={{ ...panelStyle, overflow: "auto", minHeight: 0 }}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <PanelTitle title="分发到岗位" noMargin />
            {mode === "chain" && (
              <button onClick={addStep} className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={secondaryButtonStyle}>
                <Plus size={13} /> 添加步骤
              </button>
            )}
          </div>

          <div className="rounded-xl px-3 py-2 mb-2" style={{ background: "#F8FAFF", border: "1px solid #DDE7FA" }}>
            <div style={{ fontSize: 12, color: "#52616F", lineHeight: 1.6 }}>
              {mode === "chain" ? "当前为多步骤链路：后一个岗位会等待前一个岗位完成后自动解锁。" : "当前为单个任务：只生成一个岗位任务。"}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {visibleSteps.map((step, index) => (
              <StepEditor
                key={step.id}
                step={step}
                index={index}
                total={visibleSteps.length}
                mode={mode}
                collaborationSteps={steps.filter(item => item.parentStepId === step.id)}
                onRemoveCollaboration={removeCollaborationStep}
                onMoveCollaboration={moveCollaborationStep}
                onEditCollaboration={editCollaborationStep}
                onChange={patch => updateStep(step.id, patch)}
                onRemove={() => removeStep(step.id)}
                onMove={direction => moveStep(step.id, direction)}
                onAddCollaboration={() => openCollaborationEditor(step)}
                isMobile={isMobile}
              />
            ))}
          </div>
        </section>

        <aside className="rounded-2xl p-3" style={{ ...panelStyle, overflow: "auto", minHeight: 0 }}>
          <PanelTitle title="任务预览" />
          <PreviewItem label="任务名称" value={taskName || "未填写"} />
          <PreviewItem label="所属项目" value={selectedProject.fullName} />
          <PreviewItem label="任务类型" value={finalStep?.role ?? "未选择"} badge />
          <PreviewItem label="优先级" value={priority} danger={priority === "紧急"} />
          <PreviewItem label="截止时间" value={finalStep?.deadline ? formatDisplayDateTime(finalStep.deadline) : "未填写"} />
          <PreviewItem label="负责岗位" value={finalStep?.role ?? "未选择"} />
          <PreviewItem label="岗位人员" value={finalStep?.owner || "未指定"} />
          <PreviewItem label="成果类型" value={finalStep?.needUpload ? finalStep.resultType : "无需上传"} />
          <PreviewItem label="是否需审核" value={finalStep?.needReview ? "需要" : "不需要"} />
          <PreviewItem label="关键节点" value={finalStep?.isKey ? "是" : "否"} />
          {mode === "chain" && finalStep && chainSteps.length > 1 && (
            <PreviewItem label="前置任务" value={`${chainSteps[chainSteps.length - 2].name || "上一任务"}（${chainSteps[chainSteps.length - 2].role}）`} done />
          )}

          <div className="mt-2 pt-2" style={{ borderTop: "1px solid #F0EDE4" }}>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>任务链路</div>
            <ChainPreview steps={publishSteps} />
          </div>

          <div className="mt-2 rounded-xl px-3 py-2 flex items-center justify-between" style={{ background: "#FBFCFE", border: "1px solid #E6ECF5" }}>
            <span style={{ fontSize: 12, color: "#777", fontWeight: 700 }}>预计耗时</span>
            <span style={{ fontSize: 22, color: "#1F6FEB", fontWeight: 800 }}>{estimatedDays} 天</span>
          </div>
        </aside>
        </div>

      <div className="rounded-2xl p-2 flex items-center justify-end gap-2" style={{ background: "rgba(255,255,255,0.92)", border: "1px solid #EDE9DF", backdropFilter: "blur(10px)", flexShrink: 0 }}>
        <button onClick={() => onNavigate("control.board")} className="rounded-xl px-5 py-2" style={plainButtonStyle}>取消</button>
        <button className="rounded-xl px-5 py-2" style={plainButtonStyle}>保存草稿</button>
        <button onClick={handleSubmit} className="flex items-center gap-2 rounded-xl px-5 py-2" style={{ ...primaryButtonStyle, opacity: canSubmit ? 1 : 0.55, cursor: canSubmit ? "pointer" : "not-allowed" }}>
          <Send size={14} /> 确认发布
        </button>
      </div>
      </div>

      {collaborationEditor && (
        <CollaborationTaskModal
          step={collaborationEditor.step}
          editing={Boolean(editingCollaborationId)}
          onChange={patch => setCollaborationEditor(prev => prev ? { ...prev, step: { ...prev.step, ...patch } } : prev)}
          onCancel={() => {
            setCollaborationEditor(null);
            setEditingCollaborationId(null);
          }}
          onSave={saveCollaborationEditor}
        />
      )}

      {agentOpen && (
        <AgentPublishModal
          currentProject={selectedProject}
          draft={agentDraft}
          onDraft={setAgentDraft}
          onApply={applyAgentDraft}
          onCancel={() => {
            setAgentOpen(false);
            setAgentDraft(null);
          }}
        />
      )}
    </PageShell>
  );
}

function isStepComplete(step: TaskChainStep): boolean {
  return Boolean(step.name.trim() && step.deadline);
}

function flattenSteps(steps: TaskChainStep[]): TaskChainStep[] {
  const visible = steps.filter(step => !step.parentStepId);
  return visible.flatMap(step => [...steps.filter(item => item.parentStepId === step.id), step]);
}

function splitNames(value: string): string[] {
  return value
    .split(/[,，、\s]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function buildAgentDraft(prompt: string, project: Project): AgentTaskDraft {
  const text = prompt.trim();
  const roles = inferRoles(text);
  const finalRole = inferFinalRole(text, roles);
  const supportRoles = roles.filter(role => role !== finalRole);
  const deadline = inferDeadline(text);
  const taskName = inferMainTaskName(text, finalRole);
  const priority = /紧急|尽快|马上|今天|今晚|立刻|急/.test(text) ? "紧急" : /重要|关键/.test(text) ? "重要" : "普通";
  const mainStep = {
    ...createStep(finalRole, taskName, inferResultType(text, finalRole), true, true),
    deadline,
    owner: finalRole,
    isKey: true,
  };
  const supportSteps = supportRoles.map((role, index) => {
    const resultType = inferResultType(text, role);
    return {
      ...createStep(role, inferStepName(text, role, taskName, false), resultType, true, role === "文案"),
      deadline: inferStepDeadline(deadline, supportRoles.length + 1, index),
      owner: role,
      isKey: role === "招商" || role === "文案",
      parentStepId: mainStep.id,
    };
  });
  const steps = [...supportSteps, mainStep];

  return {
    taskName,
    desc: `${project.fullName}：${text}`,
    priority,
    estimatedDays: String(Math.max(1, Math.min(14, Math.ceil((getDateTime(deadline).getTime() - Date.now()) / 86400000) || 1))),
    steps,
  };
}

function inferRoles(text: string): TaskRole[] {
  const matches = TASK_ROLES.filter(role => text.includes(role) || (role === "现场执行" && text.includes("现场")));
  if (/方案|客户|成交|邀约|招商/.test(text) && !matches.includes("招商")) matches.push("招商");
  if (/文案|标题|推文|话术|脚本/.test(text) && !matches.includes("文案")) matches.push("文案");
  if (/尺寸|场地|现场|物料/.test(text) && !matches.includes("现场执行")) matches.push("现场执行");
  if (/海报|图片|主视觉|设计|出图|长图|二维码/.test(text) && !matches.includes("设计")) matches.push("设计");
  if (/短视频|视频|剪辑|拍摄/.test(text) && !matches.includes("短视频")) matches.push("短视频");
  if (/群发|社群|发布|运营/.test(text) && !matches.includes("运营")) matches.push("运营");
  return matches.length ? matches : ["设计"];
}

function inferFinalRole(text: string, roles: TaskRole[]): TaskRole {
  if (/短视频|视频|剪辑/.test(text) && roles.includes("短视频")) return "短视频";
  if (/海报|图片|主视觉|设计|出图|长图/.test(text) && roles.includes("设计")) return "设计";
  if (/群发|发布|社群/.test(text) && roles.includes("运营")) return "运营";
  return roles[roles.length - 1] ?? "设计";
}

function inferMainTaskName(text: string, finalRole: TaskRole) {
  const target = text.match(/(?:做|制作|完成|设计|发布|准备)(一张|一个|一份|条)?([^，。；,;]{2,18}?)(?:，|。|；|,|;|需要|并|然后|最后|$)/)?.[2]?.trim();
  if (target) return target;
  if (/海报|主视觉/.test(text)) return "主视觉海报设计";
  if (/短视频|视频/.test(text)) return "短视频制作";
  if (/文案|推文/.test(text)) return "文案撰写";
  return `${finalRole}任务`;
}

function inferStepName(text: string, role: TaskRole, taskName: string, final: boolean) {
  if (final) return taskName;
  if (role === "招商") return /方案/.test(text) ? "确认活动方案" : "确认招商信息";
  if (role === "文案") return /海报/.test(text) ? "撰写海报文案" : "撰写项目文案";
  if (role === "现场执行") return /尺寸/.test(text) ? "确认现场尺寸" : "确认现场执行信息";
  if (role === "运营") return "确认发布与投放安排";
  if (role === "客服") return "整理客户沟通信息";
  if (role === "短视频") return "准备视频素材";
  return `${role}前置准备`;
}

function inferResultType(text: string, role: TaskRole): TaskResultType {
  if (role === "设计") return "图片";
  if (role === "文案") return "文案";
  if (role === "短视频") return "视频";
  if (/表格|名单|清单/.test(text)) return "表格";
  return "其他";
}

function inferDeadline(text: string) {
  const now = new Date();
  const target = new Date(now);
  if (/后天/.test(text)) target.setDate(now.getDate() + 2);
  else if (/明天|明晚/.test(text)) target.setDate(now.getDate() + 1);
  else if (/今天|今晚/.test(text)) target.setDate(now.getDate());
  else {
    const dayMatch = text.match(/(\d+)\s*天后/);
    target.setDate(now.getDate() + (dayMatch ? Number(dayMatch[1]) : 3));
  }
  const hourMatch = text.match(/(\d{1,2})\s*[点:：](\d{1,2})?/);
  const afternoon = /下午|晚上|今晚|明晚/.test(text);
  let hour = hourMatch ? Number(hourMatch[1]) : 18;
  if (afternoon && hour < 12) hour += 12;
  const minute = hourMatch?.[2] ? Number(hourMatch[2]) : 0;
  target.setHours(hour, minute, 0, 0);
  return toLocalInputValue(target);
}

function inferStepDeadline(finalDeadline: string, total: number, index: number) {
  const finalDate = getDateTime(finalDeadline);
  const hoursBefore = Math.max(0, total - index - 1) * 3;
  finalDate.setHours(finalDate.getHours() - hoursBefore);
  return toLocalInputValue(finalDate);
}

function getDateTime(value: string) {
  return new Date(value.includes("T") ? value : value.replace(" ", "T"));
}

function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function StepEditor({
  step,
  index,
  total,
  mode,
  collaborationSteps,
  onRemoveCollaboration,
  onMoveCollaboration,
  onEditCollaboration,
  onChange,
  onRemove,
  onMove,
  onAddCollaboration,
  isMobile,
}: {
  step: TaskChainStep;
  index: number;
  total: number;
  mode: "chain" | "single";
  collaborationSteps: TaskChainStep[];
  onRemoveCollaboration: (id: string) => void;
  onMoveCollaboration: (id: string, direction: -1 | 1) => void;
  onEditCollaboration: (step: TaskChainStep) => void;
  onChange: (patch: Partial<TaskChainStep>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onAddCollaboration: () => void;
  isMobile: boolean;
}) {
  const RoleIcon = ROLE_ICONS[step.role] ?? DEFAULT_ROLE_ICON;
  const currentRoleColor = roleColor(step.role);
  return (
    <div className="rounded-2xl p-3" style={{ background: "#FFFFFF", border: "1px solid #E6ECF5", boxShadow: "0 8px 24px rgba(20,20,20,0.03)" }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center rounded-full" style={{ width: 24, height: 24, background: "#EEF4FF", color: "#1F6FEB", fontSize: 12, fontWeight: 800 }}>{index + 1}</span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: currentRoleColor.bg, border: `1px solid ${currentRoleColor.border}`, color: currentRoleColor.text, fontSize: 12, fontWeight: 800 }}>
            <RoleIcon size={13} /> {step.role}
          </span>
          {index > 0 && <span style={{ fontSize: 11, color: "#7D8DA1" }}>等待上一步完成</span>}
        </div>
        {mode === "chain" && (
          <div className="flex items-center gap-1">
            <IconButton title="上移" disabled={index === 0} onClick={() => onMove(-1)} icon={ChevronLeft} />
            <IconButton title="下移" disabled={index === total - 1} onClick={() => onMove(1)} icon={ChevronRight} />
            <IconButton title="删除" disabled={total <= 1} onClick={onRemove} icon={Trash2} danger />
          </div>
        )}
      </div>

      <div className="mb-2">
        <InlineLabel label="选择岗位" required />
        <div className="grid gap-2" style={{ gridTemplateColumns: isMobile ? "repeat(4, minmax(0, 1fr))" : "repeat(7, minmax(0, 1fr))" }}>
          {TASK_ROLES.map(role => {
            const Icon = ROLE_ICONS[role] ?? DEFAULT_ROLE_ICON;
            const active = step.role === role;
            const color = roleColor(role);
            return (
              <button
                key={role}
                onClick={() => onChange({ role })}
                className="flex flex-col items-center justify-center gap-1 rounded-xl"
                style={{
                  height: 48,
                  background: active ? "#F3F7FF" : "#FFFFFF",
                  border: `1.5px solid ${active ? "#1F6FEB" : "#E6ECF5"}`,
                  color: active ? "#1F6FEB" : "#52616F",
                  boxShadow: active ? "0 0 0 3px rgba(31,111,235,0.08)" : "none",
                  cursor: "pointer",
                }}
              >
                <span className="flex items-center justify-center rounded-lg" style={{ width: 22, height: 22, background: active ? "#E8F1FF" : color.bg, color: active ? "#1F6FEB" : color.text }}>
                  <Icon size={13} />
                </span>
                <span style={{ fontSize: 10.5, fontWeight: active ? 900 : 700 }}>{role}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Row label="步骤任务名称" required>
        <input value={step.name} onChange={e => onChange({ name: e.target.value })} placeholder="例如：确认物料尺寸" style={inputStyle} />
      </Row>

      <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
        <Row label="负责岗位">
          <div className="rounded-xl px-3 py-2.5" style={{ background: "#F8FAFF", border: "1px solid #DDE7FA", color: "#1F4FA3", fontSize: 13, fontWeight: 900 }}>
            {step.role}
          </div>
        </Row>
        <Row label="截止时间" required>
          <input type="datetime-local" value={step.deadline} onChange={e => onChange({ deadline: e.target.value })} style={inputStyle} />
        </Row>
      </div>

      <Row label="岗位人员（可选）">
        <input value={step.owner} onChange={e => onChange({ owner: e.target.value })} placeholder={`可填具体执行人；不填则默认为${step.role}岗`} style={inputStyle} />
      </Row>

      {mode === "chain" && (
        <div className="rounded-2xl px-3 py-2 mb-2" style={{ background: "#F8FAFF", border: "1px dashed #BBD2FF" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div style={{ fontSize: 12, color: "#52616F", fontWeight: 900 }}>协作岗位任务</div>
              <div style={{ fontSize: 11, color: "#7D8DA1", marginTop: 3 }}>需要别的岗位配合时，在这里新增一个真实任务。</div>
            </div>
            <button onClick={onAddCollaboration} className="rounded-xl px-3 py-1.5" style={secondaryButtonStyle}>
              + 添加协作岗位
            </button>
          </div>
          {collaborationSteps.length > 0 && (
            <div className="mt-2 rounded-xl p-2" style={{ background: "#FFFFFF", border: "1px solid #DDE7FA" }}>
              <div style={{ fontSize: 11, color: "#7D8DA1", fontWeight: 900, marginBottom: 8 }}>已添加协作</div>
              <div className="flex flex-col gap-2">
                {collaborationSteps.map((item, childIndex) => (
                  <CollaborationSummary
                    key={item.id}
                    step={item}
                    index={childIndex}
                    total={collaborationSteps.length}
                    onRemove={() => onRemoveCollaboration(item.id)}
                    onMove={direction => onMoveCollaboration(item.id, direction)}
                    onEdit={() => onEditCollaboration(item)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl px-3 py-2 mb-2" style={{ background: "#FFFDF7", border: "1px solid #F3DFAE" }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <div style={{ fontSize: 12, color: "#52616F", fontWeight: 900 }}>任务依赖</div>
            <div style={{ fontSize: 11, color: "#8A6A1F", marginTop: 3 }}>
              {index === 0 ? "当前任务没有前置任务，发布后可直接开始" : "当前任务会等待上一步完成后才可开始"}
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md" style={{ background: index === 0 ? "#E9F8EF" : "#EEF4FF", color: index === 0 ? "#1E7A3D" : "#1F6FEB", fontSize: 11, fontWeight: 900 }}>
            {index === 0 ? "可开始" : "自动阻塞"}
          </span>
        </div>
        {index > 0 && (
          <div className="rounded-xl px-3 py-2" style={{ background: "#FFFFFF", border: "1px solid #E8E3D8", fontSize: 12, color: "#141414", fontWeight: 700 }}>
            前置任务：第 {index} 步完成后自动解锁
          </div>
        )}
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
        <Row label="成果类型">
          <div className="flex flex-wrap gap-1.5">
            {RESULT_TYPES.map(type => (
              <button
                key={type}
                onClick={() => onChange({ resultType: type, needUpload: true })}
                className="rounded-full px-3 py-1.5"
                style={{
                  background: step.resultType === type && step.needUpload ? "#EEF4FF" : "#FAFAF8",
                  border: `1px solid ${step.resultType === type && step.needUpload ? "#9CC2FF" : "#E8E3D8"}`,
                  color: step.resultType === type && step.needUpload ? "#1F6FEB" : "#777",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </Row>
        <Row label="任务设置">
          <div className="flex flex-wrap gap-2">
            <TogglePill label="上传成果" checked={step.needUpload} onClick={() => onChange({ needUpload: !step.needUpload })} />
            <TogglePill label="需审核" checked={step.needReview} onClick={() => onChange({ needReview: !step.needReview })} />
            <TogglePill label="关键" checked={step.isKey} onClick={() => onChange({ isKey: !step.isKey })} />
          </div>
        </Row>
      </div>
    </div>
  );
}

function ChainPreview({ steps }: { steps: TaskChainStep[] }) {
  return (
    <div className="flex flex-col gap-2">
      {steps.map((step, index) => (
        <div key={step.id}>
          <div className="rounded-xl p-2.5" style={{ background: "#FAFAF8", border: "1px solid #EDE9DF" }}>
            <div className="flex items-center gap-2">
              {isStepComplete(step) ? <CheckCircle2 size={15} style={{ color: "#1E7A3D" }} /> : <Circle size={15} style={{ color: "#AAB4C2" }} />}
              <span style={{ fontSize: 12, fontWeight: 800, color: "#141414", flex: 1 }}>{step.name || `${step.role}任务`}</span>
              <span style={{ fontSize: 10, color: roleColor(step.role).text, fontWeight: 800 }}>{step.role}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5" style={{ fontSize: 11, color: "#7D8DA1" }}>
              <span className="flex items-center gap-1"><Calendar size={11} />{step.deadline ? formatDisplayDateTime(step.deadline) : "未定"}</span>
              <span className="flex items-center gap-1"><Clock3 size={11} />{step.needReview ? "待审核" : "直接完成"}</span>
            </div>
          </div>
          {index < steps.length - 1 && <div className="flex justify-center py-1"><ArrowDown size={14} style={{ color: "#AAB4C2" }} /></div>}
        </div>
      ))}
    </div>
  );
}

function CollaborationSummary({
  step,
  index,
  total,
  onRemove,
  onMove,
  onEdit,
}: {
  step: TaskChainStep;
  index: number;
  total: number;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onEdit: () => void;
}) {
  const Icon = ROLE_ICONS[step.role] ?? DEFAULT_ROLE_ICON;
  const color = roleColor(step.role);
  return (
    <button
      className="group relative flex items-center gap-2 rounded-xl px-3 py-2"
      style={{ width: "100%", background: "#FBFCFE", border: "1px solid #E6ECF5", textAlign: "left", cursor: "pointer" }}
      onClick={onEdit}
    >
      <button
        onClick={event => {
          event.stopPropagation();
          onRemove();
        }}
        title="删除协作任务"
        className="absolute flex items-center justify-center rounded-full opacity-40 group-hover:opacity-100 transition-opacity"
        style={{
          right: 6,
          top: 6,
          width: 22,
          height: 22,
          background: "#FFF5F5",
          border: "1px solid #FFDDDD",
          color: "#CC3333",
          cursor: "pointer",
        }}
      >
        <Trash2 size={11} />
      </button>
      <span className="flex items-center justify-center rounded-lg" style={{ width: 28, height: 28, background: color.bg, color: color.text, flexShrink: 0 }}>
        <Icon size={15} />
      </span>
      <div className="min-w-0" style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: "#141414", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {step.role} · {step.name || "未填写任务"}
        </div>
        <div style={{ fontSize: 11, color: "#7D8DA1", marginTop: 2 }}>
          {step.owner || `${step.role}岗`} · {step.deadline ? formatDisplayDateTime(step.deadline) : "未设截止时间"} · {step.resultType}
        </div>
      </div>
      <span className="rounded-full px-2 py-0.5" style={{ background: "#EEF4FF", color: "#1F6FEB", fontSize: 10, fontWeight: 900 }}>
        前置协作
      </span>
      <div className="flex items-center gap-1 pr-5">
        <IconButton title="上移协作" disabled={index === 0} onClick={() => onMove(-1)} icon={ChevronLeft} stopPropagation />
        <IconButton title="下移协作" disabled={index === total - 1} onClick={() => onMove(1)} icon={ChevronRight} stopPropagation />
      </div>
    </button>
  );
}

function ChipInput({
  names,
  buttonLabel,
  emptyLabel,
  onClick,
}: {
  names: string[];
  buttonLabel: string;
  emptyLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl px-2.5 py-2" style={{ background: "#FBFCFE", border: "1px solid #E2E8F0", minHeight: 42 }}>
      {names.length === 0 ? (
        <span style={{ fontSize: 12, color: "#AAB4C2", flex: 1 }}>{emptyLabel}</span>
      ) : (
        names.map((name, index) => (
          <span key={`${name}_${index}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: "#EEF4FF", border: "1px solid #D7E6FF", color: "#1F4FA3", fontSize: 12, fontWeight: 800 }}>
            <span className="flex items-center justify-center rounded-full" style={{ width: 18, height: 18, background: "#FFFFFF", color: "#52616F", fontSize: 10 }}>
              {name.slice(0, 1)}
            </span>
            {name}
          </span>
        ))
      )}
      <button onClick={onClick} className="rounded-lg px-2.5 py-1.5" style={{ background: "#FFFFFF", border: "1px dashed #9CC2FF", color: "#1F6FEB", fontSize: 12, fontWeight: 900, cursor: "pointer" }}>
        + {buttonLabel}
      </button>
    </div>
  );
}

function PeoplePickerModal({
  title,
  value,
  onChange,
  onCancel,
  onSave,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const names = splitNames(value);
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: "rgba(20,20,20,0.38)", backdropFilter: "blur(3px)" }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{ width: 460, maxWidth: "calc(100vw - 24px)", background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 24px 80px rgba(20,20,20,0.22)" }}
        onClick={event => event.stopPropagation()}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #EEF2F7", background: "#FBFCFE" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#141414" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#7D8DA1", marginTop: 4 }}>可填写一个或多个人名，用逗号、顿号或空格分隔。</div>
        </div>
        <div className="p-5">
          <textarea
            value={value}
            onChange={event => onChange(event.target.value)}
            rows={5}
            autoFocus
            placeholder="例如：李明，王五，赵小组"
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
          />
          <div className="mt-3 rounded-xl p-3" style={{ background: "#F8FAFF", border: "1px solid #DDE7FA" }}>
            <div style={{ fontSize: 11, color: "#7D8DA1", fontWeight: 800, marginBottom: 8 }}>当前识别</div>
            <div className="flex flex-wrap gap-2">
              {names.length === 0 ? (
                <span style={{ fontSize: 12, color: "#AAB4C2" }}>暂未填写</span>
              ) : names.map((name, index) => (
                <span key={`${name}_${index}`} className="rounded-full px-2.5 py-1" style={{ background: "#FFFFFF", border: "1px solid #D7E6FF", color: "#1F4FA3", fontSize: 12, fontWeight: 800 }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: "1px solid #EEF2F7", background: "#FBFCFE" }}>
          <button onClick={onCancel} className="rounded-xl px-4 py-2" style={plainButtonStyle}>取消</button>
          <button onClick={onSave} className="rounded-xl px-4 py-2" style={primaryButtonStyle}>确认</button>
        </div>
      </div>
    </div>
  );
}

function CollaborationTaskModal({
  step,
  editing,
  onChange,
  onCancel,
  onSave,
}: {
  step: TaskChainStep;
  editing?: boolean;
  onChange: (patch: Partial<TaskChainStep>) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const RoleIcon = ROLE_ICONS[step.role] ?? DEFAULT_ROLE_ICON;
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: "rgba(20,20,20,0.38)", backdropFilter: "blur(3px)" }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{ width: 560, maxWidth: "calc(100vw - 24px)", background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 24px 80px rgba(20,20,20,0.22)" }}
        onClick={event => event.stopPropagation()}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #EEF2F7", background: "#FBFCFE" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#141414" }}>{editing ? "编辑协作岗位任务" : "添加协作岗位任务"}</div>
          <div style={{ fontSize: 12, color: "#7D8DA1", marginTop: 4 }}>选择一个岗位，并直接布置这个岗位需要完成的协作任务。</div>
        </div>

        <div className="p-5">
          <InlineLabel label="选择协作岗位" required />
          <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            {TASK_ROLES.map(role => {
              const Icon = ROLE_ICONS[role] ?? DEFAULT_ROLE_ICON;
              const active = step.role === role;
              const color = roleColor(role);
              return (
                <button
                  key={role}
                  onClick={() => onChange({ role, resultType: role === "设计" ? "图片" : role === "文案" ? "文案" : step.resultType })}
                  className="flex flex-col items-center justify-center gap-1 rounded-xl"
                  style={{
                    height: 60,
                    background: active ? "#F3F7FF" : "#FFFFFF",
                    border: `1.5px solid ${active ? "#1F6FEB" : "#E6ECF5"}`,
                    color: active ? "#1F6FEB" : "#52616F",
                    cursor: "pointer",
                  }}
                >
                  <span className="flex items-center justify-center rounded-lg" style={{ width: 26, height: 26, background: active ? "#E8F1FF" : color.bg, color: active ? "#1F6FEB" : color.text }}>
                    <Icon size={15} />
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 900 }}>{role}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Row label="协作任务名称" required>
              <input value={step.name} onChange={event => onChange({ name: event.target.value })} placeholder="例如：提供海报文案 / 确认物料尺寸" style={inputStyle} />
            </Row>
            <Row label="岗位人员（可选）">
              <input value={step.owner} onChange={event => onChange({ owner: event.target.value })} placeholder={`${step.role}岗具体人员`} style={inputStyle} />
            </Row>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Row label="截止时间" required>
              <input type="datetime-local" value={step.deadline} onChange={event => onChange({ deadline: event.target.value })} style={inputStyle} />
            </Row>
            <Row label="成果类型">
              <select value={step.resultType} onChange={event => onChange({ resultType: event.target.value as TaskResultType })} style={inputStyle}>
                {RESULT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </Row>
          </div>

          <div className="flex flex-wrap gap-2 mt-1">
            <TogglePill label="上传成果" checked={step.needUpload} onClick={() => onChange({ needUpload: !step.needUpload })} />
            <TogglePill label="需审核" checked={step.needReview} onClick={() => onChange({ needReview: !step.needReview })} />
            <TogglePill label="关键" checked={step.isKey} onClick={() => onChange({ isKey: !step.isKey })} />
          </div>

          <div className="mt-4 rounded-xl p-3" style={{ background: "#FFFDF7", border: "1px solid #F3DFAE" }}>
            <div className="flex items-center gap-2" style={{ fontSize: 12, color: "#8A6A1F", fontWeight: 800 }}>
              <RoleIcon size={14} />
              保存后会插入到当前步骤后方，后续岗位会等待它完成。
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: "1px solid #EEF2F7", background: "#FBFCFE" }}>
          <button onClick={onCancel} className="rounded-xl px-4 py-2" style={plainButtonStyle}>取消</button>
          <button onClick={onSave} className="rounded-xl px-4 py-2" style={primaryButtonStyle}>{editing ? "保存修改" : "添加任务"}</button>
        </div>
      </div>
    </div>
  );
}

function AgentPublishModal({
  currentProject,
  draft,
  onDraft,
  onApply,
  onCancel,
}: {
  currentProject: Project;
  draft: AgentTaskDraft | null;
  onDraft: (draft: AgentTaskDraft) => void;
  onApply: (draft: AgentTaskDraft) => void;
  onCancel: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const canGenerate = prompt.trim().length >= 8;

  const generate = () => {
    if (!canGenerate) return;
    onDraft(buildAgentDraft(prompt, currentProject));
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      style={{ background: "rgba(20,20,20,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{ width: 760, maxWidth: "calc(100vw - 24px)", maxHeight: "calc(100vh - 32px)", background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 28px 90px rgba(20,20,20,0.24)", display: "flex", flexDirection: "column" }}
        onClick={event => event.stopPropagation()}
      >
        <div className="px-5 py-4 flex items-start justify-between gap-4" style={{ borderBottom: "1px solid #EEF2F7", background: "#FBFCFE" }}>
          <div>
            <div className="flex items-center gap-2" style={{ fontSize: 17, fontWeight: 950, color: "#141414" }}>
              <Sparkles size={18} style={{ color: "#1F6FEB" }} /> 智能发布助手
            </div>
            <div style={{ fontSize: 12, color: "#7D8DA1", marginTop: 5 }}>描述你要完成的事情，助手会拆成可编辑的岗位任务链。</div>
          </div>
          <button onClick={onCancel} className="rounded-full" style={{ width: 32, height: 32, border: "1px solid #E2E8F0", background: "#FFFFFF", cursor: "pointer", color: "#52616F" }}>×</button>
        </div>

        <div className="p-5 grid gap-4" style={{ gridTemplateColumns: "minmax(280px, 0.95fr) minmax(280px, 1.05fr)", overflow: "auto" }}>
          <section>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#52616F", marginBottom: 8 }}>自然语言描述</div>
            <textarea
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              placeholder="例如：做一张招商说明会海报，需要招商先确认方案，文案写海报文案，现场确认尺寸，最后设计出图，明天下午6点前完成。"
              rows={9}
              autoFocus
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
            />
            <div className="mt-3 rounded-xl p-3" style={{ background: "#F8FAFF", border: "1px solid #DDE7FA" }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#1F4FA3" }}>第一版能力边界</div>
              <div style={{ fontSize: 11, color: "#52616F", lineHeight: 1.7, marginTop: 5 }}>
                先用本地规则识别岗位、任务类型和截止时间，生成的是草稿；发布前仍可手动修改。
              </div>
            </div>
            <button
              onClick={generate}
              disabled={!canGenerate}
              className="mt-3 flex items-center justify-center gap-2 rounded-xl px-4 py-2 w-full"
              style={{ ...primaryButtonStyle, opacity: canGenerate ? 1 : 0.55, cursor: canGenerate ? "pointer" : "not-allowed" }}
            >
              <Sparkles size={14} /> 生成草稿
            </button>
          </section>

          <section>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#52616F", marginBottom: 8 }}>生成预览</div>
            {!draft ? (
              <div className="rounded-2xl p-5" style={{ minHeight: 270, background: "#FAFAF8", border: "1px dashed #D7DFEA", color: "#7D8DA1", fontSize: 13, lineHeight: 1.7 }}>
                草稿会显示在这里。你可以先描述任务目标、涉及岗位、前后顺序、截止时间和交付物。
              </div>
            ) : (
              <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #E6ECF5" }}>
                <div style={{ fontSize: 15, fontWeight: 950, color: "#141414" }}>{draft.taskName}</div>
                <div style={{ fontSize: 12, color: "#7D8DA1", marginTop: 6, lineHeight: 1.6 }}>{draft.desc}</div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full px-2 py-1" style={{ background: "#FFF4C7", color: "#8A6500", fontSize: 11, fontWeight: 900 }}>{draft.priority}</span>
                  <span className="rounded-full px-2 py-1" style={{ background: "#EEF4FF", color: "#1F6FEB", fontSize: 11, fontWeight: 900 }}>{draft.estimatedDays} 天</span>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {draft.steps.map((step, index) => (
                    <div key={step.id} className="rounded-xl p-2.5" style={{ background: "#FBFCFE", border: "1px solid #E6ECF5" }}>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center rounded-full" style={{ width: 22, height: 22, background: "#EEF4FF", color: "#1F6FEB", fontSize: 11, fontWeight: 900 }}>{index + 1}</span>
                        <b style={{ flex: 1, color: "#141414", fontSize: 12 }}>{step.name}</b>
                        <span style={{ color: roleColor(step.role).text, fontSize: 11, fontWeight: 900 }}>{step.role}</span>
                      </div>
                      <div style={{ marginTop: 6, color: "#7D8DA1", fontSize: 11 }}>
                        {formatDisplayDateTime(step.deadline)} · {step.resultType} · {step.needReview ? "需审核" : "直接完成"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4" style={{ borderTop: "1px solid #EEF2F7", background: "#FBFCFE" }}>
          <button onClick={onCancel} className="rounded-xl px-4 py-2" style={plainButtonStyle}>取消</button>
          <button disabled={!draft} onClick={() => draft && onApply(draft)} className="rounded-xl px-4 py-2" style={{ ...primaryButtonStyle, opacity: draft ? 1 : 0.55, cursor: draft ? "pointer" : "not-allowed" }}>
            应用到发布表单
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewItem({ label, value, badge, danger, done }: { label: string; value: string; badge?: boolean; danger?: boolean; done?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5" style={{ fontSize: 12 }}>
      <span style={{ color: "#52616F", fontWeight: 700 }}>{label}</span>
      <span
        className={badge || danger || done ? "px-2 py-0.5 rounded-md" : ""}
        style={{
          color: danger ? "#CC3333" : done ? "#1E7A3D" : "#141414",
          background: danger ? "#FFF0F0" : done ? "#E9F8EF" : badge ? "#F0E9FF" : "transparent",
          fontWeight: 800,
          textAlign: "right",
          maxWidth: 160,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function ModeButton({ active, icon: Icon, title, desc, onClick }: { active: boolean; icon: any; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl p-3 text-left" style={{ background: active ? "#EEF4FF" : "#FAFAF8", border: `1px solid ${active ? "#1F6FEB" : "#E8E3D8"}`, cursor: "pointer" }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color: active ? "#1F6FEB" : "#777" }} />
        <span style={{ fontSize: 13, fontWeight: 800, color: "#141414" }}>{title}</span>
      </div>
      <div style={{ fontSize: 11, color: "#777", lineHeight: 1.5 }}>{desc}</div>
    </button>
  );
}

function TogglePill({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{
      background: checked ? "#EEF4FF" : "#FAFAF8",
      border: `1px solid ${checked ? "#9CC2FF" : "#E8E3D8"}`,
      color: checked ? "#1F6FEB" : "#777",
      fontSize: 12,
      fontWeight: 800,
      cursor: "pointer",
    }}>
      {checked ? <CheckCircle2 size={13} /> : <Circle size={13} />} {label}
    </button>
  );
}

function IconButton({ icon: Icon, title, onClick, disabled, danger, stopPropagation }: { icon: any; title: string; onClick: () => void; disabled?: boolean; danger?: boolean; stopPropagation?: boolean }) {
  return (
    <button
      title={title}
      onClick={event => {
        if (stopPropagation) event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className="flex items-center justify-center rounded-lg"
      style={{
        width: 26,
        height: 26,
        background: danger ? "#FFF5F5" : "#FAFAF8",
        border: `1px solid ${danger ? "#FFDDDD" : "#E8E3D8"}`,
        color: danger ? "#CC3333" : "#52616F",
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <Icon size={13} />
    </button>
  );
}

function PanelTitle({ title, noMargin }: { title: string; noMargin?: boolean }) {
  return <div style={{ fontSize: 13, fontWeight: 900, color: "#141414", marginBottom: noMargin ? 0 : 8 }}>{title}</div>;
}

function InlineLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 800, color: "#52616F", marginBottom: 6 }}>
      {label} {required && <span style={{ color: "#CC3333" }}>*</span>}
    </div>
  );
}

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div style={{ fontSize: 11.5, fontWeight: 800, color: "#52616F", marginBottom: 5 }}>
        {label} {required && <span style={{ color: "#CC3333" }}>*</span>}
      </div>
      {children}
    </div>
  );
}

const panelStyle: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #EDE9DF",
  boxShadow: "0 10px 32px rgba(20,20,20,0.03)",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid #E2E8F0",
  background: "#FBFCFE",
  fontSize: 12,
  color: "#141414",
  outline: "none",
};

const primaryButtonStyle: CSSProperties = {
  background: "#1F6FEB",
  border: "1px solid #1C63D2",
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
};

const plainButtonStyle: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  color: "#52616F",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  background: "#EEF4FF",
  border: "1px solid #BBD2FF",
  color: "#1F6FEB",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};
