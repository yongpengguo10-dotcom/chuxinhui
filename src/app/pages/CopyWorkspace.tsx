import { useEffect, useMemo, useRef, useState } from "react";
import { Bold, Save, Send } from "lucide-react";
import { Project } from "../data/projects";
import { Task } from "../data/tasks";
import { effectiveStatus, getDependencyTasks, isBlocked, isDoneStatus } from "../lib/taskUtils";
import { buildTaskChain } from "../lib/taskChain";
import { ProjectImage } from "./ProjectImageLibrary";
import { QuickTaskRequest } from "../components/QuickTaskRequest";
import { WorkspaceProjectHero } from "../components/WorkspaceProjectHero";
import { WorkspaceTaskList, WorkspaceTaskTab } from "../components/WorkspaceTaskList";
import { WorkspaceTopBar } from "../components/WorkspaceTopBar";
import { WorkspaceTaskChain } from "../components/WorkspaceTaskChain";
import { WorkspaceTaskMeta } from "../components/WorkspaceTaskDetails";

interface CopyWorkspaceProps {
  projects: Project[];
  currentProject: Project;
  tasks: Task[];
  projectImages: ProjectImage[];
  onSwitchProject: (p: Project) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onCreateTask: (task: Task) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
  showToast: (msg: string) => void;
}

type CopyEditorTab = "任务信息" | "编辑" | "历史版本" | "审核记录";
const COPY_EDITOR_TABS: CopyEditorTab[] = ["任务信息", "编辑", "历史版本", "审核记录"];
type ResourcePreview =
  | { type: "image"; title: string; subtitle: string; url: string; insertText: string }
  | { type: "copy"; title: string; subtitle: string; content: string; insertText: string };

