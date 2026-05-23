import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Layers3,
  MessageSquare,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { Project } from "../data/projects";
import { Task } from "../data/tasks";
import { effectiveStatus, isDoneStatus, statusStyle } from "../lib/taskUtils";
import { addOpenDeliveryFeedback, createDeliveryFeedback } from "../lib/deliveryFeedback";
import { getNextTasks, hasPendingDownstreamAcceptance } from "../lib/taskChain";
import { DeliveryItem, findLatestMaterialImage, getLatestDownstreamDeliveries } from "../lib/materialDelivery";
import { WorkspaceProjectHero } from "../components/WorkspaceProjectHero";
import { WorkspaceTopBar } from "../components/WorkspaceTopBar";
import { QuickTaskRequest } from "../components/QuickTaskRequest";
import { ProjectImage } from "./ProjectImageLibrary";

interface FieldWorkspaceProps {
  projects: Project[];
  currentProject: Project;
  tasks: Task[];
  projectImages: ProjectImage[];
  onSwitchProject: (p: Project) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onUpdateProjectImages: (updater: (images: ProjectImage[]) => ProjectImage[]) => void;
  onCreateTask: (task: Task | Task[]) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
  showToast: (msg: string) => void;
}

interface MaterialItem {
  id: string;
  name: string;
  size: string;
  quantity: string;
  scene: string;
  placementImage?: string;
  placementFileName?: string;
  notes: string;
}

type DraftMap = Record<string, MaterialItem[]>;

