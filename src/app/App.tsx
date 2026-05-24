import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar, NavKey } from "./components/Sidebar";
import { useIsMobile } from "./hooks/useIsMobile";
import { getDefaultProject, Project } from "./data/projects";
import { Task } from "./data/tasks";
import { getBlockingDependencies, isDoneStatus } from "./lib/taskUtils";
import { PersonLibrary } from "./pages/PersonLibrary";
import { ProjectImageLibrary, ProjectImage } from "./pages/ProjectImageLibrary";
import { CommonImageLibrary } from "./pages/CommonImageLibrary";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ProjectOverview } from "./pages/ProjectOverview";
import { TaskBoard } from "./pages/TaskBoard";
import { PublishTask } from "./pages/PublishTask";
import { RiskTracking } from "./pages/RiskTracking";
import { PendingReview } from "./pages/PendingReview";
import { RoleWorkspace } from "./pages/RoleWorkspace";
import { DesignWorkspace } from "./pages/DesignWorkspace";
import { CopyWorkspace } from "./pages/CopyWorkspace";
import { FieldWorkspace } from "./pages/FieldWorkspace";
import {
  createDefaultWorkbenchState,
  downloadWorkbenchBackup,
  loadWorkbenchState,
  readWorkbenchBackup,
  saveWorkbenchState,
} from "./data/dataStore";
import { canAccessNav, canManageLocalData, UserRole } from "./data/permissions";

