import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, Upload, FileCheck2, LayoutList, Check, Clock, UploadCloud, Search, Eye, X, Link as LinkIcon, FileText } from "lucide-react";
import { Project } from "../data/projects";
import { Task, TaskRole, TASK_ROLES, TaskStatus } from "../data/tasks";
import { PageShell } from "../components/PageShell";
import { effectiveStatus, isOverdue, STATUS_STYLES } from "../lib/taskUtils";

interface RoleWorkspaceProps {
  role: TaskRole | "招商";
  title: string;
  breadcrumb: string;
  description: string;
  projects: Project[];
  currentProject: Project;
  tasks: Task[];
  onSwitchProject: (p: Project) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onAddProjectImage?: (img: any) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
  showToast: (msg: string) => void;
}

export function RoleWorkspace({
  role, title, breadcrumb, description, projects, currentProject, tasks,
  onSwitchProject, onUpdateTask, onAddProjectImage, isMobile, onOpenDrawer, showToast
}: RoleWorkspaceProps) {
  const [filterStatus, setFilterStatus] = useState<"全部" | "未开始" | "进行中" | "待审核" | "已完成">("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionTask, setActionTask] = useState<{ task: Task; type: "upload" | "complete" } | null>(null);
  const [submitLink, setSubmitLink] = useState("");
  const [submitNote, setSubmitNote] = useState("");

  const roleTasks = useMemo(() => {
    return tasks.filter(t => t.projectId === currentProject.id && t.role === role);
  }, [tasks, currentProject.id, role]);

  const stats = useMemo(() => {
    const total = roleTasks.length;
    const done = roleTasks.filter(t => effectiveStatus(t) === "已完成" || effectiveStatus(t) === "已定稿").length;
    const review = roleTasks.filter(t => effectiveStatus(t) === "待审核").length;
    const risk = roleTasks.filter(t => isOverdue(t) || t.status === "有风险").length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, review, risk, pct };
  }, [roleTasks]);

  const filteredTasks = useMemo(() => {
    return roleTasks.filter(t => {
      if (filterStatus !== "全部") {
        if (filterStatus === "已完成") {
          if (effectiveStatus(t) !== "已完成" && effectiveStatus(t) !== "已定稿") return false;
        } else {
          if (effectiveStatus(t) !== filterStatus) return false;
        }
      }
      if (searchQuery) {
        if (!t.name.includes(searchQuery) && !t.owner.includes(searchQuery)) return false;
      }
      return true;
    });
  }, [roleTasks, filterStatus, searchQuery]);

  const handleUploadResult = (task: Task) => {
    setActionTask({ task, type: "upload" });
    setSubmitLink("");
    setSubmitNote("");
  };

  const handleCompleteTask = (task: Task) => {
    setActionTask({ task, type: "complete" });
    setSubmitNote("");
  };

  const confirmAction = () => {
    if (!actionTask) return;
    const { task, type } = actionTask;
    
    if (type === "upload") {
      onUpdateTask(task.id, { uploaded: true, status: task.needReview ? "待审核" : "已完成" });
      showToast(`任务「${task.name}」成果已提交`);

      // If it's an image/video task, automatically push it to the project image library
      if (task.resultType === "图片" || task.resultType === "视频") {
        if (onAddProjectImage) {
          const newImg = {
            id: `img_${Date.now()}`,
            projectId: task.projectId,
            categoryId: task.role === "设计" ? "poster" : task.role === "现场执行" ? "field" : "other",
            title: task.name,
            versions: [{
              id: "v1",
              url: task.resultType === "图片" ? "https://images.unsplash.com/photo-1543487945-139a97f387d5?auto=format&fit=crop&q=80&w=600" : "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=600",
              versionStr: "V1",
              uploadedBy: task.owner,
              sourceTask: task.name,
              status: task.needReview ? "pending" : "approved",
              uploadTime: new Date().toISOString().slice(0, 16).replace("T", " "),
              notes: submitNote || "由任务工作台自动同步"
            }]
          };
          onAddProjectImage(newImg);
        }
      }

    } else {
      onUpdateTask(task.id, { status: "已完成" });
      showToast(`任务「${task.name}」已标记为完成`);
    }
    setActionTask(null);
  };

  return (
    <PageShell
      title={title}
      breadcrumb={breadcrumb}
      description={description}
      isMobile={isMobile}
      onOpenDrawer={onOpenDrawer}
      showProjectBar
      compactProjectBar
      projects={projects}
      currentProject={currentProject}
      onSwitchProject={onSwitchProject}
    >
      {/* KPI row */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))" }}>
        <KpiCard label="本岗完成度" value={`${stats.pct}%`} sub={`${stats.done} / ${stats.total} 任务完成`} accentBar={stats.pct} />
        <KpiCard label="我的待办" value={`${stats.total - stats.done}`} sub="项未完成任务" />
        <KpiCard label="待审核/确认" value={`${stats.review}`} sub="项成果待审核" accent={stats.review > 0} />
        <KpiCard label="风险与逾期" value={`${stats.risk}`} sub="项需立即处理" danger={stats.risk > 0} />
      </div>

      {/* Task List Section */}
      <div className="flex flex-col flex-1 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF", minHeight: 400 }}>
        {/* Toolbar */}
        <div className={`p-4 border-b border-[#EDE9DF] flex ${isMobile ? "flex-col gap-3" : "items-center justify-between"}`}>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <FilterChip label="全部" active={filterStatus === "全部"} onClick={() => setFilterStatus("全部")} />
            <FilterChip label="未开始" active={filterStatus === "未开始"} onClick={() => setFilterStatus("未开始")} />
            <FilterChip label="进行中" active={filterStatus === "进行中"} onClick={() => setFilterStatus("进行中")} />
            <FilterChip label="待审核" active={filterStatus === "待审核"} onClick={() => setFilterStatus("待审核")} />
            <FilterChip label="已完成" active={filterStatus === "已完成"} onClick={() => setFilterStatus("已完成")} />
          </div>
          
          <div className="relative">
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#AAAAAA" }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索任务或负责人..."
              className="pl-8 pr-4 py-1.5 rounded-full text-[13px] outline-none transition-all"
              style={{ border: "1.5px solid #E8E3D8", width: isMobile ? "100%" : 220, color: "#141414" }}
              onFocus={e => (e.target as HTMLElement).style.borderColor = "#F4C542"}
              onBlur={e => (e.target as HTMLElement).style.borderColor = "#E8E3D8"}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto p-2">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <CheckCircle2 size={36} className="mb-4 text-[#D0C8B0]" />
              <div className="text-[15px] font-bold text-[#141414] mb-2">暂无匹配任务</div>
              <div className="text-[13px] text-[#999]">干得漂亮！当前过滤条件下没有任务。</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredTasks.map(task => (
                <TaskRow key={task.id} task={task} onUpload={() => handleUploadResult(task)} onComplete={() => handleCompleteTask(task)} isMobile={isMobile} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {actionTask && (
        <div className="fixed inset-0 bg-[#141414]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[#EDE9DF] bg-[#FAFAF8]">
              <h3 className="text-[15px] font-bold text-[#141414]">
                {actionTask.type === "upload" ? "提交任务成果" : "标记任务完成"}
              </h3>
              <button onClick={() => setActionTask(null)} className="p-1 hover:bg-[#E8E3D8] rounded-md transition-colors text-[#999]">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-[#999]">当前任务</span>
                <span className="text-[14px] font-bold text-[#141414]">{actionTask.task.name}</span>
              </div>

              {actionTask.type === "upload" && actionTask.task.resultType === "图片" ? (
                <div className="border-2 border-dashed border-[#D0C8B0] rounded-xl p-6 flex flex-col items-center justify-center gap-2 bg-[#FAFAF8] hover:bg-[#FFFDF0] hover:border-[#F4C542] transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-[#FFF9E6] flex items-center justify-center text-[#8A6500]">
                    <UploadCloud size={20} />
                  </div>
                  <div className="text-[13px] font-bold text-[#141414]">点击或拖拽上传图片/视频</div>
                  <div className="text-[11px] text-[#999]">支持 JPG, PNG, MP4 等格式，不超过 50MB</div>
                </div>
              ) : actionTask.type === "upload" ? (
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-bold text-[#555] flex items-center gap-1">
                    <LinkIcon size={12} /> {actionTask.task.resultType}在线链接 (必填)
                  </label>
                  <input 
                    value={submitLink}
                    onChange={e => setSubmitLink(e.target.value)}
                    placeholder="请输入飞书文档、石墨表格等协作链接..."
                    className="w-full px-3 py-2 rounded-lg border border-[#EDE9DF] text-[13px] outline-none focus:border-[#F4C542] focus:bg-[#FFFDF0] transition-colors"
                  />
                  <div className="text-[11px] text-[#999] mt-1 bg-[#F8F6EF] p-2 rounded flex items-start gap-1.5">
                    <FileText size={12} className="shrink-0 mt-0.5" />
                    <span>对于文案、表格等交付物，系统推荐使用在线协作文档链接进行提交，方便总控直接查阅和评审。</span>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-[12px] font-bold text-[#555]">备注说明 (选填)</label>
                <textarea 
                  value={submitNote}
                  onChange={e => setSubmitNote(e.target.value)}
                  placeholder="有什么需要特别说明的吗？"
                  className="w-full px-3 py-2 rounded-lg border border-[#EDE9DF] text-[13px] outline-none focus:border-[#F4C542] focus:bg-[#FFFDF0] transition-colors resize-none h-20"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#EDE9DF] flex justify-end gap-2 bg-[#FAFAF8]">
              <button 
                onClick={() => setActionTask(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-bold text-[#555] hover:bg-[#E8E3D8] transition-colors"
              >
                取消
              </button>
              <button 
                onClick={confirmAction}
                className="px-4 py-2 rounded-lg text-[13px] font-bold bg-[#141414] text-white hover:bg-[#333] transition-colors flex items-center gap-1.5"
              >
                <Check size={14} /> 确认{actionTask.type === "upload" ? "提交" : "完成"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function KpiCard({ label, value, sub, accentBar, danger, accent }: { label: string; value: string; sub: string; accentBar?: number; danger?: boolean; accent?: boolean }) {
  const color = danger ? "#CC3333" : accent ? "#8A6500" : "#141414";
  return (
    <div className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{sub}</div>
      {typeof accentBar === "number" && (
        <div className="mt-2.5 h-1.5 rounded-full bg-[#F0EDE4] overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${Math.min(100, Math.max(0, accentBar))}%`, background: accentBar >= 80 ? "#1E7A3D" : accentBar >= 40 ? "#F4C542" : "#FFB36B" }} />
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap transition-all"
      style={{
        background: active ? "#FFF4C7" : "transparent",
        color: active ? "#8A6500" : "#555",
        fontWeight: active ? 600 : 500,
        border: `1px solid ${active ? "#F4C542" : "transparent"}`
      }}
      onMouseEnter={e => !active && ((e.currentTarget as HTMLElement).style.background = "#F8F6EF")}
      onMouseLeave={e => !active && ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      {label}
    </button>
  );
}

function TaskRow({ task, onUpload, onComplete, isMobile }: { task: Task; onUpload: () => void; onComplete: () => void; isMobile: boolean }) {
  const status = effectiveStatus(task);
  const s = STATUS_STYLES[status];
  const overdue = isOverdue(task);
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-[#F4D060] hover:bg-[#FFFDF0]" style={{ background: "#FAFAF8", borderColor: "#F0EDE4" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {task.isKey && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "#FFF5F5", color: "#CC3333", border: "1px solid #FFDDDD" }}>关键</span>
          )}
          <span className="font-bold text-[14px] text-[#141414] truncate">{task.name}</span>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-[#777]">
          <span className="flex items-center gap-1"><Clock size={12} className={overdue ? "text-[#CC3333]" : ""} /><span className={overdue ? "text-[#CC3333] font-semibold" : ""}>{task.deadline}</span></span>
          <span className="flex items-center gap-1"><CheckCircle2 size={12} />负责人: {task.owner}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {!isMobile && (
          <span className="px-2 py-1 rounded text-[11px] font-bold" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
            {status}
          </span>
        )}

        {/* Action buttons */}
        {task.needUpload && !task.uploaded && status !== "已完成" && status !== "已定稿" && (
          <button onClick={onUpload} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F4C542] hover:bg-[#E8B830] transition-colors text-[12px] font-bold text-[#141414]">
            <UploadCloud size={14} /> 提交成果
          </button>
        )}
        {task.uploaded && status === "待审核" && (
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F8F6EF] border border-[#E8E3D8] text-[12px] font-bold text-[#8A6500]" disabled>
            <Eye size={14} /> 审核中...
          </button>
        )}
        {!task.needUpload && status !== "已完成" && (
          <button onClick={onComplete} className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#D0C8B0] hover:border-[#8A6500] hover:text-[#8A6500] transition-colors text-[12px] font-bold text-[#555]">
            <Check size={14} /> 标记完成
          </button>
        )}
        {status === "已完成" || status === "已定稿" ? (
          <span className="flex items-center gap-1 text-[12px] font-bold text-[#1E7A3D] px-2">
            <CheckCircle2 size={14} /> 已完成
          </span>
        ) : null}
      </div>
    </div>
  );
}
