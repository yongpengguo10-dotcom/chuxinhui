import { useMemo, useState } from "react";
import { Sidebar, NavKey } from "./components/Sidebar";
import { useIsMobile } from "./hooks/useIsMobile";
import { mockProjects, getDefaultProject, Project } from "./data/projects";
import { mockTasks, Task } from "./data/tasks";
import { PersonLibrary } from "./pages/PersonLibrary";
import { ProjectImageLibrary, MOCK_IMAGES, ProjectImage } from "./pages/ProjectImageLibrary";
import { CommonImageLibrary } from "./pages/CommonImageLibrary";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { ProjectOverview } from "./pages/ProjectOverview";
import { TaskBoard } from "./pages/TaskBoard";
import { CreateProject } from "./pages/CreateProject";
import { PublishTask } from "./pages/PublishTask";
import { RiskTracking } from "./pages/RiskTracking";
import { PendingReview } from "./pages/PendingReview";
import { RoleWorkspace } from "./pages/RoleWorkspace";
import { MarketOverview } from "./pages/MarketOverview";

export default function App() {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<NavKey>("overview");
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [projectImages, setProjectImages] = useState<ProjectImage[]>(MOCK_IMAGES);
  const [currentProjectId, setCurrentProjectId] = useState(() => getDefaultProject(mockProjects).id);
  const currentProject = useMemo(
    () => projects.find(p => p.id === currentProjectId) ?? projects[0],
    [projects, currentProjectId],
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  const onSwitchProject = (p: Project) => {
    setCurrentProjectId(p.id);
    showToast(`已切换到「${p.fullName}」`);
  };

  const onNavigate = (key: NavKey) => setActiveNav(key);

  const onUpdateTask = (id: string, patch: Partial<Task>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  };

  const onPublishTask = (task: Task) => {
    setTasks(prev => [task, ...prev]);
  };

  const onCreateProject = (
    p: Omit<Project, "completion" | "riskCount" | "imageCount" | "pendingReviewCount">,
  ) => {
    const full: Project = { ...p, completion: 0, riskCount: 0, imageCount: 0, pendingReviewCount: 0 };
    setProjects(prev => [...prev, full]);
    setCurrentProjectId(full.id);
  };

  const existingSeries = useMemo(
    () => Array.from(new Set(projects.map(p => p.series))),
    [projects],
  );

  const onAddProjectImage = (img: ProjectImage) => {
    setProjectImages(prev => [img, ...prev]);
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
          onSwitchProject={onSwitchProject}
          onNavigate={onNavigate}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
        />
      );
      break;

    case "control.create":
      pageContent = (
        <CreateProject
          existingSeries={existingSeries}
          onCreate={onCreateProject}
          onNavigate={onNavigate}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "control.publish":
      pageContent = (
        <PublishTask
          projects={projects}
          currentProject={currentProject}
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

    case "market.overview":
      pageContent = (
        <MarketOverview
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          onSwitchProject={onSwitchProject}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
        />
      );
      break;

    case "market.design":
      pageContent = (
        <RoleWorkspace
          role="设计"
          title="设计工作台"
          breadcrumb="市场中心 / 设计工作台"
          description="设计人员接收任务、上传图片、提交审核与定稿"
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          onSwitchProject={onSwitchProject}
          onUpdateTask={onUpdateTask}
          onAddProjectImage={onAddProjectImage}
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "market.copy":
      pageContent = (
        <RoleWorkspace
          role="文案"
          title="文案工作台"
          breadcrumb="市场中心 / 文案工作台"
          description="承接公众号、朋友圈、社群、复盘等文案任务"
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          onSwitchProject={onSwitchProject}
          onUpdateTask={onUpdateTask}
          onAddProjectImage={onAddProjectImage}
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
          isMobile={isMobile}
          onOpenDrawer={openDrawer}
          showToast={showToast}
        />
      );
      break;

    case "market.field":
      pageContent = (
        <RoleWorkspace
          role="现场执行"
          title="现场执行"
          breadcrumb="市场中心 / 现场执行"
          description="场地、桌椅、投影、物料、签到与现场照片回传"
          projects={projects}
          currentProject={currentProject}
          tasks={tasks}
          onSwitchProject={onSwitchProject}
          onUpdateTask={onUpdateTask}
          onAddProjectImage={onAddProjectImage}
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
  }

  return (
    <div
      style={{
        width: "100vw", height: "100vh", display: "flex", overflow: "hidden",
        background: "#F8F6EF",
        fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {(!isMobile || drawerOpen) && (
        <Sidebar
          activeNav={activeNav}
          onNavChange={setActiveNav}
          isMobile={isMobile}
          onCloseDrawer={closeDrawer}
        />
      )}

      {pageContent}

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
