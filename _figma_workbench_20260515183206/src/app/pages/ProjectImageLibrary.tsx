import React, { useState, useMemo } from "react";
import {
  Menu, Search, Folder, FolderOpen, Image as ImageIcon, ChevronRight, ChevronDown,
  Upload, Filter, Download, Trash2, CheckCircle2, Clock, X, Plus, History, MoreVertical,
  Eye, UploadCloud, FileText, Check
} from "lucide-react";
import { Project } from "../data/projects";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export const CATEGORIES = [
  { id: "poster", name: "海报" },
  { id: "moments", name: "朋友圈图" },
  { id: "long", name: "长图" },
  { id: "qrcode", name: "二维码" },
  { id: "field", name: "现场照" },
  { id: "other", name: "其他" },
];

export interface ImageVersion {
  id: string;
  url: string;
  versionStr: string;
  uploadedBy: string;
  sourceTask: string;
  status: "approved" | "pending" | "rejected";
  uploadTime: string;
  notes?: string;
}

export interface ProjectImage {
  id: string;
  projectId: string;
  categoryId: string;
  title: string;
  versions: ImageVersion[];
}

// Mock Data
export const MOCK_IMAGES: ProjectImage[] = [
  {
    id: "img_1",
    projectId: "p_jkd_2605",
    categoryId: "poster",
    title: "主视觉海报-终稿",
    versions: [
      {
        id: "v1", url: "https://images.unsplash.com/photo-1543487945-139a97f387d5?auto=format&fit=crop&q=80&w=600",
        versionStr: "V1", uploadedBy: "设计-王莉", sourceTask: "主视觉海报设计", status: "rejected", uploadTime: "2026-05-10 14:30", notes: "颜色太暗，需调整"
      },
      {
        id: "v2", url: "https://images.unsplash.com/photo-1520588451467-4c904eb6d035?auto=format&fit=crop&q=80&w=600",
        versionStr: "V2", uploadedBy: "设计-王莉", sourceTask: "主视觉海报设计", status: "approved", uploadTime: "2026-05-11 09:15", notes: "已按要求调亮并修改字体"
      }
    ]
  },
  {
    id: "img_2",
    projectId: "p_jkd_2605",
    categoryId: "field",
    title: "5月14日现场大合照",
    versions: [
      {
        id: "v1", url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80&w=600",
        versionStr: "V1", uploadedBy: "现场-刘备", sourceTask: "现场照片回传", status: "approved", uploadTime: "2026-05-14 18:00"
      }
    ]
  },
  {
    id: "img_3",
    projectId: "p_zs_05",
    categoryId: "moments",
    title: "讲师金句朋友圈图1",
    versions: [
      {
        id: "v1", url: "https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=600",
        versionStr: "V1", uploadedBy: "设计-张明", sourceTask: "朋友圈九宫格设计", status: "pending", uploadTime: "2026-05-13 16:45"
      }
    ]
  },
  {
    id: "img_4",
    projectId: "p_jkd_2605",
    categoryId: "qrcode",
    title: "活动专属报名二维码",
    versions: [
      {
        id: "v1", url: "https://images.unsplash.com/photo-1600147131759-880e94a6185f?auto=format&fit=crop&q=80&w=600",
        versionStr: "V1", uploadedBy: "运营-周敏", sourceTask: "生成报名码", status: "approved", uploadTime: "2026-05-08 10:00"
      }
    ]
  }
];

interface ProjectImageLibraryProps {
  projects: Project[];
  images: ProjectImage[];
  setImages: React.Dispatch<React.SetStateAction<ProjectImage[]>>;
  isMobile: boolean;
  onOpenDrawer: () => void;
  showToast: (msg: string) => void;
}