const emptyItem = (): MaterialItem => ({
  id: `mat_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  name: "",
  size: "",
  quantity: "",
  scene: "",
  placementImage: "",
  placementFileName: "",
  notes: "",
});

const demoItems: MaterialItem[] = [
  { id: "mat_demo_1", name: "门型展架", size: "80cm x 120cm", quantity: "2 套", scene: "入口签到处", placementImage: "", placementFileName: "", notes: "需要露出课程主视觉和二维码" },
  { id: "mat_demo_2", name: "入户桁架", size: "200cm x 300cm", quantity: "1 套", scene: "会场入口", placementImage: "", placementFileName: "", notes: "用于拍照打卡，画面留人物站位" },
  { id: "mat_demo_3", name: "桌牌", size: "20cm x 10cm", quantity: "30 个", scene: "嘉宾席位", placementImage: "", placementFileName: "", notes: "按座位表制作" },
];

export function FieldWorkspace({
  projects,
  currentProject,
  tasks,
  projectImages,
  onSwitchProject,
  onUpdateTask,
  onUpdateProjectImages,
  onCreateTask,
  isMobile,
  onOpenDrawer,
  showToast,
}: FieldWorkspaceProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [pasteText, setPasteText] = useState("");
  const [previewDelivery, setPreviewDelivery] = useState<DeliveryItem | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [feedbackMaterialDraft, setFeedbackMaterialDraft] = useState<MaterialItem | null>(null);
  const [acceptedBatches, setAcceptedBatches] = useState<Record<string, boolean>>({});
  const [viewedDeliveryVersions, setViewedDeliveryVersions] = useState<Record<string, boolean>>({});
  const [editingDeliveredTasks, setEditingDeliveredTasks] = useState<Record<string, boolean>>({});

  const projectTasks = useMemo(() => tasks.filter(task => task.projectId === currentProject.id), [tasks, currentProject.id]);
  const fieldTasks = useMemo(() => projectTasks.filter(task => task.role === "现场执行"), [projectTasks]);
  const selectedTask =
    fieldTasks.find(task => task.id === selectedTaskId) ??
    fieldTasks.find(task => !isDoneStatus(effectiveStatus(task, projectTasks))) ??
    fieldTasks[0];
  const selectedItems = selectedTask ? drafts[selectedTask.id] ?? defaultItemsForTask(selectedTask) : [];
  const selectedDelivered = selectedTask ? isDoneStatus(effectiveStatus(selectedTask, projectTasks)) : false;
  const canEditSelected = selectedTask ? !selectedDelivered || Boolean(editingDeliveredTasks[selectedTask.id]) : false;
  const nextTasks = selectedTask ? getNextTasks(selectedTask, projectTasks) : [];
  const rawDownstreamDeliveries = selectedTask ? getLatestDownstreamDeliveries(selectedTask, nextTasks, projectImages) : [];
  const downstreamDeliveries = rawDownstreamDeliveries.map(delivery => ({
    ...delivery,
    hasUpdate: delivery.hasUpdate && !viewedDeliveryVersions[`${delivery.id}:${delivery.version}`],
  }));
  const deliveryBatchKey = selectedTask
    ? `${selectedTask.id}:${downstreamDeliveries.map(delivery => `${delivery.id}_${delivery.version}`).join("|")}`
    : "";
  const isDeliveryAccepted = Boolean(deliveryBatchKey && acceptedBatches[deliveryBatchKey]);

  const stats = useMemo(() => {
    const done = fieldTasks.filter(task => isDoneStatus(effectiveStatus(task, projectTasks))).length;
    const total = fieldTasks.length || 1;
    const materialCount = Object.values(drafts).reduce((sum, items) => sum + items.filter(item => item.name.trim()).length, 0);
    return {
      progress: Math.round((done / total) * 100),
      total,
      pending: fieldTasks.length - done,
      materialCount,
    };
  }, [fieldTasks, projectTasks, drafts]);

  const updateDraft = (taskId: string, updater: (items: MaterialItem[]) => MaterialItem[]) => {
    setDrafts(prev => ({
      ...prev,
      [taskId]: updater(prev[taskId] ?? defaultItemsForTask(selectedTask)),
    }));
  };

  const openDeliveryPreview = (delivery: DeliveryItem) => {
    const deliveryKey = `${delivery.id}:${delivery.version}`;
    const material = findMaterialForDelivery(delivery, selectedItems);
    setViewedDeliveryVersions(prev => ({ ...prev, [deliveryKey]: true }));
    setPreviewDelivery({ ...delivery, hasUpdate: false });
    setFeedbackMaterialDraft(material ? { ...material } : null);
    setReviewNote("");
  };

  const parsePasteText = () => {
    if (!selectedTask) return;
    const parsed = pasteText
      .split(/\n+/)
      .map(line => line.trim().replace(/^\d+[.、]\s*/, ""))
      .filter(Boolean)
      .map(line => {
        const sizeMatch = line.match(/(?:尺寸|规格)[:：]?\s*([0-9xX+*×cmCM\s]+)(.*)$/);
        const name = sizeMatch ? line.slice(0, sizeMatch.index).trim() : line;
        return {
          ...emptyItem(),
          name: name || line,
          size: sizeMatch?.[1]?.trim() ?? "",
          notes: sizeMatch?.[2]?.trim() ?? "",
        };
      });
    if (!parsed.length) {
      showToast("没有识别到可导入的物料行");
      return;
    }
    updateDraft(selectedTask.id, items => [...items.filter(item => item.name.trim()), ...parsed]);
    setPasteText("");
    showToast(`已导入 ${parsed.length} 条物料`);
  };

  const deliverTask = () => {
    if (!selectedTask) return;
    const validItems = selectedItems.filter(item => item.name.trim());
    if (!validItems.length) {
      showToast("请至少填写一个物料名称");
      return;
    }

    const now = new Date().toISOString();
    const desc = buildMaterialResult(validItems);

    onUpdateTask(selectedTask.id, {
      uploaded: true,
      status: "已完成",
      resultType: "表格",
      resultContent: desc,
      resultMaterials: validItems,
      resultNote: "已交付现场物料尺寸、数量、摆放位置与位置参考图。",
      submittedAt: now,
    });
    setDrafts(prev => ({ ...prev, [selectedTask.id]: validItems }));
    setEditingDeliveredTasks(prev => ({ ...prev, [selectedTask.id]: false }));

    nextTasks.forEach(nextTask => {
      const dependencyIds = Array.from(new Set([...(nextTask.dependencyIds ?? []), selectedTask.id]));
      const previousDesc = cleanMaterialHandoff(nextTask.desc?.trim(), selectedTask.name);
      onUpdateTask(nextTask.id, {
        dependencyIds,
        status: effectiveStatus(nextTask, projectTasks) === "等待前置任务" ? "未开始" : nextTask.status,
        desc: [
          previousDesc,
          `上游任务「${selectedTask.name}」已交付现场物料信息：`,
          desc,
        ].filter(Boolean).join("\n\n"),
      });
    });

    const receiver = nextTasks.length
      ? nextTasks.map(task => `${task.role}「${task.name}」`).join("、")
      : "任务链下一环";
    showToast(`已完成当前任务，并交付给${receiver}`);
  };

  const acceptDeliveryBatch = () => {
    if (!selectedTask || !downstreamDeliveries.length) return;
    const acceptedAt = new Date().toISOString();
    const acceptedVersions = new Set(
      downstreamDeliveries
        .filter(delivery => delivery.imageId && delivery.versionId)
        .map(delivery => `${delivery.imageId}:${delivery.versionId}`),
    );
    onUpdateProjectImages(images => images.map(image => {
      const versions = image.versions.map(version =>
        acceptedVersions.has(`${image.id}:${version.id}`) ? { ...version, status: "approved" as const } : version,
      );
      const changed = versions.some((version, index) => version !== image.versions[index]);
      return changed ? { ...image, versions, acceptedAt } : image;
    }));
    setAcceptedBatches(prev => ({ ...prev, [deliveryBatchKey]: true }));
    onUpdateTask(selectedTask.id, { reviewedAt: acceptedAt });
    showToast("已完成整体验收，最新版设计图已进入素材库");
  };

  const submitDeliveryFeedback = () => {
    if (!selectedTask || !previewDelivery) return;
    const note = reviewNote.trim();
    const changedMaterial = feedbackMaterialDraft ? normalizeMaterialItem(feedbackMaterialDraft) : null;
    const originalMaterial = findMaterialForDelivery(previewDelivery, selectedItems);
    const hasMaterialChange = Boolean(originalMaterial && changedMaterial && isMaterialChanged(originalMaterial, changedMaterial));
    if (!note && !hasMaterialChange) {
      showToast("请先填写修改意见或调整物料信息");
      return;
    }
    const updatedItems = hasMaterialChange && originalMaterial && changedMaterial
      ? selectedItems.map(item => item.id === originalMaterial.id ? changedMaterial : item)
      : selectedItems;
    const updatedResultContent = buildMaterialResult(updatedItems.filter(item => item.name.trim()));
    if (hasMaterialChange) {
      onUpdateTask(selectedTask.id, {
        resultMaterials: updatedItems,
        resultContent: updatedResultContent,
        resultNote: "已更新现场物料尺寸、数量、摆放位置与位置参考图。",
        submittedAt: new Date().toISOString(),
      });
      setDrafts(prev => ({ ...prev, [selectedTask.id]: updatedItems }));
    }
    const targetTask =
      nextTasks.find(task => task.id === previewDelivery.taskId) ??
      nextTasks.find(task => task.name === previewDelivery.sourceTask || previewDelivery.title.includes(task.name)) ??
      nextTasks[0];
    const feedbackNote = [
      hasMaterialChange && originalMaterial && changedMaterial ? buildMaterialChangeNote(originalMaterial, changedMaterial) : "",
      note,
    ].filter(Boolean).join("\n");
    if (targetTask) {
      const nextFeedback = createDeliveryFeedback({
        title: previewDelivery.title,
        note: feedbackNote,
        materialItemId: previewDelivery.materialItemId,
        imageId: previewDelivery.imageId,
        versionId: previewDelivery.versionId,
        fromTaskId: selectedTask.id,
        fromRole: selectedTask.role,
      });
      const previousDesc = cleanMaterialHandoff(targetTask.desc?.trim(), selectedTask.name);
      onUpdateTask(targetTask.id, {
        deliveryFeedbacks: addOpenDeliveryFeedback(targetTask.deliveryFeedbacks, nextFeedback),
        desc: hasMaterialChange
          ? [
            previousDesc,
            `上游任务「${selectedTask.name}」已交付现场物料信息：`,
            updatedResultContent,
          ].filter(Boolean).join("\n\n")
          : targetTask.desc,
      });
    }
    if (previewDelivery.imageId && previewDelivery.versionId) {
      onUpdateProjectImages(images => images.map(image => image.id === previewDelivery.imageId ? {
        ...image,
        versions: image.versions.map(version => version.id === previewDelivery.versionId ? {
          ...version,
          status: "rejected" as const,
          notes: [version.notes, feedbackNote].filter(Boolean).join("\n\n"),
        } : version),
      } : image));
    }
    setAcceptedBatches(prev => ({ ...prev, [deliveryBatchKey]: false }));
    setReviewNote("");
    setFeedbackMaterialDraft(null);
    setPreviewDelivery(null);
    showToast(hasMaterialChange ? "需求变更和修改意见已同步到设计任务" : "修改意见已同步到设计任务");
  };

  return (
    <main className="field-workspace">
      <style>{fieldCss}</style>
      <WorkspaceTopBar isMobile={isMobile} onOpenDrawer={onOpenDrawer} userName="高峰" userRole="现场执行" />

      <div className="field-content">
        <WorkspaceProjectHero
          project={currentProject}
          projects={projects}
          progressLabel="现场进度"
          progressValue={stats.progress}
          metrics={[
            { label: "现场任务", value: `${stats.total} 个` },
            { label: "待交付", value: `${stats.pending} 个`, danger: stats.pending > 0 },
            { label: "已填物料", value: `${stats.materialCount} 项` },
          ]}
          onSwitchProject={onSwitchProject}
        />

        <div className="field-layout" style={{ gridTemplateColumns: isMobile ? "1fr" : "330px minmax(520px, 1fr) 360px" }}>
          <section className="field-panel">
            <div className="field-panel-head">
              <div>
                <h2>我的现场协作任务</h2>
                <p>点击任务，在中间填写交付内容</p>
              </div>
              <QuickTaskRequest
                requesterRole="现场执行"
                projects={projects}
                currentProject={currentProject}
                sourceTask={selectedTask}
                onCreateTask={onCreateTask}
                showToast={showToast}
                buttonLabel="新建协作"
              />
            </div>
            <div className="field-task-list">
              {fieldTasks.map(task => (
                <FieldTaskButton
                  key={task.id}
                  task={task}
                  allTasks={projectTasks}
                  active={selectedTask?.id === task.id}
                  nextTasks={getNextTasks(task, projectTasks)}
                  pendingAcceptance={hasPendingAcceptance(task, projectTasks, projectImages, acceptedBatches)}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    setDrafts(prev => prev[task.id] ? prev : { ...prev, [task.id]: defaultItemsForTask(task) });
                    setPasteText("");
                  }}
                />
              ))}
            </div>
          </section>

          <section className="field-panel field-editor">
            {selectedTask ? (
              <>
                <div className="field-detail-head">
                  <div>
                    <h1>{selectedTask.name}</h1>
                    <p>{selectedTask.desc || "填写现场物料尺寸、数量、摆放位置和参考照片，交付后会流转到任务链下一环。"}</p>
                  </div>
                  <button onClick={() => exportTaskSheet(currentProject.fullName, selectedTask, selectedItems, projectImages)}>
                    <Download size={15} /> 导出对接表
                  </button>
                </div>

                <div className="field-status-strip">
                  <StatusStep label="当前任务" active done={isDoneStatus(effectiveStatus(selectedTask, projectTasks))} />
                  <StatusStep label={nextTasks.length ? `下一环：${nextTasks.map(task => task.role).join(" / ")}` : "下一环待配置"} active={nextTasks.length > 0} />
                  <StatusStep label="填写物料信息" active done={selectedItems.some(item => item.name.trim())} />
                  <StatusStep label="交付完成" active={isDoneStatus(effectiveStatus(selectedTask, projectTasks))} />
                </div>

                <div className="chain-note">
                  <b>交付去向</b>
                  <span>
                    {nextTasks.length
                      ? nextTasks.map(task => `${task.role}「${task.name}」`).join("、")
                      : "当前任务没有配置下一环，交付后只会完成本任务。"}
                  </span>
                </div>

                <section className="downstream-delivery">
                  <div className="delivery-head">
                    <div>
                      <h2>下游交付结果</h2>
                      <p>设计或下一岗位完成后，现场回到这条任务即可查看与导出</p>
                    </div>
                    <span>{downstreamDeliveries.length} 个结果</span>
                  </div>
                  {downstreamDeliveries.length ? (
                    <div className="delivery-grid">
                      {downstreamDeliveries.map(delivery => (
                        <button key={delivery.id} className={delivery.hasUpdate ? "has-update" : ""} onClick={() => openDeliveryPreview(delivery)}>
                          <img src={delivery.url} alt={delivery.title} />
                          {delivery.hasUpdate && <i />}
                          <b>{delivery.title}</b>
                          <span>{delivery.source} · {delivery.version}</span>
                          {delivery.status === "rejected" && <em className="needs-change">需修改</em>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="delivery-empty">下一环还没有交付结果，交付后会自动显示在这里。</div>
                  )}
                </section>

                <div className="paste-box">
                  <div>
                    <label className="field-label">快速粘贴</label>
                    <p>支持“1. 门型展架 尺寸80x120”格式</p>
                  </div>
                  <textarea disabled={!canEditSelected} value={pasteText} onChange={event => setPasteText(event.target.value)} placeholder={"1. 门型展架 尺寸80x120\n2. 入户桁架 尺寸200+300"} />
                  <button disabled={!canEditSelected} onClick={parsePasteText}><Layers3 size={14} /> 解析到表格</button>
                </div>

                <div className="edit-material-list">
                  {selectedItems.map((item, index) => (
                    <div key={item.id} className="edit-material-row">
                      <span>{index + 1}</span>
                      <input disabled={!canEditSelected} value={item.name} onChange={event => updateMaterial(selectedTask.id, item.id, { name: event.target.value }, updateDraft)} placeholder="物料名称" />
                      <input disabled={!canEditSelected} value={item.size} onChange={event => updateMaterial(selectedTask.id, item.id, { size: event.target.value }, updateDraft)} placeholder="尺寸 / 规格" />
                      <input disabled={!canEditSelected} value={item.quantity} onChange={event => updateMaterial(selectedTask.id, item.id, { quantity: event.target.value }, updateDraft)} placeholder="数量" />
                      <input disabled={!canEditSelected} value={item.scene} onChange={event => updateMaterial(selectedTask.id, item.id, { scene: event.target.value }, updateDraft)} placeholder="摆放位置 / 使用场景" />
                      <label className={`placement-upload ${!canEditSelected ? "disabled" : ""}`}>
                        <ImageIcon size={14} />
                        {item.placementFileName || "位置照片"}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={!canEditSelected}
                          onChange={event => readPlacementImage(event.target.files?.[0], data => updateMaterial(selectedTask.id, item.id, data, updateDraft))}
                        />
                      </label>
                      <input disabled={!canEditSelected} value={item.notes} onChange={event => updateMaterial(selectedTask.id, item.id, { notes: event.target.value }, updateDraft)} placeholder="备注" />
                      <button disabled={!canEditSelected} onClick={() => updateDraft(selectedTask.id, items => items.filter(next => next.id !== item.id))}><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>

                <div className="field-editor-actions">
                  <button disabled={!canEditSelected} onClick={() => updateDraft(selectedTask.id, items => [...items, emptyItem()])}><Plus size={14} /> 添加一行</button>
                  {selectedDelivered && !canEditSelected ? (
                    <button className="primary" onClick={() => setEditingDeliveredTasks(prev => ({ ...prev, [selectedTask.id]: true }))}>重新编辑</button>
                  ) : (
                    <button className="primary" onClick={deliverTask}><Send size={14} /> {selectedDelivered ? "更新交付" : "交付给下一环"}</button>
                  )}
                </div>

                <div className="material-table-wrap">
                  <table className="material-table">
                    <thead>
                      <tr>
                        <th>设计缩略图</th>
                        <th>物料名称</th>
                        <th>尺寸 / 规格</th>
                        <th>数量</th>
                        <th>摆放位置</th>
                        <th>位置参考</th>
                        <th>备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.filter(item => item.name.trim()).map(item => {
                        const image = findMaterialImage(item, selectedTask, projectImages);
                        return (
                          <tr key={item.id}>
                            <td>{image ? <img src={image} alt={item.name} /> : <div className="thumb-empty"><ImageIcon size={16} /></div>}</td>
                            <td><b>{item.name}</b></td>
                            <td>{item.size || "-"}</td>
                            <td>{item.quantity || "-"}</td>
                            <td>{item.scene || "-"}</td>
                            <td>{item.placementImage ? <img src={item.placementImage} alt={`${item.name}位置参考`} /> : <div className="thumb-empty"><ImageIcon size={16} /></div>}</td>
                            <td>{item.notes || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="field-empty">当前项目暂无现场执行任务</div>
            )}
          </section>

          <aside className="field-panel field-result-panel">
            {selectedTask ? (
              <>
                <div className="result-panel-head">
                  <div>
                    <h2>设计交付结果</h2>
                    <p>查看下一环返回的设计图，并导出给广告公司</p>
                  </div>
                  {isDeliveryAccepted ? (
                    <button onClick={() => exportTaskSheet(currentProject.fullName, selectedTask, selectedItems, projectImages)}>
                      <Download size={15} /> 导出
                    </button>
                  ) : (
                    <button className="accept-button" disabled={!downstreamDeliveries.length} onClick={acceptDeliveryBatch}>
                      <CheckCircle2 size={15} /> 整体验收
                    </button>
                  )}
                </div>
                <section className="downstream-delivery">
                  <div className="result-material-table">
                    <h3>物料对接明细</h3>
                    <div className="material-table-wrap">
                      <table className="material-table compact">
                        <thead>
                          <tr>
                            <th>缩略图</th>
                            <th>物料</th>
                            <th>尺寸</th>
                            <th>位置</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedItems.filter(item => item.name.trim()).map(item => {
                            const image = findMaterialImage(item, selectedTask, projectImages);
                            return (
                              <tr key={item.id}>
                                <td>{image ? <img src={image} alt={item.name} /> : <div className="thumb-empty"><ImageIcon size={16} /></div>}</td>
                                <td><b>{item.name}</b><small>{item.quantity || "-"}</small></td>
                                <td>{item.size || "-"}</td>
                                <td>{item.scene || "-"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="delivery-head">
                    <div>
                      <h2>返回结果</h2>
                      <p>设计或下一岗位完成后会自动出现在这里</p>
                    </div>
                    <span>{downstreamDeliveries.length} 个结果</span>
                  </div>
                  {downstreamDeliveries.length ? (
                    <div className="delivery-grid">
                      {downstreamDeliveries.map(delivery => (
                        <button key={delivery.id} className={delivery.hasUpdate ? "has-update" : ""} onClick={() => openDeliveryPreview(delivery)}>
                          <img src={delivery.url} alt={delivery.title} />
                          {delivery.hasUpdate && <i />}
                          <b>{delivery.title}</b>
                          <span>{delivery.source} · {delivery.version}</span>
                          {delivery.status === "rejected" && <em className="needs-change">需修改</em>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="delivery-empty">下一环还没有交付结果，交付后会自动显示在这里。</div>
                  )}
                </section>
              </>
            ) : (
              <div className="field-empty">请选择一条现场任务</div>
            )}
          </aside>
        </div>
      </div>
      {previewDelivery && (
        <div className="delivery-preview-backdrop" onClick={() => {
          setFeedbackMaterialDraft(null);
          setPreviewDelivery(null);
        }}>
          <div className="delivery-preview-modal delivery-preview-split" onClick={event => event.stopPropagation()}>
            <button onClick={() => {
              setFeedbackMaterialDraft(null);
              setPreviewDelivery(null);
            }}>×</button>
            <div className="delivery-preview-image-pane">
              <img src={previewDelivery.url} alt={previewDelivery.title} />
            </div>
            <aside className="delivery-preview-form-pane">
              <div className="delivery-preview-meta">
                <b>{previewDelivery.title}</b>
                <span>{previewDelivery.source} · {previewDelivery.version}</span>
              </div>
              <div className="delivery-review-box">
                {feedbackMaterialDraft && (
                  <div className="delivery-material-change">
                    <label>同步调整尺寸</label>
                    <div className="delivery-size-row">
                      <span>{feedbackMaterialDraft.name || "物料"}</span>
                      <input value={feedbackMaterialDraft.size} onChange={event => setFeedbackMaterialDraft({ ...feedbackMaterialDraft, size: event.target.value })} placeholder="尺寸 / 规格" />
                    </div>
                  </div>
                )}
                <label>修改意见</label>
                <textarea
                  value={reviewNote}
                  onChange={event => setReviewNote(event.target.value)}
                  placeholder="例如：尺寸改成 50cm x 80cm，二维码需要再放大，主视觉标题向上移一点..."
                />
              </div>
              <div className="delivery-preview-actions">
                <button onClick={submitDeliveryFeedback}>
                  <MessageSquare size={14} /> 提交修改意见
                </button>
                <button onClick={() => {
                  setReviewNote("");
                  setFeedbackMaterialDraft(null);
                  setPreviewDelivery(null);
                }}>
                  仅查看
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}
    </main>
  );
}

function FieldTaskButton({
  task,
  allTasks,
  active,
  nextTasks,
  pendingAcceptance,
  onClick,
}: {
  task: Task;
  allTasks: Task[];
  active: boolean;
  nextTasks: Task[];
  pendingAcceptance?: boolean;
  onClick: () => void;
}) {
  const status = effectiveStatus(task, allTasks);
  const colors = statusStyle(status);
  return (
    <button className={`field-task-button ${active ? "active" : ""} ${pendingAcceptance ? "pending-acceptance" : ""}`} onClick={onClick}>
      <div>
        <b>{task.name}</b>
        <span style={{ background: pendingAcceptance ? "#fff7ed" : colors.bg, color: pendingAcceptance ? "#c2410c" : colors.text }}>
          {pendingAcceptance ? "待验收" : status}
        </span>
      </div>
      <p>{task.owner} · 截止 {task.deadline}</p>
      <small>{nextTasks.length ? `下一环：${nextTasks.map(next => next.role).join(" / ")}` : "未配置下一环"}</small>
    </button>
  );
}

function StatusStep({ label, active, done }: { label: string; active?: boolean; done?: boolean }) {
  return (
    <div className={`${active ? "active" : ""} ${done ? "done" : ""}`}>
      <i>{done ? <CheckCircle2 size={14} /> : <FileSpreadsheet size={14} />}</i>
      <span>{label}</span>
    </div>
  );
}

function defaultItemsForTask(task: Task | undefined): MaterialItem[] {
  if (!task) return [emptyItem()];
  if (task.resultMaterials?.length) return task.resultMaterials.map(item => ({ ...item }));
  if (/物料|尺寸|清单|桁架|展架/.test(task.name + task.desc)) return demoItems.map(item => ({ ...item }));
  return [emptyItem()];
}

function updateMaterial(
  taskId: string,
  itemId: string,
  patch: Partial<MaterialItem>,
  updateDraft: (taskId: string, updater: (items: MaterialItem[]) => MaterialItem[]) => void,
) {
  updateDraft(taskId, items => items.map(item => item.id === itemId ? { ...item, ...patch } : item));
}

function readPlacementImage(file: File | undefined, onReady: (patch: Partial<MaterialItem>) => void) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = event => {
    onReady({
      placementImage: String(event.target?.result ?? ""),
      placementFileName: file.name,
    });
  };
  reader.readAsDataURL(file);
}

function cleanMaterialHandoff(desc: string | undefined, upstreamTaskName: string) {
  if (!desc) return "";
  const marker = `上游任务「${upstreamTaskName}」已交付现场物料信息：`;
  const index = desc.indexOf(marker);
  return index >= 0 ? desc.slice(0, index).trim() : desc;
}

function findMaterialForDelivery(delivery: DeliveryItem, items: MaterialItem[]) {
  return items.find(item => item.id === delivery.materialItemId) ??
    items.find(item => delivery.title.includes(item.name) || item.name.includes(delivery.title));
}

function normalizeMaterialItem(item: MaterialItem): MaterialItem {
  return {
    ...item,
    name: item.name.trim(),
    size: item.size.trim(),
    quantity: item.quantity.trim(),
    scene: item.scene.trim(),
    notes: item.notes.trim(),
  };
}

function isMaterialChanged(before: MaterialItem, after: MaterialItem) {
  return before.name !== after.name ||
    before.size !== after.size ||
    before.quantity !== after.quantity ||
    before.scene !== after.scene ||
    before.notes !== after.notes;
}

function buildMaterialChangeNote(before: MaterialItem, after: MaterialItem) {
  const changes = [
    formatMaterialChange("物料名称", before.name, after.name),
    formatMaterialChange("尺寸/规格", before.size, after.size),
    formatMaterialChange("数量", before.quantity, after.quantity),
    formatMaterialChange("摆放位置", before.scene, after.scene),
    formatMaterialChange("备注", before.notes, after.notes),
  ].filter(Boolean);
  return changes.length ? `现场已同步修改物料需求：${changes.join("；")}` : "";
}

function formatMaterialChange(label: string, before: string, after: string) {
  return before === after ? "" : `${label}：${before || "-"} -> ${after || "-"}`;
}

function hasPendingAcceptance(task: Task, projectTasks: Task[], images: ProjectImage[], acceptedBatches: Record<string, boolean>) {
  const deliveries = getLatestDownstreamDeliveries(task, getNextTasks(task, projectTasks), images);
  const batchKey = `${task.id}:${deliveries.map(delivery => `${delivery.id}_${delivery.version}`).join("|")}`;
  return hasPendingDownstreamAcceptance(task, projectTasks, deliveries.length > 0, Boolean(acceptedBatches[batchKey]));
}

function buildMaterialResult(items: MaterialItem[]) {
  return items.map((item, index) => {
    const fields = [
      `${index + 1}. ${item.name}`,
      item.size ? `尺寸/规格：${item.size}` : "",
      item.quantity ? `数量：${item.quantity}` : "",
      item.scene ? `摆放位置/使用场景：${item.scene}` : "",
      item.placementFileName ? `位置参考图：${item.placementFileName}` : "",
      item.notes ? `备注：${item.notes}` : "",
    ].filter(Boolean);
    return fields.join("；");
  }).join("\n");
}

function findMaterialImage(item: MaterialItem, task: Task, images: ProjectImage[]) {
  return findLatestMaterialImage(item, task, images);
}

function exportTaskSheet(project: string, task: Task, items: MaterialItem[], projectImages: ProjectImage[]) {
  const validItems = items.filter(item => item.name.trim());
  const rows = validItems.map((item, index) => {
    const image = findMaterialImage(item, task, projectImages);
    return `<tr style="height:86px;mso-height-source:userset;">
      <td>${index + 1}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.size || "-")}</td>
      <td>${escapeHtml(item.quantity || "-")}</td>
      <td>${escapeHtml(item.scene || "-")}</td>
      <td class="thumb-cell">${item.placementImage ? `<img class="thumb-img" src="${item.placementImage}" width="112" height="76" />` : "无"}</td>
      <td class="thumb-cell">${image ? `<img class="thumb-img" src="${image}" width="112" height="76" />` : "待交付"}</td>
      <td>${escapeHtml(item.notes || "-")}</td>
    </tr>`;
  }).join("");

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; table-layout: fixed; font-family: Arial, "Microsoft YaHei", sans-serif; }
          tr { height: 86px; mso-height-source: userset; }
          thead tr { height: 30px; }
          th, td { border: 1px solid #D9E2F3; padding: 8px 10px; font-size: 12px; vertical-align: middle; overflow: hidden; }
          th { background: #EEF4FF; font-weight: 700; }
          .thumb-cell { width: 128px; height: 86px; padding: 5px 8px; text-align: center; vertical-align: middle; }
          .thumb-img { display: block; width: 112px; height: 76px; object-fit: cover; border-radius: 4px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <h2>${escapeHtml(project)} - ${escapeHtml(task.name)}</h2>
        <p>现场交付任务：${escapeHtml(task.name)}；导出时间：${new Date().toLocaleString()}</p>
        <table>
          <thead><tr><th>序号</th><th>物料名称</th><th>尺寸/规格</th><th>数量</th><th>摆放位置/使用场景</th><th>位置参考图</th><th>设计缩略图</th><th>备注</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${project}_${task.name}_物料对接表.xls`.replace(/[\\/:*?"<>|]/g, "_");
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char] ?? char));
}

