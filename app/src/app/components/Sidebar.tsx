import { useState, useRef, useEffect } from "react";
import {
  Users, FolderOpen, ImagePlus, Table2, Lock, LogOut, ChevronUp, ChevronDown, Plus, Check, X, Trash2, Upload, FileSpreadsheet,
} from "lucide-react";

interface SidebarProps {
  activeNav: string;
  onNavChange: (nav: string) => void;
  filterCategory: string;
  onCategoryChange: (cat: string) => void;
  categories: string[];
  onDeleteCategory: (cat: string) => void;
  onAddCategory: (cat: string) => void;
}

const NAV_ITEMS = [
  { label: "人员目录", icon: Users },
  { label: "分类列表", icon: FolderOpen },
  { label: "批量导入图片", icon: ImagePlus },
  { label: "导入职称表", icon: Table2 },
];

export function Sidebar({ activeNav, onNavChange, filterCategory, onCategoryChange, categories, onDeleteCategory, onAddCategory }: SidebarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const [importTableOpen, setImportTableOpen] = useState(false);
  const [batchImportFile, setBatchImportFile] = useState<FileList | null>(null);
  const [tableImportFile, setTableImportFile] = useState<File | null>(null);
  const [batchImporting, setBatchImporting] = useState(false);
  const [tableImporting, setTableImporting] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const tableInputRef = useRef<HTMLInputElement>(null);

  const handleBatchImportStart = () => {
    if (!batchImportFile || batchImportFile.length === 0) {
      imgInputRef.current?.click();
      return;
    }
    setBatchImporting(true);
    setTimeout(() => { setBatchImporting(false); setBatchImportOpen(false); setBatchImportFile(null); }, 1500);
  };

  const handleTableImportStart = () => {
    if (!tableImportFile) {
      tableInputRef.current?.click();
      return;
    }
    setTableImporting(true);
    setTimeout(() => { setTableImporting(false); setImportTableOpen(false); setTableImportFile(null); }, 1500);
  };

  useEffect(() => {
    if (addingCategory) addInputRef.current?.focus();
  }, [addingCategory]);

  const commitAdd = () => {
    if (newCatName.trim()) onAddCategory(newCatName.trim());
    setNewCatName("");
    setAddingCategory(false);
  };

  const handleNavClick = (label: string) => {
    if (label === "人员目录") {
      onNavChange(label);
      onCategoryChange("全部");
      return;
    }
    if (label === "分类列表") {
      if (activeNav === "分类列表") {
        setCategoryExpanded(v => !v);
      } else {
        onNavChange(label);
        setCategoryExpanded(true);
      }
      return;
    }
    if (label === "批量导入图片") {
      onNavChange(label);
      setBatchImportOpen(true);
      return;
    }
    if (label === "导入职称表") {
      onNavChange(label);
      setImportTableOpen(true);
      return;
    }
    onNavChange(label);
  };

  return (
    <>
      <aside
        className="flex flex-col h-full"
        style={{
          width: 280,
          minWidth: 280,
          background: "#FFFFFF",
          borderRight: "1px solid #E8E3D8",
          fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
        }}
      >
        {/* Logo area */}
        <div className="px-6 pt-7 pb-5" style={{ borderBottom: "1px solid #F0EDE4" }}>
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, background: "#F4C542", flexShrink: 0 }}
            >
              <span style={{ fontSize: 20, fontWeight: 800, color: "#141414", fontFamily: "serif" }}>初</span>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#141414", lineHeight: 1.2 }}>初心会</div>
              <div style={{ fontSize: 11, color: "#777", marginTop: 1 }}>人物档案库</div>
            </div>
          </div>
          <p style={{ fontSize: 11, color: "#AAAAAA", marginTop: 8, lineHeight: 1.4 }}>
            团队人物素材与档案管理
          </p>
        </div>

        {/* Main nav */}
        <nav className="px-3 pt-4 flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#E8E3D8 transparent" }}>
          {NAV_ITEMS.map(({ label, icon: Icon }) => {
            const active = activeNav === label;
            const isCategoryList = label === "分类列表";
            const expanded = isCategoryList && active && categoryExpanded;
            return (
              <div key={label}>
                <button
                  onClick={() => handleNavClick(label)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-150 text-left"
                  style={{
                    background: active ? "#FFF4C7" : "transparent",
                    border: active ? "1px solid #F4C542" : "1px solid transparent",
                    color: "#141414",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => !active && ((e.currentTarget as HTMLElement).style.background = "#F8F6EF")}
                  onMouseLeave={e => !active && ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <Icon size={16} style={{ color: "#141414", flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: "#141414", flex: 1 }}>{label}</span>
                  {isCategoryList && (
                    <ChevronDown
                      size={13}
                      style={{
                        color: "#AAAAAA",
                        flexShrink: 0,
                        transition: "transform 0.2s",
                        transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
                      }}
                    />
                  )}
                </button>

                {/* Expanded category list */}
                {expanded && (
                  <div className="mb-1 ml-2 pl-3" style={{ borderLeft: "2px solid #F0EDE4" }}>
                    <button
                      onClick={() => onCategoryChange("全部")}
                      className="w-full flex items-center justify-between rounded-lg px-2 py-1.5 mb-0.5 transition-all duration-150 text-left"
                      style={{
                        background: filterCategory === "全部" ? "#FFF9E6" : "transparent",
                        border: filterCategory === "全部" ? "1px solid #F4D060" : "1px solid transparent",
                        cursor: "pointer",
                      }}
                      onMouseEnter={e => {
                        if (filterCategory !== "全部") (e.currentTarget as HTMLElement).style.background = "#F8F6EF";
                      }}
                      onMouseLeave={e => {
                        if (filterCategory !== "全部") (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <span style={{ fontSize: 13, color: "#141414", fontWeight: filterCategory === "全部" ? 600 : 400 }}>
                        全部人物
                      </span>
                      {filterCategory === "全部" && <Check size={12} style={{ color: "#8A6500", flexShrink: 0 }} />}
                    </button>

                    {categories.map(cat => (
                      <div
                        key={cat}
                        onClick={() => onCategoryChange(cat)}
                        className="w-full flex items-center justify-between rounded-lg px-2 py-1.5 mb-0.5 transition-all duration-150"
                        style={{
                          background: filterCategory === cat ? "#FFF9E6" : "transparent",
                          border: filterCategory === cat ? "1px solid #F4D060" : "1px solid transparent",
                          cursor: "pointer",
                        }}
                        onMouseEnter={e => {
                          if (filterCategory !== cat) (e.currentTarget as HTMLElement).style.background = "#F8F6EF";
                          setHoveredCat(cat);
                        }}
                        onMouseLeave={e => {
                          if (filterCategory !== cat) (e.currentTarget as HTMLElement).style.background = "transparent";
                          setHoveredCat(null);
                        }}
                      >
                        <span style={{ fontSize: 13, color: "#141414", fontWeight: filterCategory === cat ? 600 : 400 }}>{cat}</span>
                        {filterCategory === cat ? (
                          <Check size={12} style={{ color: "#8A6500", flexShrink: 0 }} />
                        ) : hoveredCat === cat && (
                          <button
                            onClick={e => { e.stopPropagation(); onDeleteCategory(cat); }}
                            className="flex items-center justify-center rounded-full transition-all duration-150"
                            style={{ width: 20, height: 20, background: "#FFF5F5", border: "1px solid #FFDDDD", cursor: "pointer", flexShrink: 0 }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#FFE8E8"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#FFF5F5"}
                          >
                            <Trash2 size={10} style={{ color: "#DD2222" }} />
                          </button>
                        )}
                      </div>
                    ))}

                    {addingCategory ? (
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: "#FFFDF0", border: "1px solid #F4C542" }}>
                        <input
                          ref={addInputRef}
                          value={newCatName}
                          onChange={e => setNewCatName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") commitAdd(); if (e.key === "Escape") { setAddingCategory(false); setNewCatName(""); } }}
                          placeholder="输入分类名称"
                          style={{ flex: 1, fontSize: 13, color: "#141414", background: "transparent", border: "none", outline: "none", minWidth: 0 }}
                        />
                        <button
                          onClick={commitAdd}
                          className="flex items-center justify-center rounded-full transition-all duration-150"
                          style={{ width: 20, height: 20, background: "#F4C542", border: "none", cursor: "pointer", flexShrink: 0 }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#E8B830"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#F4C542"}
                        >
                          <Check size={10} style={{ color: "#141414" }} />
                        </button>
                        <button
                          onClick={() => { setAddingCategory(false); setNewCatName(""); }}
                          className="flex items-center justify-center rounded-full transition-all duration-150"
                          style={{ width: 20, height: 20, background: "#F8F6EF", border: "1px solid #E8E3D8", cursor: "pointer", flexShrink: 0 }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#AAAAAA"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8"}
                        >
                          <X size={10} style={{ color: "#777" }} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingCategory(true)}
                        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-150"
                        style={{ background: "transparent", border: "1px dashed #D0C8B0", cursor: "pointer" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#F4C542"; (e.currentTarget as HTMLElement).style.background = "#FFFDF0"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#D0C8B0"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <Plus size={11} style={{ color: "#AAAAAA" }} />
                        <span style={{ fontSize: 12, color: "#AAAAAA" }}>新增分类</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom user info */}
        <div className="relative" style={{ borderTop: "1px solid #F0EDE4" }}>
          {accountMenuOpen && (
            <div
              className="absolute left-3 right-3 rounded-2xl overflow-hidden"
              style={{
                bottom: "calc(100% + 8px)",
                background: "#FFFFFF",
                border: "1px solid #EDE9DF",
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              }}
            >
              <button
                className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-150"
                style={{ background: "transparent", border: "none", cursor: "pointer", borderBottom: "1px solid #F0EDE4" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#F8F6EF"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                onClick={() => setAccountMenuOpen(false)}
              >
                <div className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: "#F8F6EF", border: "1px solid #E8E3D8", flexShrink: 0 }}>
                  <Lock size={13} style={{ color: "#555" }} />
                </div>
                <span style={{ fontSize: 13, color: "#141414", fontWeight: 500 }}>修改密码</span>
              </button>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 transition-all duration-150"
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#FFF5F5"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                onClick={() => setAccountMenuOpen(false)}
              >
                <div className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: "#FFF5F5", border: "1px solid #FFDDDD", flexShrink: 0 }}>
                  <LogOut size={13} style={{ color: "#DD2222" }} />
                </div>
                <span style={{ fontSize: 13, color: "#DD2222", fontWeight: 500 }}>退出登录</span>
              </button>
            </div>
          )}
          <button
            className="w-full px-5 py-4 flex items-center gap-2.5 transition-all duration-150"
            style={{ background: accountMenuOpen ? "#FFF9E6" : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
            onClick={() => setAccountMenuOpen(v => !v)}
            onMouseEnter={e => !accountMenuOpen && ((e.currentTarget as HTMLElement).style.background = "#F8F6EF")}
            onMouseLeave={e => !accountMenuOpen && ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <div className="rounded-full flex items-center justify-center" style={{ width: 32, height: 32, background: "#F8F6EF", border: "1px solid #E8E3D8", flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: "#777", fontWeight: 600 }}>管</span>
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13, fontWeight: 600, color: "#141414" }}>管理员</div>
              <div style={{ fontSize: 11, color: "#AAAAAA" }}>超级管理员</div>
            </div>
            <ChevronUp
              size={14}
              style={{
                color: "#AAAAAA",
                flexShrink: 0,
                transition: "transform 0.2s",
                transform: accountMenuOpen ? "rotate(0deg)" : "rotate(180deg)",
              }}
            />
          </button>
        </div>
      </aside>

      {/* 批量导入图片 modal */}
      {batchImportOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          onClick={e => { if (e.target === e.currentTarget) setBatchImportOpen(false); }}
        >
          <div className="flex flex-col rounded-2xl overflow-hidden" style={{ width: 480, background: "#FAFAF8", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif" }}>
            <div style={{ height: 4, background: "#F4C542" }} />
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #EDE9DF" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#141414" }}>批量导入图片</div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>支持同时导入多张图片，自动匹配人员</div>
              </div>
              <button onClick={() => setBatchImportOpen(false)} className="flex items-center justify-center rounded-full transition-all duration-150" style={{ width: 32, height: 32, background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFF4C7"; (e.currentTarget as HTMLElement).style.borderColor = "#F4C542"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#F8F6EF"; (e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8"; }}>
                <X size={14} style={{ color: "#141414" }} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div
                onClick={() => imgInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer transition-all duration-150"
                style={{ minHeight: 160, border: "2px dashed #D0C8B0", background: "#F8F6EF" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#F4C542"; (e.currentTarget as HTMLElement).style.background = "#FFF9E6"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#D0C8B0"; (e.currentTarget as HTMLElement).style.background = "#F8F6EF"; }}
              >
                <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: "#FFFFFF", border: "1.5px solid #E8E3D8" }}>
                  <Upload size={20} style={{ color: "#AAAAAA" }} />
                </div>
                <div className="text-center">
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#141414" }}>点击或拖拽图片到此处</div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>支持 JPG、PNG、WebP，可多选</div>
                </div>
              </div>
              <input ref={imgInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => setBatchImportFile(e.target.files)} />
              {batchImportFile && batchImportFile.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#F0FFF4", border: "1px solid #86EFAC" }}>
                  <span style={{ fontSize: 12, color: "#166534" }}>已选择 {batchImportFile.length} 张图片</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid #EDE9DF" }}>
              <button onClick={() => { setBatchImportOpen(false); setBatchImportFile(null); }} className="px-5 py-2 rounded-full transition-all duration-150" style={{ background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer", fontSize: 13, color: "#555", fontWeight: 500 }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#AAAAAA"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8"}>取消</button>
              <button onClick={handleBatchImportStart} className="px-5 py-2 rounded-full transition-all duration-150" style={{ background: batchImporting ? "#E8E3D8" : "#F4C542", border: "none", cursor: batchImporting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, color: batchImporting ? "#AAAAAA" : "#141414" }} onMouseEnter={e => !batchImporting && ((e.currentTarget as HTMLElement).style.background = "#E8B830")} onMouseLeave={e => !batchImporting && ((e.currentTarget as HTMLElement).style.background = "#F4C542")}>{batchImporting ? "导入中..." : batchImportFile && batchImportFile.length > 0 ? "开始导入" : "选择文件"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 导入职称表 modal */}
      {importTableOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          onClick={e => { if (e.target === e.currentTarget) setImportTableOpen(false); }}
        >
          <div className="flex flex-col rounded-2xl overflow-hidden" style={{ width: 480, background: "#FAFAF8", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif" }}>
            <div style={{ height: 4, background: "#F4C542" }} />
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #EDE9DF" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#141414" }}>导入职称表</div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>通过 Excel 或 CSV 批量导入人员职称信息</div>
              </div>
              <button onClick={() => setImportTableOpen(false)} className="flex items-center justify-center rounded-full transition-all duration-150" style={{ width: 32, height: 32, background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFF4C7"; (e.currentTarget as HTMLElement).style.borderColor = "#F4C542"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#F8F6EF"; (e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8"; }}>
                <X size={14} style={{ color: "#141414" }} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Format hint */}
              <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: "#FFF9E6", border: "1px solid #F4D060" }}>
                <FileSpreadsheet size={16} style={{ color: "#8A6500", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#8A6500", marginBottom: 3 }}>文件格式要求</div>
                  <div style={{ fontSize: 12, color: "#8A6500", lineHeight: 1.6 }}>
                    列顺序：姓名 / 职称一 / 职称二 / 职称三 / 分类<br />
                    支持 .xlsx、.xls、.csv 格式
                  </div>
                </div>
              </div>
              <div
                onClick={() => tableInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer transition-all duration-150"
                style={{ minHeight: 140, border: "2px dashed #D0C8B0", background: "#F8F6EF" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#F4C542"; (e.currentTarget as HTMLElement).style.background = "#FFF9E6"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#D0C8B0"; (e.currentTarget as HTMLElement).style.background = "#F8F6EF"; }}
              >
                <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: "#FFFFFF", border: "1.5px solid #E8E3D8" }}>
                  <FileSpreadsheet size={20} style={{ color: "#AAAAAA" }} />
                </div>
                <div className="text-center">
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#141414" }}>点击选择文件</div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>xlsx / xls / csv</div>
                </div>
              </div>
              <input ref={tableInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => setTableImportFile(e.target.files?.[0] ?? null)} />
              {tableImportFile && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#F0FFF4", border: "1px solid #86EFAC" }}>
                  <FileSpreadsheet size={13} style={{ color: "#166534" }} />
                  <span style={{ fontSize: 12, color: "#166534" }}>{tableImportFile.name}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid #EDE9DF" }}>
              <button onClick={() => { setImportTableOpen(false); setTableImportFile(null); }} className="px-5 py-2 rounded-full transition-all duration-150" style={{ background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer", fontSize: 13, color: "#555", fontWeight: 500 }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#AAAAAA"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8"}>取消</button>
              <button onClick={handleTableImportStart} className="px-5 py-2 rounded-full transition-all duration-150" style={{ background: tableImporting ? "#E8E3D8" : "#F4C542", border: "none", cursor: tableImporting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, color: tableImporting ? "#AAAAAA" : "#141414" }} onMouseEnter={e => !tableImporting && ((e.currentTarget as HTMLElement).style.background = "#E8B830")} onMouseLeave={e => !tableImporting && ((e.currentTarget as HTMLElement).style.background = "#F4C542")}>{tableImporting ? "导入中..." : tableImportFile ? "开始导入" : "选择文件"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
