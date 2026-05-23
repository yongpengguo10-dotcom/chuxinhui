import React, { useState, useMemo } from "react";
import {
  Menu, Search, Folder, Image as ImageIcon, ChevronRight,
  Upload, Filter, Download, Trash2, Eye, DownloadCloud
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { PageShell } from "../components/PageShell";

export const COMMON_CATEGORIES = [
  { id: "brand", name: "公司品牌图" },
  { id: "qrcode", name: "通用二维码" },
  { id: "lecturer", name: "固定讲师图" },
  { id: "bg", name: "通用背景图" },
  { id: "other", name: "其他物料" },
];

export interface CommonImage {
  id: string;
  categoryId: string;
  title: string;
  url: string;
  uploadTime: string;
  size: string;
}

const MOCK_COMMON_IMAGES: CommonImage[] = [
  { id: "c_1", categoryId: "brand", title: "众创截拳道-主Logo(亮色)", url: "https://images.unsplash.com/photo-1620288627223-53302f4e8c74?auto=format&fit=crop&q=80&w=600", uploadTime: "2026-01-10", size: "1.2 MB" },
  { id: "c_2", categoryId: "brand", title: "众创截拳道-主Logo(暗色)", url: "https://images.unsplash.com/photo-1620288627223-53302f4e8c74?auto=format&fit=crop&q=80&w=600", uploadTime: "2026-01-10", size: "1.1 MB" },
  { id: "c_3", categoryId: "qrcode", title: "官方公众号二维码", url: "https://images.unsplash.com/photo-1600147131759-880e94a6185f?auto=format&fit=crop&q=80&w=600", uploadTime: "2026-02-15", size: "450 KB" },
  { id: "c_4", categoryId: "lecturer", title: "张老师-半身职业照", url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600", uploadTime: "2026-03-05", size: "2.4 MB" },
  { id: "c_5", categoryId: "bg", title: "浅色极简背景图A", url: "https://images.unsplash.com/photo-1518972734183-c5b490a7c637?auto=format&fit=crop&q=80&w=600", uploadTime: "2026-04-20", size: "3.1 MB" },
];

interface CommonImageLibraryProps {
  isMobile: boolean;
  onOpenDrawer: () => void;
  showToast: (msg: string) => void;
}

export function CommonImageLibrary({ isMobile, onOpenDrawer, showToast }: CommonImageLibraryProps) {
  const [images, setImages] = useState<CommonImage[]>(MOCK_COMMON_IMAGES);
  const [selectedCategory, setSelectedCategory] = useState<string>("brand");
  const [searchQuery, setSearchQuery] = useState("");

  const displayImages = useMemo(() => {
    let list = images.filter(img => img.categoryId === selectedCategory);
    if (searchQuery) {
      list = list.filter(img => img.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list;
  }, [images, selectedCategory, searchQuery]);

  return (
    <div className="flex h-full w-full" style={{ background: "#F8F6EF" }}>
      {/* Sidebar Navigation */}
      {!isMobile && (
        <aside className="h-full flex flex-col" style={{ width: 240, minWidth: 240, background: "#FAFAF8", borderRight: "1px solid #E8E3D8" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #EDE9DF" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#141414" }}>通用素材导航</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
            {COMMON_CATEGORIES.map(cat => {
              const isActive = selectedCategory === cat.id;
              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                  style={{ 
                    background: isActive ? "#FFF4C7" : "transparent",
                    color: isActive ? "#8A6500" : "#555",
                    border: `1px solid ${isActive ? "#F4C542" : "transparent"}`
                  }}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <Folder size={16} color={isActive ? "#8A6500" : "#AAAAAA"} />
                  <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 500 }}>{cat.name}</span>
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
                  <span>素材库</span>
                  <ChevronRight size={10} />
                  <span className="text-[#8A6500]">{COMMON_CATEGORIES.find(c => c.id === selectedCategory)?.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900">
                    {COMMON_CATEGORIES.find(c => c.id === selectedCategory)?.name}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#F8F6EF", border: "1px solid #E8E3D8" }}>
                    共 {displayImages.length} 项
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索素材名称..."
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
                onClick={() => showToast("通用素材上传请联系管理员")}
              >
                <Upload size={14} />
                上传素材
              </button>
            </div>
          </div>
        </header>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin" }}>
          {displayImages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ImageIcon size={48} className="mb-4 text-gray-300" />
              <p>暂无素材</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {displayImages.map(img => (
                <div 
                  key={img.id} 
                  className="group flex flex-col bg-white rounded-xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
                  style={{ border: "1px solid #E8E3D8" }}
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden flex items-center justify-center">
                    <ImageWithFallback 
                      src={img.url} 
                      alt={img.title} 
                      className="w-full h-full object-contain"
                    />
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button className="bg-white text-gray-900 p-2 rounded-full hover:bg-[#F4C542] transition-colors" title="预览大图">
                        <Eye size={16} />
                      </button>
                      <button className="bg-white text-gray-900 p-2 rounded-full hover:bg-[#F4C542] transition-colors" title="下载" onClick={() => showToast(`正在下载 ${img.title}`)}>
                        <DownloadCloud size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-[13px] font-bold text-gray-900 truncate mb-1" title={img.title}>
                      {img.title}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>{img.size}</span>
                      <span>{img.uploadTime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