export function CopyWorkspace({
  projects,
  currentProject,
  tasks,
  projectImages,
  onSwitchProject,
  onUpdateTask,
  onCreateTask,
  isMobile,
  onOpenDrawer,
  showToast,
}: CopyWorkspaceProps) {
  const [tab, setTab] = useState<WorkspaceTaskTab>("全部");
  const [editorTab, setEditorTab] = useState<CopyEditorTab>("任务信息");
  const [draft, setDraft] = useState("");
  const [draftTextCount, setDraftTextCount] = useState(0);
  const [boldMode, setBoldMode] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [resourcePreview, setResourcePreview] = useState<ResourcePreview | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const projectTasks = useMemo(() => tasks.filter(task => task.projectId === currentProject.id), [tasks, currentProject.id]);
  const copyTasks = useMemo(() => projectTasks.filter(task => task.role === "文案"), [projectTasks]);
  const selectedFallback = copyTasks.find(task => !isDoneStatus(effectiveStatus(task, projectTasks))) ?? copyTasks[0];
  const selectedTask = copyTasks.find(task => task.id === selectedTaskId) ?? selectedFallback;
  const chain = selectedTask ? buildTaskChain(selectedTask, projectTasks) : [];
  const dependencies = selectedTask ? getDependencyTasks(selectedTask, projectTasks) : [];

  const stats = useMemo(() => {
    const done = copyTasks.filter(task => isDoneStatus(effectiveStatus(task, projectTasks))).length;
    const review = copyTasks.filter(task => effectiveStatus(task, projectTasks) === "待审核").length;
    const blocked = copyTasks.filter(task => isBlocked(task, projectTasks)).length;
    const total = copyTasks.length;
    return { total, review, done, blocked, progress: total ? Math.round((done / total) * 100) : 0 };
  }, [copyTasks, projectTasks]);

  const relatedImages = projectImages.filter(image => image.projectId === currentProject.id).slice(0, 4);
  const historyCopies = tasks.filter(task => task.role === "文案" && task.resultContent && task.id !== selectedTask?.id).slice(0, 4);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editorTab !== "编辑") return;
    const next = draft || selectedTask?.resultContent || "";
    if (editor.innerHTML !== next) editor.innerHTML = next;
    setDraftTextCount(editor.innerText.trim().length);
  }, [editorTab, selectedTask?.id]);

  const saveDraft = () => {
    if (!selectedTask) return;
    onUpdateTask(selectedTask.id, { resultContent: draft || selectedTask.resultContent });
    showToast("已保存文案草稿");
  };

  const submitCopy = () => {
    if (!selectedTask) return;
    const content = draft.trim() || selectedTask.resultContent || "";
    if (!content.trim()) {
      showToast("请先填写文案内容");
      return;
    }
    if (isBlocked(selectedTask, projectTasks)) {
      showToast("前置任务未完成，暂时不能提交");
      return;
    }
    onUpdateTask(selectedTask.id, {
      uploaded: true,
      resultContent: content,
      status: selectedTask.needReview ? "待审核" : "已完成",
      submittedAt: new Date().toISOString(),
    });
    setDraft(content);
    showToast(`已提交「${selectedTask.name}」`);
  };

  const switchTask = (task: Task) => {
    setSelectedTaskId(task.id);
    setDraft(task.resultContent || "");
    setDraftTextCount(stripHtml(task.resultContent || "").length);
    setEditorTab("任务信息");
    setBoldMode(false);
  };

  const currentDraft = draft || selectedTask?.resultContent || "";

  const toggleBold = () => {
    const editor = editorRef.current;
    if (!editor) {
      setBoldMode(value => !value);
      return;
    }
    editor.focus();
    document.execCommand("bold");
    setBoldMode(document.queryCommandState("bold"));
  };

  const insertResource = (text: string) => {
    const next = `${currentDraft}${currentDraft ? "<br>" : ""}${text}`;
    setDraft(next);
    setEditorTab("编辑");
    setResourcePreview(null);
    showToast("已插入到文案编辑区");
    requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = next;
        setDraftTextCount(editorRef.current.innerText.trim().length);
        editorRef.current.focus();
        placeCaretAtEnd(editorRef.current);
      }
    });
  };

  return (
    <main className="copy-workspace">
      <style>{copyCss}</style>
      <WorkspaceTopBar isMobile={isMobile} onOpenDrawer={onOpenDrawer} userName="张三" userRole="文案负责人" />

      <div className="copy-content">
        <WorkspaceProjectHero
          project={currentProject}
          projects={projects}
          progressLabel="文案进度"
          progressValue={stats.progress}
          metrics={[
            { label: "我的任务", value: `${stats.total} 个` },
            { label: "待审核", value: `${stats.review} 个` },
            { label: "阻塞任务", value: `${stats.blocked} 个`, danger: true },
          ]}
          onSwitchProject={onSwitchProject}
        />

        <div className="copy-grid" style={{ gridTemplateColumns: isMobile ? "1fr" : "330px minmax(420px, 1fr) 380px" }}>
          <WorkspaceTaskList
            tasks={copyTasks}
            allTasks={projectTasks}
            activeTaskId={selectedTask?.id}
            activeTab={tab}
            onTabChange={setTab}
            onSelectTask={switchTask}
            action={<QuickTaskRequest requesterRole="文案" projects={projects} currentProject={currentProject} sourceTask={selectedTask} onCreateTask={onCreateTask} showToast={showToast} buttonLabel="新建协作" />}
          />

          <section className="copy-panel copy-editor-panel">
            {selectedTask ? (
              <>
                <div className="copy-editor-head">
                  <div>
                    <h2>{selectedTask.name}</h2>
                    <p>{effectiveStatus(selectedTask, projectTasks)}</p>
                  </div>
                  <span>{selectedTask.priority}</span>
                </div>
                <div className="copy-editor-tabs">
                  {COPY_EDITOR_TABS.map(item => (
                    <button key={item} className={editorTab === item ? "active" : ""} onClick={() => setEditorTab(item)}>
                      {item}
                    </button>
                  ))}
                </div>
                {editorTab === "任务信息" && (
                  <div className="copy-tab-pane">
                    <WorkspaceTaskMeta task={selectedTask} status={effectiveStatus(selectedTask, projectTasks)} dependencies={dependencies} />
                    <WorkspaceTaskChain task={selectedTask} chain={chain} allTasks={projectTasks} />
                    <section className="copy-info-block">
                      <h3>任务说明</h3>
                      <p>{selectedTask.desc || "请根据项目目标、前置成果和协作备注完成文案交付。"}</p>
                    </section>
                  </div>
                )}
                {editorTab === "编辑" && (
                  <>
                    <div className="copy-editor-toolbar">
                      <select><option>平方</option></select>
                      <select><option>14</option></select>
                      <button className={`format-icon ${boldMode ? "active" : ""}`} onClick={toggleBold} title="加粗" aria-label="加粗">
                        <Bold size={14} />
                      </button>
                      {boldMode && <span>加粗输入中</span>}
                    </div>
                    <div
                      key={selectedTask.id}
                      ref={editorRef}
                      className="copy-editor"
                      contentEditable
                      suppressContentEditableWarning
                      data-placeholder="在这里撰写文案内容..."
                      onInput={event => {
                        setDraft(event.currentTarget.innerHTML);
                        setDraftTextCount(event.currentTarget.innerText.trim().length);
                      }}
                      onKeyUp={() => setBoldMode(document.queryCommandState("bold"))}
                      onMouseUp={() => setBoldMode(document.queryCommandState("bold"))}
                    />
                    <div className="copy-editor-footer">
                      <span>字数统计：{draftTextCount}</span>
                      <div>
                        <button onClick={saveDraft}><Save size={14} /> 保存草稿</button>
                        <button className="primary" onClick={submitCopy}><Send size={14} /> 提交审核</button>
                      </div>
                    </div>
                  </>
                )}
                {editorTab === "历史版本" && (
                  <div className="copy-history-list">
                    {(selectedTask.resultContent || draft) ? (
                      <button onClick={() => setDraft(selectedTask.resultContent || draft)}>
                        <b>当前草稿 / 最新版本</b>
                        <span>{selectedTask.submittedAt || "本地草稿"}</span>
                        <p>{selectedTask.resultContent || draft}</p>
                      </button>
                    ) : <div className="copy-empty-box">暂无历史版本</div>}
                    {historyCopies.map(item => (
                      <button key={item.id} onClick={() => setDraft(item.resultContent || "")}>
                        <b>{item.name}</b>
                        <span>{item.submittedAt || "历史文案"}</span>
                        <p>{item.resultContent}</p>
                      </button>
                    ))}
                  </div>
                )}
                {editorTab === "审核记录" && (
                  <div className="copy-review-list">
                    {selectedTask.submittedAt ? (
                      <div>
                        <b>{selectedTask.needReview ? "已提交审核" : "已直接完成"}</b>
                        <span>{selectedTask.submittedAt}</span>
                        <p>{selectedTask.needReview ? "等待总控或项目负责人审核文案内容。" : "该任务不需要审核，提交后已进入完成状态。"}</p>
                      </div>
                    ) : (
                      <div>
                        <b>暂未提交</b>
                        <span>{selectedTask.needReview ? "需要审核" : "无需审核"}</span>
                        <p>提交文案后，这里会显示审核状态、提交时间和处理记录。</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : <div className="copy-empty">暂无文案任务</div>}
          </section>

          <aside className="copy-side">
            <section className="copy-panel">
              <div className="copy-panel-head"><h2>关联素材</h2><button>全部素材</button></div>
              <div className="copy-material-grid">
                {relatedImages.map(image => {
                  const latest = image.versions[image.versions.length - 1];
                  return (
                    <button key={image.id} onClick={() => setResourcePreview({
                      type: "image",
                      title: image.title,
                      subtitle: `${latest.versionStr} · ${latest.uploadTime}`,
                      url: latest.url,
                      insertText: `<img class="copy-inserted-image" src="${latest.url}" alt="" />`,
                    })}>
                      <img src={latest.url} alt={image.title} /><b>{image.title}</b>
                    </button>
                  );
                })}
              </div>
            </section>
            <section className="copy-panel">
              <div className="copy-panel-head"><h2>文案参考</h2></div>
              <div className="copy-reference-list">
                {historyCopies.map(task => (
                  <button key={task.id} onClick={() => setResourcePreview({
                    type: "copy",
                    title: task.name,
                    subtitle: task.submittedAt || "历史文案",
                    content: task.resultContent || "",
                    insertText: task.resultContent || "",
                  })}>
                    {task.name}<span>查看 / 插入</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <section className="copy-chain">
          <h2>任务依赖关系</h2>
          <div>
            {chain.map((task, index) => <CopyChainNode key={task.id} task={task} allTasks={projectTasks} current={task.id === selectedTask?.id} showArrow={index < chain.length - 1} />)}
          </div>
        </section>
      </div>
      {resourcePreview && (
        <div className="resource-preview-backdrop" onClick={() => setResourcePreview(null)}>
          <div className="resource-preview-modal" onClick={event => event.stopPropagation()}>
            <div className="resource-preview-head">
              <div>
                <h3>{resourcePreview.title}</h3>
                <p>{resourcePreview.subtitle}</p>
              </div>
              <button onClick={() => setResourcePreview(null)}>×</button>
            </div>
            {resourcePreview.type === "image" ? (
              <img src={resourcePreview.url} alt={resourcePreview.title} />
            ) : (
              <div className="resource-copy-content" dangerouslySetInnerHTML={{ __html: resourcePreview.content }} />
            )}
            <div className="resource-preview-actions">
              <button onClick={() => setResourcePreview(null)}>取消</button>
              <button className="primary" onClick={() => insertResource(resourcePreview.insertText)}>插入使用</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CopyChainNode({ task, allTasks, current, showArrow }: { task: Task; allTasks: Task[]; current: boolean; showArrow: boolean }) {
  const status = effectiveStatus(task, allTasks);
  const done = isDoneStatus(task.status);
  return <div className="copy-chain-node"><div className={`${done ? "done" : ""} ${current ? "current" : ""}`}><b>{task.name}</b><span>{task.role} · {task.owner}</span><em>{status}</em></div>{showArrow && <strong>→</strong>}</div>;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function placeCaretAtEnd(element: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

const copyCss = `
.copy-workspace { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #f7f9fc; overflow: hidden; color: #111827; }
.copy-topbar { height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 18px; background: #fff; border-bottom: 1px solid #e6ecf5; flex-shrink: 0; }
.copy-top-title,.copy-top-tools { display: flex; align-items: center; gap: 10px; min-width: 0; }
.copy-top-title b { font-size: 16px; font-weight: 900; letter-spacing: 0; }
.copy-top-title button { width: 32px; height: 32px; border: 1px solid #e6ecf5; background: #fff; border-radius: 8px; display: inline-grid; place-items: center; }
.copy-top-tools > div { width: 300px; height: 32px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid #dbe6f5; border-radius: 999px; color: #98a2b3; font-size: 12px; font-weight: 700; }
.copy-top-tools button { width: 32px; height: 32px; border: 1px solid #e6ecf5; background: #fff; border-radius: 8px; }
.copy-top-tools span { font-size: 12px; font-weight: 900; line-height: 1.1; }
.copy-top-tools small { color: #667085; font-size: 11px; }
.copy-content { flex: 1; overflow: auto; padding: 18px; }
.copy-project-hero { display: grid; grid-template-columns: 64px minmax(230px, 1fr) 150px repeat(4, minmax(105px, .48fr)); gap: 14px; align-items: center; margin-bottom: 12px; padding: 14px 16px; background: #fff; border: 1px solid #dbe6f5; border-radius: 12px; box-shadow: 0 10px 26px rgba(15,23,42,.04); }
.copy-project-cover { width: 64px; height: 64px; display: grid; place-items: center; border-radius: 10px; background: linear-gradient(135deg, #111827, #2563eb); color: #fff; font-size: 24px; font-weight: 900; }
.copy-project-main { min-width: 0; }
.copy-project-main > div { display: flex; align-items: center; gap: 8px; min-width: 0; }
.copy-project-main b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 18px; font-weight: 900; }
.copy-project-main span { flex-shrink: 0; padding: 3px 7px; border-radius: 999px; background: #dbeafe; color: #2563eb; font-size: 11px; font-weight: 900; }
.copy-project-main p { margin: 8px 0 0; color: #667085; font-size: 12px; font-weight: 800; }
.copy-project-hero select { height: 34px; min-width: 0; border: 1px solid #dbe6f5; border-radius: 8px; background: #fff; color: #344054; font-size: 12px; font-weight: 900; }
.copy-hero-metric { min-height: 54px; padding-left: 14px; border-left: 1px solid #e6ecf5; }
.copy-hero-metric span { display: block; color: #667085; font-size: 12px; font-weight: 800; }
.copy-hero-metric b { display: block; margin-top: 5px; color: #111827; font-size: 22px; font-weight: 900; }
.copy-hero-metric b.danger { color: #ef4444; }
.copy-hero-metric em { display: block; width: 74px; height: 4px; margin-top: 7px; border-radius: 999px; background: #e6ecf5; overflow: hidden; }
.copy-hero-metric i { display: block; height: 100%; border-radius: inherit; background: #2563eb; }
.copy-grid { display: grid; gap: 12px; align-items: start; }
.copy-panel { background: #fff; border: 1px solid #e6ecf5; border-radius: 12px; overflow: hidden; }
.copy-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 16px; }
.copy-panel-head h2 { margin: 0; font-size: 15px; font-weight: 900; }
.copy-panel-head button { border: 0; background: transparent; color: #2563eb; font-size: 12px; font-weight: 900; cursor: pointer; }
.copy-tabs { display: flex; gap: 4px; padding: 0 16px 10px; border-bottom: 1px solid #eef2f7; overflow-x: auto; }
.copy-tabs button,.copy-editor-tabs button { border: 0; background: transparent; color: #667085; height: 30px; padding: 0 8px; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap; }
.copy-tabs button.active,.copy-editor-tabs button.active { color: #2563eb; border-bottom: 2px solid #2563eb; }
.copy-task-list { display: flex; flex-direction: column; gap: 8px; padding: 12px; max-height: 560px; overflow: auto; }
.copy-task-card { display: grid; grid-template-columns: 1fr auto; gap: 6px; text-align: left; padding: 13px; border-radius: 9px; border: 1px solid #e6ecf5; background: #fff; cursor: pointer; }
.copy-task-card.active { border-color: #2563eb; background: #eff6ff; box-shadow: inset 3px 0 0 #2563eb; }
.copy-task-card b { font-size: 13px; font-weight: 900; }
.copy-task-card span { border-radius: 6px; padding: 3px 7px; font-size: 11px; font-weight: 900; }
.copy-task-card p,.copy-task-card em { margin: 0; color: #667085; font-size: 11px; font-style: normal; font-weight: 700; }
.copy-editor-panel { padding: 16px; }
.copy-editor-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.copy-editor-head h2 { margin: 0; font-size: 18px; font-weight: 900; }
.copy-editor-head p { margin: 6px 0 0; color: #2563eb; font-size: 12px; font-weight: 900; }
.copy-editor-head span { padding: 4px 8px; border-radius: 7px; background: #fff7ed; color: #f97316; font-size: 11px; font-weight: 900; }
.copy-editor-tabs { display: flex; gap: 12px; margin-top: 14px; border-bottom: 1px solid #eef2f7; }
.copy-tab-pane { padding-top: 12px; }
.copy-info-block { margin-top: 14px; padding-top: 14px; border-top: 1px solid #eef2f7; }
.copy-info-block h3 { margin: 0 0 10px; color: #111827; font-size: 13px; font-weight: 900; }
.copy-info-block p { margin: 0; color: #344054; font-size: 13px; line-height: 1.7; white-space: pre-wrap; }
.copy-editor-toolbar { display: flex; gap: 6px; align-items: center; padding: 10px 0; }
.copy-editor-toolbar button,.copy-editor-toolbar select { height: 28px; border: 1px solid #dbe6f5; border-radius: 7px; background: #fff; color: #344054; font-size: 12px; font-weight: 800; }
.copy-editor-toolbar .format-icon { width: 30px; padding: 0; display: inline-grid; place-items: center; }
.copy-editor-toolbar button.active { border-color: #2563eb; background: #eff6ff; color: #2563eb; }
.copy-editor-toolbar span { color: #2563eb; font-size: 12px; font-weight: 800; }
.copy-editor { width: 100%; min-height: 360px; max-height: 520px; overflow: auto; padding: 18px; border: 1px solid #e6ecf5; border-radius: 10px; outline: 0; font-size: 15px; line-height: 1.8; color: #111827; background: #fff; white-space: pre-wrap; }
.copy-editor:empty::before { content: attr(data-placeholder); color: #98a2b3; }
.copy-editor img.copy-inserted-image { display: block; width: min(260px, 100%); max-height: 180px; object-fit: contain; margin: 8px 0 14px; border-radius: 8px; background: #111827; }
.copy-editor-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
.copy-editor-footer span { color: #667085; font-size: 12px; font-weight: 800; }
.copy-editor-footer div { display: flex; gap: 8px; }
.copy-editor-footer button { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; border: 1px solid #dbe6f5; border-radius: 8px; background: #fff; color: #2563eb; font-size: 12px; font-weight: 900; cursor: pointer; }
.copy-editor-footer button.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
.copy-history-list,.copy-review-list { display: flex; flex-direction: column; gap: 10px; padding-top: 12px; }
.copy-history-list button,.copy-review-list div,.copy-empty-box { display: block; width: 100%; text-align: left; padding: 12px; border: 1px solid #e6ecf5; border-radius: 9px; background: #fbfcfe; color: #344054; }
.copy-history-list button { cursor: pointer; }
.copy-history-list button:hover { border-color: #93c5fd; background: #eff6ff; }
.copy-history-list b,.copy-review-list b { display: block; color: #111827; font-size: 13px; font-weight: 900; }
.copy-history-list span,.copy-review-list span { display: block; margin-top: 5px; color: #667085; font-size: 11px; font-weight: 800; }
.copy-history-list p,.copy-review-list p { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; margin: 8px 0 0; color: #344054; font-size: 12px; line-height: 1.65; white-space: pre-wrap; }
.copy-empty-box { min-height: 110px; display: grid; place-items: center; color: #98a2b3; font-size: 13px; font-weight: 900; }
.copy-side { display: flex; flex-direction: column; gap: 12px; }
.copy-material-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 0 14px 14px; }
.copy-material-grid button { display: block; padding: 0; border: 0; background: transparent; text-align: left; cursor: pointer; }
.copy-material-grid button:hover img { outline: 2px solid #2563eb; outline-offset: 2px; }
.copy-material-grid img { width: 100%; height: 78px; object-fit: cover; border-radius: 8px; background: #f3f4f6; }
.copy-material-grid b { display: block; margin-top: 5px; color: #344054; font-size: 11px; line-height: 1.35; }
.copy-reference-list { display: flex; flex-direction: column; gap: 6px; padding: 0 14px 14px; }
.copy-reference-list button { display: flex; justify-content: space-between; gap: 10px; border: 0; background: #fbfcfe; border-radius: 8px; padding: 9px 10px; color: #344054; font-size: 12px; font-weight: 800; cursor: pointer; }
.copy-reference-list span { color: #2563eb; white-space: nowrap; }
.copy-chain { margin-top: 12px; padding: 14px; background: #fff; border: 1px solid #e6ecf5; border-radius: 12px; }
.copy-chain h2 { margin: 0 0 12px; font-size: 14px; font-weight: 900; }
.copy-chain > div { display: flex; align-items: stretch; gap: 8px; overflow-x: auto; }
.copy-chain-node { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.copy-chain-node div { width: 150px; min-height: 78px; padding: 10px; border: 1px solid #e6ecf5; border-radius: 8px; background: #fbfcfe; }
.copy-chain-node div.done { background: #f0fdf4; border-color: #86efac; }
.copy-chain-node div.current { border: 2px solid #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
.copy-chain-node b,.copy-chain-node span,.copy-chain-node em { display: block; }
.copy-chain-node b { color: #111827; font-size: 11px; font-weight: 900; line-height: 1.35; }
.copy-chain-node span { margin: 5px 0; color: #667085; font-size: 11px; font-weight: 800; }
.copy-chain-node em { color: #2563eb; font-size: 10px; font-style: normal; font-weight: 900; }
.copy-chain-node strong { color: #98a2b3; font-size: 18px; font-weight: 400; }
.copy-empty { min-height: 360px; display: grid; place-items: center; color: #98a2b3; font-weight: 900; }
.resource-preview-backdrop { position: fixed; inset: 0; z-index: 180; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(15,23,42,.42); backdrop-filter: blur(4px); }
.resource-preview-modal { width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 48px); display: flex; flex-direction: column; overflow: hidden; border-radius: 14px; background: #fff; box-shadow: 0 24px 80px rgba(15,23,42,.24); }
.resource-preview-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px; border-bottom: 1px solid #eef2f7; }
.resource-preview-head h3 { margin: 0; color: #111827; font-size: 16px; font-weight: 900; }
.resource-preview-head p { margin: 6px 0 0; color: #667085; font-size: 12px; font-weight: 800; }
.resource-preview-head button { width: 30px; height: 30px; border: 1px solid #e6ecf5; border-radius: 999px; background: #fff; color: #667085; font-size: 18px; cursor: pointer; }
.resource-preview-modal > img { width: 100%; max-height: 52vh; object-fit: contain; background: #111827; }
.resource-copy-content { min-height: 180px; max-height: 52vh; overflow: auto; padding: 16px; color: #344054; font-size: 14px; line-height: 1.75; white-space: pre-wrap; }
.resource-preview-actions { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 16px; border-top: 1px solid #eef2f7; }
.resource-preview-actions button { height: 34px; padding: 0 14px; border: 1px solid #dbe6f5; border-radius: 8px; background: #fff; color: #344054; font-size: 12px; font-weight: 900; cursor: pointer; }
.resource-preview-actions button.primary { border-color: #2563eb; background: #2563eb; color: #fff; }
@media (max-width: 1280px) { .copy-project-hero { grid-template-columns: 64px minmax(220px, 1fr) 140px repeat(2, minmax(120px, 1fr)); } }
@media (max-width: 980px) {
  .copy-content { padding: 12px; }
  .copy-project-hero { grid-template-columns: 48px 1fr; align-items: start; }
  .copy-project-cover { width: 48px; height: 48px; font-size: 18px; }
  .copy-project-hero select,.copy-hero-metric { grid-column: 1 / -1; }
  .copy-hero-metric { padding-left: 0; padding-top: 10px; border-left: 0; border-top: 1px solid #e6ecf5; }
  .copy-top-tools > div,.copy-top-tools span { display: none; }
}
`;