export function ProjectImageLibrary({ projects, images, setImages, isMobile, onOpenDrawer, showToast }: ProjectImageLibraryProps) {
  // Tree state: series -> project -> category
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set([projects[0]?.series]));
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set([projects[0]?.id]));
  
  // Selection state
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(projects[0]?.id || null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>("poster");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [viewImage, setViewImage] = useState<ProjectImage | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"new_image" | "new_version">("new_image");
  const [newImageTitle, setNewImageTitle] = useState("");
  const [newVersionNotes, setNewVersionNotes] = useState("");

  // Group projects by series
  const seriesMap = useMemo(() => {
    const map = new Map<string, Project[]>();
    projects.forEach(p => {
      if (!map.has(p.series)) map.set(p.series, []);
      map.get(p.series)!.push(p);
    });
    return map;
  }, [projects]);

  const toggleSeries = (s: string) => {
    setExpandedSeries(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const toggleProject = (pid: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  };

  const handleSelectNav = (s: string, p: string, c: string) => {
    setSelectedSeries(s);
    setSelectedProject(p);
    setSelectedCategory(c);
    if (!expandedSeries.has(s)) toggleSeries(s);
    if (!expandedProjects.has(p)) toggleProject(p);
  };

  const displayImages = useMemo(() => {
    let list = images;
    if (selectedProject) list = list.filter(img => img.projectId === selectedProject);
    else if (selectedSeries) {
      const projIds = seriesMap.get(selectedSeries)?.map(x => x.id) || [];
      list = list.filter(img => projIds.includes(img.projectId));
    }
    
    if (selectedCategory) list = list.filter(img => img.categoryId === selectedCategory);
    
    if (searchQuery) {
      list = list.filter(img => img.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list;
  }, [images, selectedProject, selectedSeries, selectedCategory, searchQuery, seriesMap]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return { bg: "#ECFCCB", text: "#166534", border: "#86EFAC", label: "已定稿" };
      case "pending": return { bg: "#FEF08A", text: "#854D0E", border: "#FDE047", label: "待审核" };
      case "rejected": return { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA", label: "需修改" };
      default: return { bg: "#F3F4F6", text: "#374151", border: "#D1D5DB", label: "未知" };
    }
  };

  const handleUploadSubmit = () => {
    if (uploadType === "new_image") {
      if (!newImageTitle.trim()) {
        showToast("请输入图片名称");
        return;
      }
      const newImg: ProjectImage = {
        id: `img_${Date.now()}`,
        projectId: selectedProject || projects[0].id,
        categoryId: selectedCategory || "poster",
        title: newImageTitle,
        versions: [{
          id: `v1`,
          url: "https://images.unsplash.com/photo-1543487945-139a97f387d5?auto=format&fit=crop&q=80&w=600",
          versionStr: "V1",
          uploadedBy: "当前用户",
          sourceTask: "手动上传",
          status: "pending",
          uploadTime: new Date().toISOString().slice(0, 16).replace("T", " "),
          notes: newVersionNotes
        }]
      };
      setImages(prev => [newImg, ...prev]);
      showToast("新图片上传成功");
    } else if (uploadType === "new_version" && viewImage) {
      const nextVerNum = viewImage.versions.length + 1;
      const newVer: ImageVersion = {
        id: `v${nextVerNum}`,
        url: "https://images.unsplash.com/photo-1543487945-139a97f387d5?auto=format&fit=crop&q=80&w=600",
        versionStr: `V${nextVerNum}`,
        uploadedBy: "当前用户",
        sourceTask: "迭代修改",
        status: "pending",
        uploadTime: new Date().toISOString().slice(0, 16).replace("T", " "),
        notes: newVersionNotes
      };
      
      const updatedImg = { ...viewImage, versions: [...viewImage.versions, newVer] };
      setImages(prev => prev.map(img => img.id === viewImage.id ? updatedImg : img));
      setViewImage(updatedImg);
      showToast(`已上传版本 V${nextVerNum}`);
    }
    
    setUploadModalOpen(false);
    setNewImageTitle("");
    setNewVersionNotes("");
  };

  const handleUpdateVersionStatus = (verId: string, status: "approved" | "rejected") => {
    if (!viewImage) return;
    const updatedImg = {
      ...viewImage,
      versions: viewImage.versions.map(v => v.id === verId ? { ...v, status } : v)
    };
    setImages(prev => prev.map(img => img.id === viewImage.id ? updatedImg : img));
    setViewImage(updatedImg);
    showToast(status === "approved" ? "已定稿当前版本" : "已驳回当前版本");
  };

  return (
    <div className="flex h-full w-full" style={{ background: "#F8F6EF" }}>
      {/* Sidebar Navigation */}
      {!isMobile && (
        <aside className="h-full flex flex-col" style={{ width: 280, minWidth: 280, background: "#FAFAF8", borderRight: "1px solid #E8E3D8" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #EDE9DF" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#141414" }}>图片库导航</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "thin" }}>
            {Array.from(seriesMap.entries()).map(([series, projs]) => {
              const sExpanded = expandedSeries.has(series);
              return (
                <div key={series} className="mb-2">
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{ background: sExpanded ? "#F0EDE4" : "transparent" }}
                    onClick={() => toggleSeries(series)}
                  >
                    {sExpanded ? <ChevronDown size={14} color="#555" /> : <ChevronRight size={14} color="#555" />}
                    <Folder size={14} color="#8A6500" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#141414" }}>{series}</span>
                  </div>
                  
                  {sExpanded && (
                    <div className="ml-5 mt-1 border-l border-[#E8E3D8] pl-2 flex flex-col gap-1">
                      {projs.map(p => {
                        const pExpanded = expandedProjects.has(p.id);
                        return (
                          <div key={p.id}>
                            <div
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                              style={{ background: pExpanded ? "#F8F6EF" : "transparent" }}
                              onClick={() => toggleProject(p.id)}
                            >
                              {pExpanded ? <FolderOpen size={13} color="#F4C542" /> : <Folder size={13} color="#AAAAAA" />}
                              <span style={{ fontSize: 12, color: "#333", fontWeight: pExpanded ? 600 : 400 }}>{p.name}</span>
                            </div>
                            
                            {pExpanded && (
                              <div className="ml-4 mt-1 flex flex-col gap-0.5">
                                {CATEGORIES.map(cat => {
                                  const isActive = selectedProject === p.id && selectedCategory === cat.id;
                                  return (
                                    <div
                                      key={cat.id}
                                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                                      style={{ 
                                        background: isActive ? "#FFF4C7" : "transparent",
                                        color: isActive ? "#8A6500" : "#555"
                                      }}
                                      onClick={() => handleSelectNav(series, p.id, cat.id)}
                                    >
                                      <ImageIcon size={12} />
                                      <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400 }}>{cat.name}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 flex-shrink-0" style={{ background: "#FFFFFF", borderBottom: "1px solid #E8E3D8" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {isMobile && (
                <button onClick={onOpenDrawer} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                  <Menu size={20} />
                </button>
              )}
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-1">
                  <span>{selectedSeries || "所有系列"}</span>
                  <ChevronRight size={10} />
                  <span>{projects.find(p => p.id === selectedProject)?.name || "所有场次"}</span>
                  <ChevronRight size={10} />
                  <span className="text-[#8A6500]">{CATEGORIES.find(c => c.id === selectedCategory)?.name || "所有分类"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900">
                    {CATEGORIES.find(c => c.id === selectedCategory)?.name || "图片列表"}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#F8F6EF", border: "1px solid #E8E3D8" }}>
                    共 {displayImages.length} 张
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索图片名称..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 rounded-full text-sm outline-none w-64 transition-colors"
                  style={{ background: "#F8F6EF", border: "1px solid #E8E3D8" }}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = "#F4C542"}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = "#E8E3D8"}
                />
              </div>
              <button 
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors hover:bg-[#E8B830]"
                style={{ background: "#F4C542", color: "#141414" }}
                onClick={() => {
                  setUploadType("new_image");
                  setUploadModalOpen(true);
                }}
              >
                <Upload size={14} />
                上传图片
              </button>
            </div>
          </div>
          
          {/* Action Bar */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-gray-200 hover:bg-gray-50">
              <Filter size={13} />
              筛选状态
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-gray-200 hover:bg-gray-50">
              <Download size={13} />
              批量下载
            </button>
          </div>
        </header>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin" }}>
          {displayImages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ImageIcon size={48} className="mb-4 text-gray-300" />
              <p>暂无图片，点击右上角上传</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {displayImages.map(img => {
                const currentVer = img.versions[img.versions.length - 1];
                const statusInfo = getStatusColor(currentVer.status);
                
                return (
                  <div 
                    key={img.id} 
                    className="group flex flex-col bg-white rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
                    style={{ border: "1px solid #E8E3D8" }}
                    onClick={() => setViewImage(img)}
                  >
                    <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                      <ImageWithFallback 
                        src={currentVer.url} 
                        alt={img.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white backdrop-blur-sm">
                        {currentVer.versionStr}
                      </div>
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium" 
                           style={{ background: statusInfo.bg, color: statusInfo.text, border: `1px solid ${statusInfo.border}` }}>
                        {statusInfo.label}
                      </div>
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white text-gray-900 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Eye size={14} />
                          查看版本
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-gray-900 truncate mb-1" title={img.title}>
                        {img.title}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="truncate max-w-[100px]">{currentVer.uploadedBy}</span>
                        <span>{currentVer.uploadTime.split(" ")[0]}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Image Detail / Version History Drawer */}
      {viewImage && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setViewImage(null)}
          />
          <div 
            className="fixed top-0 right-0 bottom-0 z-50 bg-white shadow-2xl flex flex-col transition-transform"
            style={{ width: 450, maxWidth: "100vw" }}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{viewImage.title}</h2>
              <button onClick={() => setViewImage(null)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="p-5">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-6 relative border border-gray-200">
                  <ImageWithFallback 
                    src={viewImage.versions[viewImage.versions.length - 1].url} 
                    alt="当前版本"
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <History size={16} className="text-[#F4C542]" />
                    版本记录 ({viewImage.versions.length})
                  </h3>
                  <button 
                    className="text-xs font-bold text-[#8A6500] bg-[#FFF4C7] hover:bg-[#F4C542] hover:text-[#141414] transition-colors px-2.5 py-1 rounded-md"
                    onClick={() => {
                      setUploadType("new_version");
                      setUploadModalOpen(true);
                    }}
                  >
                    上传新版本
                  </button>
                </div>

                <div className="relative border-l-2 border-gray-100 ml-3 pl-5 pb-4 flex flex-col gap-6">
                  {viewImage.versions.slice().reverse().map((ver, idx) => {
                    const isLatest = idx === 0;
                    const statusInfo = getStatusColor(ver.status);
                    
                    return (
                      <div key={ver.id} className="relative">
                        <div className="absolute -left-[27px] top-1 w-[11px] h-[11px] rounded-full bg-white border-2" 
                             style={{ borderColor: isLatest ? "#F4C542" : "#D1D5DB" }} />
                        
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-sm">{ver.versionStr}</span>
                              {isLatest && <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded">最新</span>}
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" 
                                  style={{ background: statusInfo.bg, color: statusInfo.text }}>
                              {statusInfo.label}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-y-2 text-xs text-gray-500 mb-2">
                            <div><span className="text-gray-400">上传人：</span>{ver.uploadedBy}</div>
                            <div><span className="text-gray-400">时间：</span>{ver.uploadTime}</div>
                            <div className="col-span-2"><span className="text-gray-400">来源任务：</span>{ver.sourceTask}</div>
                            {ver.notes && (
                              <div className="col-span-2 text-gray-700 bg-white p-2 rounded border border-gray-100 mt-1">
                                <span className="text-gray-400 font-medium">备注：</span>{ver.notes}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                            {ver.status === "pending" && (
                              <>
                                <button onClick={() => handleUpdateVersionStatus(ver.id, "approved")} className="flex-1 py-1.5 text-xs font-bold text-[#166534] bg-[#ECFCCB] hover:bg-[#D9F99D] border border-[#86EFAC] rounded transition-colors">
                                  通过并定稿
                                </button>
                                <button onClick={() => handleUpdateVersionStatus(ver.id, "rejected")} className="flex-1 py-1.5 text-xs font-bold text-[#991B1B] bg-[#FEE2E2] hover:bg-[#FECACA] border border-[#FECACA] rounded transition-colors">
                                  驳回修改
                                </button>
                              </>
                            )}
                            {ver.status !== "pending" && (
                              <>
                                <button className="flex-1 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50">
                                  查看大图
                                </button>
                                <button className="flex-1 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50">
                                  下载此版
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button 
                className="flex-1 py-2 bg-white border border-gray-200 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50"
                onClick={() => {
                  setImages(prev => prev.filter(img => img.id !== viewImage.id));
                  setViewImage(null);
                  showToast("已删除该图片");
                }}
              >
                删除图片
              </button>
              <button 
                className="flex-1 py-2 text-sm font-bold rounded-lg text-gray-900 hover:bg-[#E8B830] transition-colors"
                style={{ background: "#F4C542" }}
                onClick={() => showToast("已应用此版本至相关任务")}
              >
                应用最新版
              </button>
            </div>
          </div>
        </>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-[#141414]/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[#EDE9DF] bg-[#FAFAF8]">
              <h3 className="text-[15px] font-bold text-[#141414]">
                {uploadType === "new_image" ? "上传新图片" : "上传新版本"}
              </h3>
              <button onClick={() => setUploadModalOpen(false)} className="p-1 hover:bg-[#E8E3D8] rounded-md transition-colors text-[#999]">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              {uploadType === "new_image" && (
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-bold text-[#555]">图片名称 (必填)</label>
                  <input 
                    value={newImageTitle}
                    onChange={e => setNewImageTitle(e.target.value)}
                    placeholder="如：倒计时1天海报"
                    className="w-full px-3 py-2 rounded-lg border border-[#EDE9DF] text-[13px] outline-none focus:border-[#F4C542] focus:bg-[#FFFDF0] transition-colors"
                  />
                </div>
              )}

              <div className="border-2 border-dashed border-[#D0C8B0] rounded-xl p-6 flex flex-col items-center justify-center gap-2 bg-[#FAFAF8] hover:bg-[#FFFDF0] hover:border-[#F4C542] transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-[#FFF9E6] flex items-center justify-center text-[#8A6500]">
                  <UploadCloud size={20} />
                </div>
                <div className="text-[13px] font-bold text-[#141414]">点击或拖拽上传文件</div>
                <div className="text-[11px] text-[#999]">支持 JPG, PNG，不超过 20MB</div>
              </div>

              {uploadType === "new_version" && (
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-bold text-[#555]">修改备注 (选填)</label>
                  <textarea 
                    value={newVersionNotes}
                    onChange={e => setNewVersionNotes(e.target.value)}
                    placeholder="例如：已按要求调亮了背景"
                    className="w-full px-3 py-2 rounded-lg border border-[#EDE9DF] text-[13px] outline-none focus:border-[#F4C542] focus:bg-[#FFFDF0] transition-colors resize-none h-20"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#EDE9DF] flex justify-end gap-2 bg-[#FAFAF8]">
              <button 
                onClick={() => setUploadModalOpen(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-bold text-[#555] hover:bg-[#E8E3D8] transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleUploadSubmit}
                className="px-4 py-2 rounded-lg text-[13px] font-bold bg-[#141414] text-white hover:bg-[#333] transition-colors flex items-center gap-1.5"
              >
                <Check size={14} /> 确认上传
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
