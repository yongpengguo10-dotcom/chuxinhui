import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  UploadCloud,
  X,
} from "lucide-react";
import { Project } from "../data/projects";
import { Task } from "../data/tasks";
import { effectiveStatus, getDependencyTasks, isBlocked, isDoneStatus, isOverdue } from "../lib/taskUtils";
import { getOpenDeliveryFeedbacks, resolveDeliveryFeedback } from "../lib/deliveryFeedback";
import { latestLibraryImages } from "../lib/libraryAsset";
import { buildTaskChain } from "../lib/taskChain";
import { CATEGORIES, ProjectImage } from "./ProjectImageLibrary";
import { QuickTaskRequest } from "../components/QuickTaskRequest";
import { WorkspaceProjectHero } from "../components/WorkspaceProjectHero";
import { WorkspaceTaskList, WorkspaceTaskTab } from "../components/WorkspaceTaskList";
import { WorkspaceTaskChain } from "../components/WorkspaceTaskChain";
import { WorkspaceDependencyResults, WorkspaceDetailBlock, WorkspaceTaskMeta } from "../components/WorkspaceTaskDetails";
import { WorkspaceTopBar } from "../components/WorkspaceTopBar";

interface DesignWorkspaceProps {
  projects: Project[];
  currentProject: Project;
  tasks: Task[];
  projectImages: ProjectImage[];
  onSwitchProject: (p: Project) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onCreateTask: (task: Task) => void;
  onAddProjectImage: (img: ProjectImage) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
  showToast: (msg: string) => void;
}