export default function App() {
  const isMobile = useIsMobile();
  const backupInputRef = useRef<HTMLInputElement>(null);
  const initialState = useMemo(() => loadWorkbenchState(), []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<NavKey>("overview");
  const [createProjectRequest, setCreateProjectRequest] = useState(0);
  const [currentRole, setCurrentRole] = useState<UserRole>("管理员");
  const [projects, setProjects] = useState<Project[]>(initialState.projects);
  const [tasks, setTasks] = useState<Task[]>(initialState.tasks);
  const [projectImages, setProjectImages] = useState<ProjectImage[]>(initialState.projectImages);
  const [people, setPeople] = useState(initialState.people);
  const [categories, setCategories] = useState(initialState.categories);
  const [reports, setReports] = useState(initialState.reports);
  const [checkins, setCheckins] = useState(initialState.checkins);
  const [benefits, setBenefits] = useState(initialState.benefits);
  const [currentProjectId, setCurrentProjectId] = useState(() => getDefaultProject(initialState.projects).id);
  const currentProject = useMemo(
    () => projects.find(p => p.id === currentProjectId) ?? projects[0],
    [projects, currentProjectId],
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const canManageData = canManageLocalData(currentRole);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  useEffect(() => {
    saveWorkbenchState({ version: 1, projects, tasks, projectImages, people, categories, reports, checkins, benefits });
  }, [projects, tasks, projectImages, people, categories, reports, checkins, benefits]);

  useEffect(() => {
    if (!canAccessNav(currentRole, activeNav)) {
      setActiveNav("overview");
      showToast("已切换到当前角色可访问的页面");
    }
  }, [currentRole, activeNav]);

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  const onSwitchProject = (p: Project) => {
    setCurrentProjectId(p.id);
    showToast(`已切换到「${p.fullName}」`);
  };

  const onNavigate = (key: NavKey) => {
    if (!canAccessNav(currentRole, key)) {
      showToast("当前角色没有这个页面的操作权限");
      setActiveNav("overview");
      return;
    }
    if (key === "control.create") {
      setActiveNav("overview");
      setCreateProjectRequest(prev => prev + 1);
      return;
    }
    setActiveNav(key);
  };

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    showToast(`已切换到「${role}」视角`);
  };

  const onUpdateTask = (id: string, patch: Partial<Task>) => {
    setTasks(prev => {
      const patched = prev.map(t => (t.id === id ? { ...t, ...patch } : t));
      return patched.map(t => {
        if (t.id === id) return t;
        if (!t.dependencyIds?.includes(id)) return t;
        const blocking = getBlockingDependencies(t, patched);
        if (blocking.length === 0 && t.status === "等待前置任务") {
          return { ...t, status: "未开始" };
        }
        if (blocking.length > 0 && !isDoneStatus(t.status) && t.status !== "待审核") {
          return { ...t, status: "等待前置任务" };
        }
        return t;
      });
    });
  };

  const onPublishTask = (nextTasks: Task | Task[]) => {
    const list = Array.isArray(nextTasks) ? nextTasks : [nextTasks];
    setTasks(prev => [...list, ...prev]);
  };

  const onCreateProject = (
    p: Omit<Project, "completion" | "riskCount" | "imageCount" | "pendingReviewCount">,
  ) => {
    const full: Project = { ...p, completion: 0, riskCount: 0, imageCount: 0, pendingReviewCount: 0 };
    setProjects(prev => [...prev, full]);
    setCurrentProjectId(full.id);
  };

  const onUpdateProject = (id: string, patch: Partial<Project>) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== id) return project;
      const next = { ...project, ...patch };
      return { ...next, fullName: `${next.series} · ${next.name}` };
    }));
  };

  const onDeleteProject = (id: string) => {
    const project = projects.find(item => item.id === id);
    if (!project) return;
    if (!window.confirm(`确认删除项目「${project.fullName}」？相关任务和项目图片也会一起删除。`)) return;
    setProjects(prev => {
      const next = prev.filter(item => item.id !== id);
      setCurrentProjectId((next[0] ?? prev[0])?.id ?? "");
      return next;
    });
    setTasks(prev => prev.filter(task => task.projectId !== id));
    setProjectImages(prev => prev.filter(image => image.projectId !== id));
    showToast(`已删除项目「${project.fullName}」`);
  };

  const onDeleteTask = (id: string) => {
    const task = tasks.find(item => item.id === id);
    if (!task) return;
    if (!window.confirm(`确认删除任务「${task.name}」？`)) return;
    setTasks(prev => prev
      .filter(item => item.id !== id)
      .map(item => ({
        ...item,
        dependencyIds: item.dependencyIds?.filter(depId => depId !== id),
        linkedTaskIds: item.linkedTaskIds?.filter(linkId => linkId !== id),
      })));
    showToast(`已删除任务「${task.name}」`);
  };

  const onAddProjectImage = (img: ProjectImage) => {
    setProjectImages(prev => [img, ...prev]);
  };

  const handleExportBackup = () => {
    downloadWorkbenchBackup({ version: 1, projects, tasks, projectImages, people, categories, reports, checkins, benefits });
    showToast("已导出内测数据备份");
  };

  const handleImportBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const next = await readWorkbenchBackup(file);
      setProjects(next.projects);
      setTasks(next.tasks);
      setProjectImages(next.projectImages);
      setPeople(next.people);
      setCategories(next.categories);
      setReports(next.reports);
      setCheckins(next.checkins);
      setBenefits(next.benefits);
      setCurrentProjectId(getDefaultProject(next.projects).id);
      showToast("已导入备份数据");
    } catch {
      showToast("备份文件格式不正确");
    }
  };

  const handleResetDemoData = () => {
    if (!window.confirm("确认重置为演示数据？当前内测数据会被覆盖。")) return;
    const next = createDefaultWorkbenchState();
    setProjects(next.projects);
    setTasks(next.tasks);
    setProjectImages(next.projectImages);
    setPeople(next.people);
    setCategories(next.categories);
    setReports(next.reports);
    setCheckins(next.checkins);
    setBenefits(next.benefits);
    setCurrentProjectId(getDefaultProject(next.projects).id);
    showToast("已恢复演示数据");
  };

  const projectBarProps = {
    projects,
    currentProject,
    onSwitchProject,
    isMobile,
    onOpenDrawer: openDrawer,
  };

  let pageContent: React.ReactNode = null;

  switch (activeNav) {
    case "overview":
      pageContent = (
        <ProjectOverview
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          projectImages={projectImages}
          setProjectImages={setProjectImages}
          onSwitchProject={onSwitchProject}
          onCreateProject={onCreateProject}
          onUpdateProject={onUpdateProject}
          onDeleteProject={onDeleteProject}
          canCreateProject={canManageData}
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
          createProjectRequest={createProjectRequest}
          showToast={showToast}
          onNavigate={onNavigate}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
        />
      );
      break;

    case "control.publish":
      pageContent = (
        <PublishTask
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          onSwitchProject={onSwitchProject}
          onPublish={onPublishTask}
          onNavigate={onNavigate}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "control.board":
      pageContent = (
        <TaskBoard
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          onSwitchProject={onSwitchProject}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onNavigate={onNavigate}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "control.risk":
      pageContent = (
        <RiskTracking
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          onSwitchProject={onSwitchProject}
          onUpdateTask={onUpdateTask}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "control.review":
      pageContent = (
        <PendingReview
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          onSwitchProject={onSwitchProject}
          onUpdateTask={onUpdateTask}
          onCreateTask={onPublishTask}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "library.people":
      pageContent = (
        <PersonLibrary
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
          people={people}
          setPeople={setPeople}
          categories={categories}
          setCategories={setCategories}
        />
      );
      break;

    case "recruitment":
      pageContent = (
        <RoleWorkspace
          role="招商"
          title="招商中心"
          breadcrumb="招商工作台"
          description="招商人员的独立工作台，重点跟进邀约与成交"
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          onSwitchProject={onSwitchProject}
          onUpdateTask={onUpdateTask}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "market.design":
      pageContent = (
        <DesignWorkspace
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          projectImages={projectImages}
          onSwitchProject={onSwitchProject}
          onUpdateTask={onUpdateTask}
          onCreateTask={onPublishTask}
          onAddProjectImage={onAddProjectImage}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "market.copy":
      pageContent = (
        <CopyWorkspace
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          projectImages={projectImages}
          onSwitchProject={onSwitchProject}
          onUpdateTask={onUpdateTask}
          onCreateTask={onPublishTask}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "market.video":
      pageContent = (
        <RoleWorkspace
          role="短视频"
          title="短视频工作台"
          breadcrumb="市场中心 / 短视频工作台"
          description="从选题、脚本、拍摄到剪辑、发布全流程跟进"
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          onSwitchProject={onSwitchProject}
          onUpdateTask={onUpdateTask}
          onCreateTask={onPublishTask}
          onAddProjectImage={onAddProjectImage}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "market.ops":
      pageContent = (
        <RoleWorkspace
          role="运营"
          title="运营工作台"
          breadcrumb="市场中心 / 运营工作台"
          description="项目排期、跨岗位协调与物料最终检查"
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          onSwitchProject={onSwitchProject}
          onUpdateTask={onUpdateTask}
          onCreateTask={onPublishTask}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "market.cs":
      pageContent = (
        <RoleWorkspace
          role="客服"
          title="客服工作台"
          breadcrumb="市场中心 / 客服工作台"
          description="报名咨询、课前提醒、用户问题汇总"
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          onSwitchProject={onSwitchProject}
          onUpdateTask={onUpdateTask}
          onCreateTask={onPublishTask}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "market.field":
      pageContent = (
        <FieldWorkspace
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          projectImages={projectImages}
          onSwitchProject={onSwitchProject}
          onCreateTask={onPublishTask}
          onUpdateTask={onUpdateTask}
          onUpdateProjectImages={setProjectImages}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "library.project-images":
      pageContent = (
        <ProjectImageLibrary
          projects={projects}
          images={projectImages}
          setImages={setProjectImages}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "library.common-images":
      pageContent = (
        <CommonImageLibrary
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "benefits":
      pageContent = (
        <PlaceholderPage
          title="权益中心"
          breadcrumb="权益中心 / 内测原型"
          description={`当前有 ${benefits.length} 条权益记录。第一阶段用于演示会员政策、待兑付和客服核销入口。`}
          features={["会员政策配置", "客户权益台账", "客服兑付待办", "兑付记录与剩余次数"]}
          phaseHint="内测版先保留入口和示例数据结构"
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
        />
      );
      break;

    case "checkin":
      pageContent = (
        <PlaceholderPage
          title="签到管理"
          breadcrumb="签到管理 / 内测原型"
          description={`当前有 ${checkins.length} 条签到记录。第一阶段用于演示扫码签到、新客临时建档和现场名单入口。`}
          features={["项目签到二维码", "老客户匹配签到", "新客临时建档", "手动签到与到场名单"]}
          phaseHint="内测版先保留入口和示例数据结构"
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
        />
      );
      break;

    case "ai.report":
      pageContent = (
        <PlaceholderPage
          title="AI 周例会报告"
          breadcrumb="AI 周报 / 内测原型"
          description={`当前保存 ${reports.length} 份周报草稿。第一阶段生成本地 HTML 预览，不调用真实 AI 服务。`}
          features={["项目概览", "岗位任务总结", "招商/签到/权益数据", "风险提醒与下周建议"]}
          phaseHint="内测版先生成本地 HTML 预览"
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
        />
      );
      break;
  }

  if (!pageContent) {
    pageContent = (
      <ProjectOverview
        projects={projects}
        currentProject={currentProject}
        tasks={tasks}
        projectImages={projectImages}
        setProjectImages={setProjectImages}
        onSwitchProject={onSwitchProject}
        onCreateProject={onCreateProject}
        onUpdateProject={onUpdateProject}
        onDeleteProject={onDeleteProject}
        canCreateProject={canManageData}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        createProjectRequest={createProjectRequest}
        showToast={showToast}
        onNavigate={onNavigate}
        isMobile={isMobile}
        onOpenDrawer={openDrawer}
      />
    );
  }

  const isOverviewPage = activeNav === "overview";

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        overflow: "hidden",
        background: isOverviewPage ? "#F9FAFB" : "#F8F6EF",
        fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {!isOverviewPage && (!isMobile || drawerOpen) && (
        <Sidebar
          activeNav={activeNav}
          onNavChange={onNavigate}
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
          isMobile={isMobile}
          onCloseDrawer={closeDrawer}
        />
      )}

      <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
        {pageContent}
      </div>

      {canManageData && <div
        className="fixed z-50 flex items-center gap-2 rounded-full"
        style={{
          right: 18,
          bottom: 18,
          display: isOverviewPage ? "none" : "flex",
          background: "#FFFFFF",
          border: "1.5px solid #E8E3D8",
          boxShadow: "0 8px 28px rgba(0,0,0,0.08)",
          padding: "8px 10px",
        }}
      >
        <span style={{ fontSize: 12, color: "#8A6500", fontWeight: 700, padding: "0 6px" }}>内测版 / 本地数据</span>
        <button onClick={handleExportBackup} className="px-2.5 py-1 rounded-full" style={{ border: "1px solid #E8E3D8", background: "#F8F6EF", fontSize: 12, cursor: "pointer" }}>导出备份</button>
        <button onClick={() => backupInputRef.current?.click()} className="px-2.5 py-1 rounded-full" style={{ border: "1px solid #E8E3D8", background: "#F8F6EF", fontSize: 12, cursor: "pointer" }}>导入备份</button>
        <button onClick={handleResetDemoData} className="px-2.5 py-1 rounded-full" style={{ border: "1px solid #FFCCCC", background: "#FFF5F5", color: "#CC3333", fontSize: 12, cursor: "pointer" }}>重置</button>
        <input
          ref={backupInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={e => handleImportBackup(e.target.files?.[0])}
        />
      </div>}

      {toastMsg && (
        <div
          style={{
            position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
            background: "#FFF9E6", border: "1.5px solid #F4D060", borderRadius: 99,
            padding: "10px 20px", fontSize: 13, color: "#8A6500", fontWeight: 500,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)", zIndex: 100, whiteSpace: "nowrap",
            fontFamily: "'PingFang SC', sans-serif",
          }}
        >
          ✓ {toastMsg}
        </div>
      )}
    </div>
  );
}