const fieldCss = `
.field-workspace { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #f7f9fc; color: #111827; overflow: hidden; }
.field-content { flex: 1; overflow: auto; padding: 16px; }
.field-layout { display: grid; gap: 12px; align-items: start; }
.field-panel { background: #fff; border: 1px solid #e6ecf5; border-radius: 12px; overflow: hidden; }
.field-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px; border-bottom: 1px solid #eef2f7; }
.field-panel-head h2 { margin: 0; font-size: 16px; font-weight: 900; }
.field-panel-head p { margin: 5px 0 0; color: #667085; font-size: 12px; font-weight: 700; }
.field-task-list { display: flex; flex-direction: column; gap: 10px; padding: 12px; }
.field-task-button { display: block; width: 100%; padding: 14px; border: 1px solid #e6ecf5; border-radius: 10px; background: #fff; text-align: left; cursor: pointer; }
.field-task-button.active { border-color: #2563eb; background: #eff6ff; box-shadow: inset 3px 0 0 #2563eb; }
.field-task-button.pending-acceptance { border-color: #fb923c; background: #fff7ed; box-shadow: inset 3px 0 0 #f97316; }
.field-task-button.pending-acceptance.active { border-color: #f97316; background: #fff7ed; box-shadow: inset 3px 0 0 #ea580c, 0 0 0 2px rgba(249,115,22,.12); }
.field-task-button div { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.field-task-button b { color: #111827; font-size: 13px; font-weight: 900; }
.field-task-button span { padding: 3px 7px; border-radius: 7px; font-size: 11px; font-weight: 900; white-space: nowrap; }
.field-task-button p { margin: 10px 0 0; color: #667085; font-size: 12px; font-weight: 700; }
.field-task-button small { display: block; margin-top: 8px; color: #2563eb; font-size: 11px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.field-editor { min-height: 560px; display: flex; flex-direction: column; }
.field-editor .field-detail-head > button { display: none; }
.field-editor > .downstream-delivery { display: none; }
.field-editor > .material-table-wrap { display: none; }
.field-result-panel { align-self: start; }
.result-panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px; border-bottom: 1px solid #eef2f7; }
.result-panel-head h2 { margin: 0; color: #111827; font-size: 16px; font-weight: 900; }
.result-panel-head p { margin: 5px 0 0; color: #667085; font-size: 12px; font-weight: 700; line-height: 1.5; }
.result-panel-head button { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; border: 1px solid #2563eb; background: #2563eb; color: #fff; font-size: 12px; font-weight: 900; cursor: pointer; }
.result-panel-head button.accept-button { border-color: #f97316; background: #f97316; }
.result-panel-head button:disabled { border-color: #d0d5dd; background: #f2f4f7; color: #98a2b3; cursor: not-allowed; }
.field-detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 16px; }
.field-detail-head h1 { margin: 0; font-size: 20px; font-weight: 900; }
.field-detail-head p { margin: 6px 0 0; color: #667085; font-size: 12px; font-weight: 800; line-height: 1.7; }
.field-detail-head button,.field-editor-actions button,.paste-box button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; border: 1px solid #dbe6f5; background: #fff; color: #2563eb; font-size: 12px; font-weight: 900; cursor: pointer; }
.field-detail-head button,.field-editor-actions .primary { background: #2563eb; color: #fff; border-color: #2563eb; }
.field-status-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; padding: 0 16px 14px; }
.field-status-strip div { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 10px; border-radius: 9px; border: 1px solid #e6ecf5; background: #fbfcfe; color: #98a2b3; font-size: 12px; font-weight: 900; }
.field-status-strip div.active { color: #2563eb; border-color: #bfdbfe; background: #eff6ff; }
.field-status-strip div.done { color: #027a48; border-color: #abefc6; background: #ecfdf3; }
.field-status-strip i { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 999px; background: #fff; font-style: normal; }
.chain-note { display: flex; gap: 10px; align-items: center; margin: 0 16px 14px; padding: 10px 12px; border: 1px solid #bfdbfe; border-radius: 9px; background: #eff6ff; font-size: 12px; }
.chain-note b { color: #2563eb; white-space: nowrap; }
.chain-note span { color: #344054; font-weight: 800; }
.downstream-delivery { order: 20; margin: 0 16px 16px; border: 1px solid #e6ecf5; border-radius: 10px; overflow: hidden; background: #fff; }
.field-result-panel .downstream-delivery { display: block; margin: 0; border: 0; border-radius: 0; }
.delivery-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; border-bottom: 1px solid #eef2f7; background: #fbfcfe; }
.delivery-head h2 { margin: 0; color: #111827; font-size: 14px; font-weight: 900; }
.delivery-head p { margin: 4px 0 0; color: #667085; font-size: 12px; font-weight: 700; }
.delivery-head span { flex-shrink: 0; padding: 4px 8px; border-radius: 999px; background: #ecfdf3; color: #027a48; font-size: 11px; font-weight: 900; }
.delivery-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; padding: 12px; }
.field-result-panel .delivery-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); max-height: 320px; overflow: auto; }
.delivery-grid button { display: block; min-width: 0; padding: 6px; border: 1px solid #e6ecf5; border-radius: 9px; text-decoration: none; color: inherit; background: #fff; text-align: left; cursor: pointer; }
.delivery-grid button { position: relative; }
.delivery-grid button:hover { border-color: #93c5fd; background: #eff6ff; }
.delivery-grid button.has-update { border-color: #fecaca; box-shadow: 0 0 0 2px rgba(239,68,68,.08); }
.delivery-grid button i { position: absolute; right: 7px; top: 7px; width: 8px; height: 8px; border-radius: 999px; background: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,.16); }
.delivery-grid img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 7px; background: #f3f4f6; }
.delivery-grid b { display: block; margin-top: 6px; color: #111827; font-size: 11px; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.delivery-grid span { display: block; margin-top: 3px; color: #667085; font-size: 10px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.delivery-grid em { display: inline-flex; margin-top: 5px; padding: 2px 6px; border-radius: 999px; background: #fff1f2; color: #e11d48; font-size: 10px; font-style: normal; font-weight: 900; }
.delivery-grid em.needs-change { background: #fef3c7; color: #b45309; }
.delivery-empty { padding: 18px 12px; color: #98a2b3; font-size: 13px; font-weight: 800; text-align: center; }
.result-material-table { border-bottom: 1px solid #eef2f7; }
.result-material-table h3 { margin: 0; padding: 12px 12px 0; color: #111827; font-size: 13px; font-weight: 900; }
.field-result-panel .material-table-wrap { padding: 10px 12px 12px; max-height: 290px; overflow: auto; }
.material-table.compact { min-width: 0; }
.material-table.compact th,.material-table.compact td { padding: 8px 6px; font-size: 11px; }
.material-table.compact img,.material-table.compact .thumb-empty { width: 46px; height: 34px; border-radius: 6px; }
.material-table.compact td b { display: block; font-size: 12px; }
.material-table.compact td small { display: block; margin-top: 3px; color: #667085; font-size: 10px; font-weight: 800; }
.field-label { display: block; margin-bottom: 7px; color: #344054; font-size: 12px; font-weight: 900; }
.paste-box { display: grid; grid-template-columns: 170px minmax(260px, 1fr) 120px; gap: 10px; align-items: end; margin: 0 16px 14px; padding: 12px; border: 1px solid #e6ecf5; border-radius: 10px; background: #fbfcfe; }
.paste-box p { margin: 0; color: #667085; font-size: 11px; line-height: 1.5; }
.paste-box textarea { height: 74px; padding: 10px; border: 1px solid #dbe6f5; border-radius: 8px; outline: 0; resize: vertical; font-size: 13px; }
.paste-box textarea:disabled,.paste-box button:disabled,.edit-material-row input:disabled,.edit-material-row button:disabled,.field-editor-actions button:disabled { cursor: not-allowed; opacity: .62; }
.edit-material-list { display: flex; flex-direction: column; gap: 8px; padding: 0 16px; }
.edit-material-row { display: grid; grid-template-columns: 34px 1.05fr .95fr .62fr .9fr .9fr .9fr 34px; gap: 8px; align-items: center; }
.edit-material-row span { display: grid; place-items: center; height: 34px; border-radius: 8px; background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 900; }
.edit-material-row input { height: 34px; min-width: 0; padding: 0 9px; border: 1px solid #dbe6f5; border-radius: 8px; outline: 0; font-size: 12px; }
.edit-material-row button { height: 34px; border: 1px solid #fee2e2; border-radius: 8px; background: #fff5f5; color: #ef4444; cursor: pointer; }
.placement-upload { height: 34px; min-width: 0; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0 8px; border: 1px dashed #bfdbfe; border-radius: 8px; background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 900; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.placement-upload.disabled { cursor: not-allowed; opacity: .62; }
.placement-upload input { display: none; }
.field-editor-actions { display: flex; justify-content: space-between; gap: 10px; padding: 14px 16px; }
.material-table-wrap { padding: 0 16px 16px; overflow: auto; }
.material-table { width: 100%; min-width: 820px; border-collapse: collapse; }
.material-table th,.material-table td { border-bottom: 1px solid #eef2f7; padding: 10px; color: #344054; font-size: 12px; text-align: left; vertical-align: middle; }
.material-table th { color: #667085; font-size: 11px; font-weight: 900; background: #fbfcfe; }
.material-table td b { color: #111827; font-size: 13px; }
.material-table img,.thumb-empty { width: 72px; height: 48px; border-radius: 7px; object-fit: cover; background: #f3f4f6; }
.thumb-empty { display: grid; place-items: center; color: #98a2b3; border: 1px dashed #cbd5e1; }
.field-empty { min-height: 360px; display: grid; place-items: center; color: #98a2b3; font-weight: 900; }
.delivery-preview-backdrop { position: fixed; inset: 0; z-index: 180; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(15,23,42,.46); backdrop-filter: blur(4px); }
.delivery-preview-modal { position: relative; width: min(760px, calc(100vw - 32px)); max-height: calc(100vh - 48px); background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 24px 80px rgba(15,23,42,.24); }
.delivery-preview-modal.delivery-preview-split { width: min(1080px, calc(100vw - 32px)); height: min(680px, calc(100vh - 48px)); display: grid; grid-template-columns: minmax(0, 1.35fr) 380px; }
.delivery-preview-modal > button { position: absolute; right: 12px; top: 12px; width: 34px; height: 34px; border-radius: 999px; border: 1px solid #e6ecf5; background: #fff; color: #344054; font-size: 20px; cursor: pointer; z-index: 1; }
.delivery-preview-image-pane { min-width: 0; min-height: 0; display: grid; place-items: center; background: #111827; }
.delivery-preview-image-pane img { width: 100%; height: 100%; object-fit: contain; }
.delivery-preview-form-pane { min-width: 0; min-height: 0; display: flex; flex-direction: column; background: #fff; }
.delivery-preview-meta { padding: 18px 18px 14px; display: flex; flex-direction: column; gap: 6px; border-bottom: 1px solid #eef2f7; }
.delivery-preview-modal b { color: #111827; font-size: 14px; font-weight: 900; }
.delivery-preview-modal span { color: #667085; font-size: 12px; font-weight: 800; }
.delivery-review-box { flex: 1; min-height: 0; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; overflow: auto; }
.delivery-review-box label { color: #344054; font-size: 12px; font-weight: 900; }
.delivery-review-box textarea { flex: 1; min-height: 140px; padding: 10px; border: 1px solid #dbe6f5; border-radius: 8px; outline: 0; resize: vertical; font-size: 13px; }
.delivery-material-change { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid #e6ecf5; border-radius: 10px; background: #fbfcfe; }
.delivery-size-row { display: grid; grid-template-columns: minmax(96px, .8fr) minmax(140px, 1.2fr); gap: 8px; align-items: center; }
.delivery-size-row > span { min-width: 0; height: 32px; display: flex; align-items: center; padding: 0 10px; border-radius: 8px; background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.delivery-material-change input { min-width: 0; height: 32px; padding: 0 9px; border: 1px solid #dbe6f5; border-radius: 8px; outline: 0; font-size: 12px; }
.delivery-preview-actions { flex-shrink: 0; display: flex; justify-content: flex-end; gap: 8px; padding: 14px 18px; border-top: 1px solid #eef2f7; background: #fff; }
.delivery-preview-actions button { position: static; width: auto; height: 32px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; border: 1px solid #dbe6f5; background: #fff; color: #2563eb; font-size: 12px; font-weight: 900; cursor: pointer; }
.delivery-preview-actions button:first-child { border-color: #f97316; background: #f97316; color: #fff; }
@media (max-width: 980px) {
  .field-content { padding: 10px; }
  .field-status-strip { grid-template-columns: 1fr 1fr; }
  .delivery-grid { grid-template-columns: 1fr 1fr; }
  .delivery-preview-modal.delivery-preview-split { grid-template-columns: 1fr; height: min(760px, calc(100vh - 24px)); }
  .delivery-preview-image-pane { min-height: 280px; }
  .delivery-size-row { grid-template-columns: 1fr; }
  .paste-box { grid-template-columns: 1fr; }
  .edit-material-row { grid-template-columns: 28px 1fr; }
  .edit-material-row input,.edit-material-row button,.placement-upload { grid-column: 2; }
}
`;