export function DesignWorkspace({
  projects,
  currentProject,
  tasks,
  projectImages,
  onSwitchProject,
  onUpdateTask,
  onCreateTask,
  onAddProjectImage,
  isMobile,
  onOpenDrawer,
  showToast,
}: DesignWorkspaceProps) {
  const [taskTab, setTaskTab] = useState<WorkspaceTaskTab>("全部");
  const [imageCategory, setImageCategory] = useState("all");
  const [previewImage, setPreviewImage] = useState<ProjectImage | null>(null);
  const [submitNote, setSubmitNote] = useState("");
  const [submitFileName, setSubmitFileName] = useState("");
  const [submitDataUrl, setSubmitDataUrl] = useState("");
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFeedbackMaterialIdRef = useRef<string | null>(null);
  const pendingFeedbackIdRef = useRef<string | null>(null);

  const projectTasks = useMemo(
    () => tasks.filter(task => task.projectId === currentProject.id),
    [tasks, currentProject.id],
  );

  const designTasks = useMemo(
    () => projectTasks.filter(task => task.role === "设计"),
    [projectTasks],
  );

  const selectedFallback = designTasks.find(task => !isDoneStatus(effectiveStatus(task, projectTasks))) ?? designTasks[0];
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = designTasks.find(task => task.id === selectedTaskId) ?? selectedFallback;

  const currentImages = useMemo(() => {
    let list = latestLibraryImages(projectImages).filter(image => image.projectId === currentProject.id);
    if (imageCategory !== "all") list = list.filter(image => image.categoryId === imageCategory);
    return list;
  }, [projectImages, currentProject.id, imageCategory]);

  const stats = useMemo(() => {
    const done = designTasks.filter(task => isDoneStatus(effectiveStatus(task, projectTasks))).length;
    const pending = designTasks.filter(task => effectiveStatus(task, projectTasks) === "待审核").length;
    const risk = designTasks.filter(task => isOverdue(task) || task.status === "有风险" || isBlocked(task, projectTasks)).length;
    const total = designTasks.length || 1;
    return {
      progress: Math.round((done / total) * 100),
      images: projectImages.filter(image => image.projectId === currentProject.id).reduce((sum, image) => sum + image.versions.length, 0),
      pending,
      risk,
    };
  }, [designTasks, projectTasks, projectImages, currentProject.id]);

  const selectedVersions = useMemo(() => {
    if (!selectedTask) return [];
    return projectImages
      .filter(image => image.projectId === currentProject.id && image.title === selectedTask.name)
      .flatMap(image => image.versions.map(version => ({ image, version })))
      .sort((a, b) => b.version.uploadTime.localeCompare(a.version.uploadTime));
  }, [projectImages, currentProject.id, selectedTask]);

  const dependencies = selectedTask ? getDependencyTasks(selectedTask, projectTasks) : [];
  const materialRequirements = useMemo(() => dependencies.flatMap(dep => dep.resultMaterials ?? []), [dependencies]);
  const materialMode = materialRequirements.length > 0;
  const deliveredMaterialCount = materialRequirements.filter(item =>
    projectImages.some(image => image.projectId === currentProject.id && image.materialItemId === item.id),
  ).length;
  const pendingMaterialRequirements = materialRequirements.filter(item =>
    !projectImages.some(image => image.projectId === currentProject.id && image.materialItemId === item.id),
  );
  const deliveredMaterialRequirements = materialRequirements.filter(item =>
    projectImages.some(image => image.projectId === currentProject.id && image.materialItemId === item.id),
  );
  const blocked = selectedTask ? isBlocked(selectedTask, projectTasks) : false;
  const selectedStatus = selectedTask ? effectiveStatus(selectedTask, projectTasks) : "未开始";
  const taskChain = selectedTask ? buildTaskChain(selectedTask, projectTasks) : [];
  const fieldFeedbacks = useMemo(() => getOpenDeliveryFeedbacks(selectedTask), [selectedTask]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = String(event.target?.result ?? "");
      if (materialMode) {
        if (!selectedTask) return;
        const targetMaterialId = pendingFeedbackMaterialIdRef.current ?? activeMaterialId;
        const activeMaterial = materialRequirements.find(item => item.id === targetMaterialId);
        if (!activeMaterial) {
          showToast("请先选择要上传设计图的物料");
          return;
        }
        saveDesignImage(dataUrl, file.name, activeMaterial);
        if (pendingFeedbackIdRef.current && selectedTask) {
          onUpdateTask(selectedTask.id, {
            deliveryFeedbacks: resolveDeliveryFeedback(selectedTask.deliveryFeedbacks, pendingFeedbackIdRef.current),
          });
        }
        pendingFeedbackMaterialIdRef.current = null;
        pendingFeedbackIdRef.current = null;
        setSubmitFileName("");
        setSubmitDataUrl("");
        showToast(`已上传并绑定到「${activeMaterial.name}」`);
        return;
      }
      setSubmitFileName(file.name);
      setSubmitDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const submitDesign = () => {
    if (!selectedTask) return;
    if (blocked) {
      showToast("前置任务还没完成，暂时不能提交设计成果");
      return;
    }
    if (materialMode) {
      const deliveredCount = materialRequirements.filter(item =>
        projectImages.some(image => image.projectId === currentProject.id && image.materialItemId === item.id),
      ).length;
      if (deliveredCount < materialRequirements.length) {
        showToast("请先把每个物料的设计图上传完整");
        return;
      }
      onUpdateTask(selectedTask.id, {
        uploaded: true,
        status: selectedTask.needReview ? "待审核" : "已定稿",
        resultNote: submitNote || `已按 ${materialRequirements.length} 个物料分别交付设计图`,
        submittedAt: new Date().toISOString(),
      });
      setSubmitNote("");
      setActiveMaterialId(null);
      showToast(`已提交「${selectedTask.name}」整批物料设计`);
      return;
    }
    if (!submitDataUrl) {
      showToast("请先上传设计图片");
      return;
    }
    const activeMaterial = materialRequirements.find(item => item.id === activeMaterialId);
    if (materialMode && !activeMaterial) {
      showToast("请先选择要交付的具体物料");
      return;
    }

    const versionNumber = selectedVersions.length + 1;
    const version = {
      id: `v${versionNumber}_${Date.now()}`,
      url: submitDataUrl,
      versionStr: `v${versionNumber}`,
      uploadedBy: selectedTask.owner || "设计",
      sourceTask: selectedTask.name,
      status: selectedTask.needReview ? "pending" as const : "approved" as const,
      uploadTime: new Date().toISOString().slice(0, 16).replace("T", " "),
      notes: submitNote || "由设计工作台提交",
    };

    const imageTitle = activeMaterial ? `${selectedTask.name} - ${activeMaterial.name}` : selectedTask.name;
    const existing = projectImages.find(image =>
      image.projectId === selectedTask.projectId &&
      (activeMaterial ? image.materialItemId === activeMaterial.id : image.title === selectedTask.name)
    );
    if (existing) {
      onAddProjectImage({
        ...existing,
        id: `${existing.id}_version_${Date.now()}`,
        versions: [version],
      });
    } else {
      onAddProjectImage({
        id: `img_${Date.now()}`,
        projectId: selectedTask.projectId,
        categoryId: "poster",
        title: imageTitle,
        materialItemId: activeMaterial?.id,
        sourceTaskId: selectedTask.id,
        taskFolderName: selectedTask.name,
        versions: [version],
      });
    }

    onUpdateTask(selectedTask.id, {
      uploaded: true,
      status: selectedTask.needReview ? "待审核" : "已定稿",
      resultImageUrl: submitDataUrl,
      resultFileName: submitFileName || undefined,
      resultNote: submitNote || undefined,
      submittedAt: new Date().toISOString(),
    });
    setSubmitFileName("");
    setSubmitDataUrl("");
    setSubmitNote("");
    setActiveMaterialId(null);
    showToast(`已提交「${selectedTask.name}」设计成果`);
  };

  const saveDesignImage = (dataUrl: string, fileName: string, activeMaterial?: { id: string; name: string }) => {
    if (!selectedTask) return;
    const versionNumber = projectImages
      .find(image => image.projectId === selectedTask.projectId && (activeMaterial ? image.materialItemId === activeMaterial.id : image.title === selectedTask.name))
      ?.versions.length ?? 0;
    const version = {
      id: `v${versionNumber + 1}_${Date.now()}`,
      url: dataUrl,
      versionStr: `v${versionNumber + 1}`,
      uploadedBy: selectedTask.owner || "设计",
      sourceTask: selectedTask.name,
      status: selectedTask.needReview ? "pending" as const : "approved" as const,
      uploadTime: new Date().toISOString().slice(0, 16).replace("T", " "),
      notes: submitNote || fileName || "由设计工作台提交",
    };
    const existing = projectImages.find(image =>
      image.projectId === selectedTask.projectId &&
      (activeMaterial ? image.materialItemId === activeMaterial.id : image.title === selectedTask.name)
    );
    if (existing) {
      onAddProjectImage({
        ...existing,
        id: `${existing.id}_version_${Date.now()}`,
        versions: [version],
      });
    } else {
      onAddProjectImage({
        id: `img_${Date.now()}`,
        projectId: selectedTask.projectId,
        categoryId: "poster",
        title: activeMaterial ? `${selectedTask.name} - ${activeMaterial.name}` : selectedTask.name,
        materialItemId: activeMaterial?.id,
        sourceTaskId: selectedTask.id,
        taskFolderName: selectedTask.name,
        versions: [version],
      });
    }
  };

  return (
    <main className="design-workspace">
      <style>{designCss}</style>
      <WorkspaceTopBar isMobile={isMobile} onOpenDrawer={onOpenDrawer} userName="李明" userRole="设计负责人" />

      <div className="design-content">
        <WorkspaceProjectHero
          project={currentProject}
          projects={projects}
          progressLabel="设计进度"
          progressValue={stats.progress}
          metrics={[
            { label: "图片数量", value: `${stats.images} 张` },
            { label: "待审核", value: `${stats.pending} 张` },
            { label: "风险任务", value: `${stats.risk} 个`, danger: true },
          ]}
          onSwitchProject={onSwitchProject}
        />

        <div className="design-grid" style={{ gridTemplateColumns: isMobile ? "1fr" : "330px minmax(420px, 1fr) 380px" }}>
          <WorkspaceTaskList
            tasks={designTasks}
            allTasks={projectTasks}
            activeTaskId={selectedTask?.id}
            activeTab={taskTab}
            onTabChange={setTaskTab}
            onSelectTask={task => setSelectedTaskId(task.id)}
            action={<QuickTaskRequest requesterRole="设计" projects={projects} currentProject={currentProject} sourceTask={selectedTask} onCreateTask={onCreateTask} showToast={showToast} buttonLabel="发起协作" />}
          />

          <section className="design-panel detail-panel">
            {selectedTask ? (
              <>
                <h1>{selectedTask.name}</h1>
                <WorkspaceTaskMeta task={selectedTask} status={selectedStatus} dependencies={dependencies} />
                <WorkspaceTaskChain task={selectedTask} chain={taskChain} allTasks={projectTasks} />
                {dependencies.length > 0 ? (
                  <WorkspaceDetailBlock title="前置成果">
                    <WorkspaceDependencyResults dependencies={dependencies} emptyText="无前置任务，可直接开始设计。" showToast={showToast} />
                  </WorkspaceDetailBlock>
                ) : (
                  <WorkspaceDetailBlock title="任务描述">
                    <p>{selectedTask.desc || "请根据项目主题、品牌视觉和前置成果完成设计交付。"}</p>
                  </WorkspaceDetailBlock>
                )}
                {fieldFeedbacks.length > 0 && (
                  <WorkspaceDetailBlock title="现场修改意见">
                    <div className="field-feedback-list">
                      {fieldFeedbacks.map(feedback => {
                        const relatedImage = projectImages.find(image =>
                          image.projectId === currentProject.id &&
                          (feedback.title.includes(image.title) || image.title.includes(feedback.title)),
                        );
                        const feedbackMaterial = materialRequirements.find(item => item.id === feedback.materialItemId || feedback.title.includes(item.name));
                        const latest = relatedImage?.versions[relatedImage.versions.length - 1];
                        return (
                          <button
                            key={`${feedback.title}_${feedback.note}`}
                            className="field-feedback-card"
                            onClick={() => {
                              if (!feedbackMaterial) {
                                showToast("没有找到这条修改意见对应的物料");
                                return;
                              }
                              pendingFeedbackMaterialIdRef.current = feedbackMaterial.id;
                              pendingFeedbackIdRef.current = feedback.id;
                              setActiveMaterialId(feedbackMaterial.id);
                              fileInputRef.current?.click();
                            }}
                          >
                            {latest ? <img src={latest.url} alt={feedback.title} /> : <span />}
                            <div>
                              <b>{feedback.title}</b>
                              <p>{feedback.note}</p>
                            </div>
                            <em>上传修正版</em>
                          </button>
                        );
                      })}
                    </div>
                  </WorkspaceDetailBlock>
                )}
                <WorkspaceDetailBlock title={materialMode ? "按物料交付设计图" : "成果上传"}>
                  {materialMode ? (
                    <div className="material-delivery-board">
                      <div className="material-delivery-summary">
                        <div>
                          <b>{deliveredMaterialCount}/{materialRequirements.length}</b>
                          <span>已绑定物料设计图</span>
                        </div>
                        <button disabled={blocked || pendingMaterialRequirements.length === 0} onClick={() => {
                          const firstPending = pendingMaterialRequirements[0];
                          if (firstPending) setActiveMaterialId(firstPending.id);
                          fileInputRef.current?.click();
                        }}>
                          <UploadCloud size={14} /> 上传下一张
                        </button>
                      </div>
                      {pendingMaterialRequirements.length > 0 ? (
                        <div className="material-delivery-list">
                          {pendingMaterialRequirements.map(item => (
                            <button
                              key={item.id}
                              className={activeMaterialId === item.id ? "active" : ""}
                              onClick={() => {
                                setActiveMaterialId(item.id);
                                fileInputRef.current?.click();
                              }}
                            >
                              <div><UploadCloud size={18} /></div>
                              <b>{item.name}</b>
                              <p>{item.size || "未填尺寸"} · {item.scene || "未填位置"}</p>
                              <em>待上传</em>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="material-delivery-complete">
                          <CheckCircle2 size={18} />
                          <div>
                            <b>所有物料已上传</b>
                            <p>需要修改的图片会出现在上方“现场修改意见”，从对应卡片回传修正版。</p>
                          </div>
                        </div>
                      )}
                      {deliveredMaterialRequirements.length > 0 && (
                        <div className="material-delivered-strip">
                          {deliveredMaterialRequirements.map(item => <span key={item.id}>{item.name}</span>)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="upload-toolbar">
                        <button className="primary-small" onClick={() => fileInputRef.current?.click()}>上传新版本</button>
                        <button onClick={() => showToast("可从右侧图片库选择图片作为成果")}>从项目图片库选择</button>
                      </div>
                      <div
                        className={`design-upload ${blocked ? "disabled" : ""}`}
                        onClick={() => !blocked && fileInputRef.current?.click()}
                        onDragOver={event => event.preventDefault()}
                        onDrop={event => {
                          event.preventDefault();
                          if (!blocked) handleFile(event.dataTransfer.files?.[0]);
                        }}
                      >
                        <UploadCloud size={30} />
                        <b>{blocked ? "等待前置任务完成后才能上传" : submitFileName || "点击或拖拽图片到此处上传"}</b>
                        <span>支持 JPG、PNG、WebP，本地保存</span>
                      </div>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={event => handleFile(event.target.files?.[0])} />
                  <textarea value={submitNote} onChange={event => setSubmitNote(event.target.value)} placeholder="补充说明、修改点或给审核人的备注..." />
                  <button className="submit-design-button" disabled={blocked || (materialMode ? deliveredMaterialCount < materialRequirements.length : !submitDataUrl)} onClick={submitDesign}>
                    <Check size={15} /> {materialMode ? `提交整批设计（${deliveredMaterialCount}/${materialRequirements.length}）` : "提交审核"}
                  </button>
                </WorkspaceDetailBlock>
                <WorkspaceDetailBlock title="历史版本">
                  <div className="version-strip">
                    {selectedVersions.length === 0 ? (
                      <div className="empty-version">暂无历史版本</div>
                    ) : selectedVersions.slice(0, 4).map(({ image, version }) => (
                      <button key={`${image.id}_${version.id}`} onClick={() => setPreviewImage(image)}>
                        <img src={version.url} alt={image.title} />
                        <b>{version.versionStr}</b>
                        <span>{version.status === "approved" ? "已定稿" : version.status === "pending" ? "待审核" : "需修改"}</span>
                      </button>
                    ))}
                  </div>
                </WorkspaceDetailBlock>
              </>
            ) : (
              <div className="empty-detail">请选择一个设计任务</div>
            )}
          </section>

          <section className="design-panel image-panel">
            <div className="panel-title-row">
              <h2>项目图片库（最新版本）</h2>
              <button onClick={() => showToast("已跳转到完整项目图片库入口")}>全部进入</button>
            </div>
            <div className="image-tabs">
              <button className={imageCategory === "all" ? "active" : ""} onClick={() => setImageCategory("all")}>全部</button>
              {CATEGORIES.map(category => (
                <button key={category.id} className={imageCategory === category.id ? "active" : ""} onClick={() => setImageCategory(category.id)}>
                  {category.name}
                </button>
              ))}
            </div>
            <div className="project-image-grid">
              {currentImages.map(image => (
                <ImageCard key={image.id} image={image} onClick={() => setPreviewImage(image)} />
              ))}
            </div>
          </section>
        </div>
      </div>

      {previewImage && <ImagePreview image={previewImage} onClose={() => setPreviewImage(null)} />}
    </main>
  );
}

function ImageCard({ image, onClick }: { image: ProjectImage; onClick: () => void }) {
  const latest = image.versions[image.versions.length - 1];
  return (
    <button className="project-image-card" onClick={onClick}>
      <div><img src={latest.url} alt={image.title} /><span>{latest.status === "approved" ? "最新" : latest.status === "pending" ? "待审" : "需改"} {latest.versionStr}</span></div>
      <b>{image.title}</b>
      <p>设计：{latest.uploadedBy}</p>
      <p>更新时间：{latest.uploadTime}</p>
    </button>
  );
}

function ImagePreview({ image, onClose }: { image: ProjectImage; onClose: () => void }) {
  const latest = image.versions[image.versions.length - 1];
  return (
    <div className="image-preview-backdrop" onClick={onClose}>
      <div className="image-preview-modal" onClick={event => event.stopPropagation()}>
        <button onClick={onClose}><X size={18} /></button>
        <img src={latest.url} alt={image.title} />
        <div><b>{image.title}</b><span>{latest.versionStr} · {latest.uploadTime}</span></div>
      </div>
    </div>
  );
}

const panelStyle: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E6ECF5",
  borderRadius: 12,
};

const designCss = `
.design-workspace { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #f7f9fc; color: #111827; overflow: hidden; }
.design-topbar { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; background: #fff; border-bottom: 1px solid #e6ecf5; flex-shrink: 0; }
.topbar-title { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 900; }
.topbar-title button,.topbar-tools button { display: inline-flex; align-items: center; justify-content: center; border: 1px solid #e6ecf5; background: #fff; border-radius: 9px; height: 34px; min-width: 34px; cursor: pointer; }
.topbar-tools { display: flex; align-items: center; gap: 12px; }
.topbar-search { width: 280px; height: 34px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid #e6ecf5; border-radius: 999px; color: #98a2b3; font-size: 12px; font-weight: 700; }
.bell-button { position: relative; }
.bell-button i { position: absolute; right: -4px; top: -5px; background: #ef4444; color: #fff; border-radius: 999px; font-size: 9px; padding: 1px 4px; font-style: normal; }
.designer-user { display: grid; grid-template-columns: 34px auto; column-gap: 8px; align-items: center; }
.designer-user span { grid-row: span 2; width: 34px; height: 34px; display: grid; place-items: center; background: #f3f4f6; border-radius: 999px; font-weight: 900; }
.designer-user b { font-size: 12px; line-height: 1; }
.designer-user em { font-size: 11px; color: #667085; font-style: normal; }
.design-content { flex: 1; overflow: auto; padding: 16px; }
.project-hero { display: grid; grid-template-columns: 64px minmax(220px, 1fr) 120px repeat(4, minmax(110px, 0.45fr)); gap: 18px; align-items: center; padding: 16px; margin-bottom: 12px; background: #fff; border: 1px solid #dbe6f5; border-radius: 10px; }
.project-cover { width: 58px; height: 58px; display: grid; place-items: center; border-radius: 8px; background: #111827; color: #facc15; font-size: 24px; font-weight: 900; }
.project-main b { font-size: 17px; font-weight: 900; }
.project-main span { margin-left: 8px; padding: 3px 7px; border-radius: 6px; background: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 900; }
.project-main p { margin: 10px 0 0; color: #667085; font-size: 12px; font-weight: 700; }
.project-hero select { height: 34px; border: 1px solid #dbe6f5; border-radius: 8px; color: #2563eb; font-weight: 800; background: #fff; }
.hero-metric { min-height: 54px; border-left: 1px solid #e6ecf5; padding-left: 18px; }
.hero-metric span { display: block; color: #667085; font-size: 12px; font-weight: 800; margin-bottom: 6px; }
.hero-metric b { font-size: 24px; font-weight: 900; }
.hero-metric b.danger { color: #ef4444; }
.hero-metric i { display: block; width: 88px; height: 5px; background: #e6ecf5; border-radius: 999px; overflow: hidden; margin-top: 8px; }
.hero-metric em { display: block; height: 100%; background: #2563eb; border-radius: inherit; }
.design-grid { display: grid; gap: 12px; align-items: start; }
.design-panel { ${Object.entries(panelStyle).map(([k, v]) => `${k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}:${v}`).join(";")}; overflow: hidden; }
.panel-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; }
.panel-title-row h2 { margin: 0; font-size: 16px; font-weight: 900; }
.panel-title-row button,.upload-toolbar button { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid #dbe6f5; background: #fff; color: #2563eb; font-size: 12px; font-weight: 900; cursor: pointer; }
.panel-title-row button:first-of-type,.primary-small { background: #2563eb !important; color: #fff !important; border-color: #2563eb !important; }
.task-tabs,.image-tabs { display: flex; gap: 4px; padding: 0 16px 12px; border-bottom: 1px solid #eef2f7; overflow-x: auto; }
.task-tabs button,.image-tabs button { border: 0; background: transparent; color: #667085; height: 30px; padding: 0 8px; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap; }
.task-tabs button.active,.image-tabs button.active { color: #2563eb; border-bottom: 2px solid #2563eb; }
.task-tabs span { margin-left: 4px; }
.design-task-list { display: flex; flex-direction: column; gap: 10px; padding: 12px; max-height: 650px; overflow: auto; }
.design-task-card { position: relative; display: block; width: 100%; text-align: left; padding: 14px; border-radius: 9px; border: 1px solid #e6ecf5; background: #fff; cursor: pointer; }
.design-task-card.active { border-color: #2563eb; background: #eff6ff; box-shadow: inset 3px 0 0 #2563eb; }
.design-task-card div { display: flex; justify-content: space-between; gap: 8px; }
.design-task-card b { color: #111827; font-size: 13px; font-weight: 900; }
.design-task-card span { border-radius: 6px; padding: 3px 7px; font-size: 11px; font-weight: 900; white-space: nowrap; }
.design-task-card p { margin: 10px 0 0; color: #667085; font-size: 12px; font-weight: 700; }
.design-task-card em { position: absolute; right: 14px; bottom: 12px; color: #98a2b3; font-size: 11px; font-style: normal; font-weight: 800; }
.detail-panel { padding: 16px; }
.detail-panel h1 { margin: 12px 0 16px; font-size: 20px; font-weight: 900; }
.task-meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid #e6ecf5; border-radius: 9px; overflow: hidden; }
.task-meta-grid div { padding: 12px; background: #fbfcfe; border-right: 1px solid #e6ecf5; border-bottom: 1px solid #e6ecf5; }
.task-meta-grid span { display: block; color: #667085; font-size: 11px; font-weight: 800; margin-bottom: 5px; }
.task-meta-grid b { display: block; color: #111827; font-size: 12px; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.task-chain-progress { margin-top: 14px; padding: 13px; border-radius: 10px; border: 1px solid #dbe6f5; background: #fbfcfe; }
.chain-progress-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.chain-progress-head h3 { margin: 0; color: #111827; font-size: 13px; font-weight: 900; }
.chain-progress-head p { margin: 5px 0 0; color: #667085; font-size: 12px; font-weight: 700; line-height: 1.5; }
.chain-progress-head span { flex-shrink: 0; padding: 5px 8px; border-radius: 7px; background: #fff7f7; border: 1px solid #fecaca; color: #dc2626; font-size: 11px; font-weight: 900; }
.design-chain-row { display: flex; align-items: stretch; gap: 8px; overflow-x: auto; padding: 4px 2px 7px; }
.design-chain-node { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.design-chain-card { width: 130px; min-height: 86px; padding: 10px; border-radius: 8px; border: 1px solid #e6ecf5; background: #ffffff; }
.design-chain-card.done { background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%); border-color: #86efac; }
.design-chain-card.blocker { background: #fff7f7; border: 2px solid #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12); }
.design-chain-card.current { border: 2px solid #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }
.design-chain-card.blocker.current { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12), 0 0 0 6px rgba(37, 99, 235, 0.1); }
.design-chain-card b { display: block; min-height: 32px; color: #111827; font-size: 11px; line-height: 1.45; font-weight: 900; }
.design-chain-card p { margin: 6px 0; color: #667085; font-size: 11px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.design-chain-card em { display: inline-flex; border: 1px solid; border-radius: 5px; padding: 3px 6px; font-size: 10px; font-style: normal; font-weight: 900; }
.design-chain-arrow { color: #98a2b3; font-size: 18px; font-weight: 400; }
.detail-block { margin-top: 16px; padding-top: 14px; border-top: 1px solid #eef2f7; }
.detail-block h3 { margin: 0 0 10px; font-size: 13px; font-weight: 900; }
.detail-block p { margin: 0; color: #344054; font-size: 13px; line-height: 1.65; white-space: pre-wrap; }
.field-feedback-list { display: flex; flex-direction: column; gap: 10px; }
.field-feedback-card { display: grid; grid-template-columns: 70px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px; border: 1px solid #fed7aa; border-radius: 9px; background: #fff7ed; }
.field-feedback-card img,.field-feedback-card > span { width: 70px; height: 52px; border-radius: 7px; object-fit: cover; background: #fff; border: 1px solid #ffedd5; }
.field-feedback-card b { display: block; color: #111827; font-size: 13px; font-weight: 900; }
.field-feedback-card p { margin: 4px 0 0; color: #9a3412; font-size: 12px; line-height: 1.5; }
.field-feedback-card em { padding: 4px 8px; border-radius: 999px; background: #ffedd5; color: #c2410c; font-size: 11px; font-style: normal; font-weight: 900; white-space: nowrap; }
.dependency-list { display: flex; flex-direction: column; gap: 8px; }
.dependency-list div,.empty-deps { padding: 10px; border: 1px solid #e6ecf5; border-radius: 8px; background: #fbfcfe; }
.dependency-list div.done { border-color: #86efac; background: #f0fdf4; }
.dependency-head { display: flex; align-items: center; gap: 8px; margin: -2px -2px 8px; padding: 0 !important; border: 0 !important; background: transparent !important; }
.dependency-head b { flex: 1; min-width: 0; font-size: 12px; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dependency-head span { flex-shrink: 0; font-size: 11px; font-weight: 900; color: #2563eb; }
.dependency-head button { flex-shrink: 0; height: 26px; padding: 0 9px; border-radius: 7px; border: 1px solid #bfdbfe; background: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 900; cursor: pointer; }
.dependency-head button:hover { background: #dbeafe; border-color: #93c5fd; }
.upload-toolbar { display: flex; gap: 8px; margin-bottom: 10px; }
.material-delivery-board { display: flex; flex-direction: column; gap: 10px; padding: 12px; border: 1px solid #e6ecf5; border-radius: 10px; background: #fbfcfe; }
.material-delivery-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 10px; border-bottom: 1px solid #eef2f7; }
.material-delivery-summary b { display: block; color: #111827; font-size: 18px; font-weight: 900; }
.material-delivery-summary span { display: block; margin-top: 3px; color: #667085; font-size: 12px; font-weight: 800; }
.material-delivery-summary button { flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 1px solid #2563eb; border-radius: 8px; background: #2563eb; color: #fff; font-size: 12px; font-weight: 900; cursor: pointer; }
.material-delivery-summary button:disabled { border-color: #d0d5dd; background: #f2f4f7; color: #98a2b3; cursor: not-allowed; }
.material-delivery-list { display: flex; flex-direction: column; gap: 8px; }
.material-delivery-list button { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; grid-template-rows: auto auto; column-gap: 10px; row-gap: 2px; align-items: center; min-height: 56px; padding: 9px 10px; border: 1px solid #dbe6f5; border-radius: 9px; background: #fff; text-align: left; cursor: pointer; }
.material-delivery-list button.active { border-color: #2563eb; background: #eff6ff; box-shadow: 0 0 0 3px rgba(37,99,235,.1); }
.material-delivery-list div { grid-row: 1 / 3; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 8px; background: #eff6ff; color: #2563eb; }
.material-delivery-list b { color: #111827; font-size: 13px; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.material-delivery-list p { margin: 0; color: #667085; font-size: 11px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.material-delivery-list em { grid-row: 1 / 3; align-self: center; padding: 4px 8px; border-radius: 999px; background: #eff6ff; color: #2563eb; font-size: 11px; font-style: normal; font-weight: 900; }
.material-delivery-complete { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border: 1px solid #bbf7d0; border-radius: 9px; background: #f0fdf4; color: #15803d; }
.material-delivery-complete b { display: block; color: #166534; font-size: 13px; font-weight: 900; }
.material-delivery-complete p { margin: 4px 0 0; color: #15803d; font-size: 12px; line-height: 1.5; }
.material-delivered-strip { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 2px; }
.material-delivered-strip span { padding: 4px 8px; border-radius: 999px; background: #fff; border: 1px solid #e6ecf5; color: #667085; font-size: 11px; font-weight: 900; }
.design-upload { min-height: 110px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; border: 1.5px dashed #b8c5d8; border-radius: 10px; background: #fbfcfe; color: #2563eb; cursor: pointer; }
.design-upload.disabled { color: #98a2b3; background: #f3f4f6; cursor: not-allowed; }
.design-upload b { color: #344054; font-size: 13px; }
.design-upload span { color: #98a2b3; font-size: 12px; }
.detail-block textarea { width: 100%; min-height: 70px; margin-top: 10px; padding: 10px; border: 1px solid #dbe6f5; border-radius: 9px; outline: 0; resize: vertical; font-size: 13px; }
.submit-design-button { display: inline-flex; align-items: center; gap: 6px; height: 34px; margin-top: 10px; padding: 0 16px; border-radius: 8px; border: 0; background: #2563eb; color: #fff; font-weight: 900; cursor: pointer; }
.submit-design-button:disabled { background: #cbd5e1; cursor: not-allowed; }
.version-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.version-strip button { position: relative; padding: 8px; border: 1px solid #dbe6f5; border-radius: 8px; background: #fff; cursor: pointer; text-align: left; }
.version-strip img { width: 100%; height: 74px; object-fit: cover; border-radius: 6px; }
.version-strip b { display: block; margin-top: 6px; color: #2563eb; font-size: 11px; }
.version-strip span { color: #667085; font-size: 10px; }
.project-image-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 14px; max-height: 680px; overflow: auto; }
.project-image-card { display: block; text-align: left; border: 1px solid #e6ecf5; border-radius: 9px; background: #fff; padding: 8px; cursor: pointer; }
.project-image-card div { position: relative; }
.project-image-card img { width: 100%; height: 118px; object-fit: cover; border-radius: 7px; background: #f3f4f6; }
.project-image-card span { position: absolute; left: 6px; bottom: 6px; padding: 3px 6px; border-radius: 5px; background: #2563eb; color: #fff; font-size: 10px; font-weight: 900; }
.project-image-card b { display: block; margin-top: 8px; color: #111827; font-size: 12px; font-weight: 900; }
.project-image-card p { margin: 4px 0 0; color: #667085; font-size: 11px; }
.image-preview-backdrop { position: fixed; inset: 0; z-index: 150; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(15,23,42,.46); backdrop-filter: blur(4px); }
.image-preview-modal { position: relative; width: min(760px, calc(100vw - 32px)); max-height: calc(100vh - 48px); background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 24px 80px rgba(15,23,42,.24); }
.image-preview-modal > button { position: absolute; right: 12px; top: 12px; width: 34px; height: 34px; border-radius: 999px; border: 1px solid #e6ecf5; background: #fff; cursor: pointer; z-index: 1; }
.image-preview-modal img { width: 100%; max-height: 70vh; object-fit: contain; background: #111827; }
.image-preview-modal div { padding: 14px 16px; display: flex; justify-content: space-between; gap: 12px; }
.image-preview-modal b { font-size: 14px; }
.image-preview-modal span { color: #667085; font-size: 12px; font-weight: 800; }
.empty-design-list,.empty-detail,.empty-version { min-height: 120px; display: grid; place-items: center; color: #98a2b3; font-size: 13px; font-weight: 800; }
@media (max-width: 1180px) { .project-hero { grid-template-columns: 64px 1fr 120px; } .hero-metric { display: none; } .topbar-search { width: 210px; } .project-image-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 720px) { .design-topbar { padding: 0 12px; } .topbar-search,.designer-user,.topbar-tools > button { display: none; } .design-content { padding: 10px; } .project-hero { grid-template-columns: 52px 1fr; gap: 12px; } .project-hero select { grid-column: 1 / -1; width: 100%; } .project-cover { width: 52px; height: 52px; } .task-meta-grid { grid-template-columns: 1fr 1fr; } .version-strip,.project-image-grid,.material-delivery-list { grid-template-columns: repeat(2, 1fr); } }
`;
