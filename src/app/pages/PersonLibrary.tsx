import { Dispatch, SetStateAction, useState, useMemo, useRef } from "react";
import { Search, UserPlus, Trash2, CheckSquare, RefreshCcw, Users, Menu, ImagePlus, FileSpreadsheet, X, Upload, Plus, Check } from "lucide-react";
import { CATEGORIES, Person } from "../data/mockData";
import { PersonCard } from "../components/PersonCard";
import { PersonDetail } from "../components/PersonDetail";
import { EditPersonModal } from "../components/EditPersonModal";
import { AIGenerateModal } from "../components/AIGenerateModal";

interface PersonLibraryProps {
  isMobile: boolean;
  onOpenDrawer: () => void;
  showToast: (msg: string) => void;
  people: Person[];
  setPeople: Dispatch<SetStateAction<Person[]>>;
  categories: string[];
  setCategories: Dispatch<SetStateAction<string[]>>;
}

export function PersonLibrary({ isMobile, onOpenDrawer, showToast, people, setPeople, categories, setCategories }: PersonLibraryProps) {
  const [filterCategory, setFilterCategory] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const [importTableOpen, setImportTableOpen] = useState(false);
  const [batchImportFile, setBatchImportFile] = useState<FileList | null>(null);
  const [tableImportFile, setTableImportFile] = useState<File | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const imgInputRef = useRef<HTMLInputElement>(null);
  const tableInputRef = useRef<HTMLInputElement>(null);

  const filteredPeople = useMemo(() => {
    return people.filter(p => {
      if (filterCategory !== "全部" && p.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          p.name.includes(q) ||
          p.title1.toLowerCase().includes(q) ||
          (p.title2 || "").toLowerCase().includes(q) ||
          (p.title3 || "").toLowerCase().includes(q) ||
          p.category.includes(q) ||
          p.tags.some(t => t.includes(q))
        );
      }
      return true;
    });
  }, [people, filterCategory, searchQuery]);

  const handleSelectAll = () => setSelectedIds(new Set(filteredPeople.map(p => p.id)));
  const handleInvert = () => {
    const next = new Set<string>();
    filteredPeople.forEach(p => { if (!selectedIds.has(p.id)) next.add(p.id); });
    setSelectedIds(next);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`确认删除选中的 ${selectedIds.size} 位人物？此操作不可恢复。`)) return;
    setPeople(prev => prev.filter(p => !selectedIds.has(p.id)));
    if (selectedPerson && selectedIds.has(selectedPerson.id)) setSelectedPerson(null);
    showToast(`已删除 ${selectedIds.size} 位人物`);
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    setEditModalOpen(true);
  };

  const handleAddPerson = () => {
    const newPerson: Person = {
      id: `new_${Date.now()}`,
      name: "",
      title1: "",
      category: categories[0] ?? CATEGORIES[0],
      tags: [],
      bio: "",
      createdBy: "管理员",
      imageCount: 1,
      currentImageIndex: 0,
      avatarIndex: Math.floor(Math.random() * 8),
    };
    setEditingPerson(newPerson);
    setEditModalOpen(true);
  };

  const handleSavePerson = (person: Person) => {
    const isNew = !people.find(p => p.id === person.id);
    if (isNew) {
      setPeople(prev => [person, ...prev]);
      setSelectedPerson(person);
      showToast(`已添加「${person.name}」`);
    } else {
      setPeople(prev => prev.map(p => p.id === person.id ? person : p));
      if (selectedPerson?.id === person.id) setSelectedPerson(person);
      showToast(`已保存「${person.name}」的资料`);
    }
    setEditModalOpen(false);
    setEditingPerson(null);
  };

  const handleUpdatePerson = (person: Person, message?: string) => {
    setPeople(prev => prev.map(p => p.id === person.id ? person : p));
    if (selectedPerson?.id === person.id) setSelectedPerson(person);
    if (message) showToast(message);
  };

  const handleDeletePerson = (id: string) => {
    const p = people.find(x => x.id === id);
    setPeople(prev => prev.filter(x => x.id !== id));
    if (selectedPerson?.id === id) setSelectedPerson(null);
    setEditModalOpen(false);
    showToast(`已删除「${p?.name}」`);
  };

  const handleDeleteCategory = (cat: string) => {
    setCategories(prev => prev.filter(c => c !== cat));
    if (filterCategory === cat) setFilterCategory("全部");
    showToast(`已删除分类「${cat}」`);
  };

  const commitAddCategory = () => {
    const trimmed = newCatName.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories(prev => [...prev, trimmed]);
      showToast(`已添加分类「${trimmed}」`);
    }
    setNewCatName("");
    setAddingCategory(false);
  };

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(String(e.target?.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const handleBatchImportImages = async () => {
    if (!batchImportFile || batchImportFile.length === 0) {
      imgInputRef.current?.click();
      return;
    }
    const files = Array.from(batchImportFile);
    const uploads = await Promise.all(files.map(async file => ({ file, dataUrl: await readFileAsDataUrl(file) })));
    let matchedCount = 0;
    const nextPeople = people.map(person => {
      const matched = uploads.filter(({ file }) => file.name.includes(person.name));
      if (matched.length === 0) return person;
      matchedCount += matched.length;
      const nextPhotos = [...(person.photos ?? []), ...matched.map(item => item.dataUrl)];
      return { ...person, photos: nextPhotos, imageCount: Math.max(nextPhotos.length, 1), currentImageIndex: person.photos?.length ? person.currentImageIndex : 0 };
    });
    setPeople(nextPeople);
    setSelectedPerson(prev => prev ? nextPeople.find(p => p.id === prev.id) ?? prev : prev);
    setBatchImportOpen(false);
    setBatchImportFile(null);
    showToast(matchedCount > 0 ? `已匹配导入 ${matchedCount} 张图片` : "未匹配到同名人物，请检查图片文件名");
  };

  const parseCsvLine = (line: string) => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];
      if (char === "\"" && inQuotes && next === "\"") {
        current += "\"";
        i += 1;
      } else if (char === "\"") {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const handleImportTitles = async () => {
    if (!tableImportFile) {
      tableInputRef.current?.click();
      return;
    }
    if (!tableImportFile.name.toLowerCase().endsWith(".csv")) {
      showToast("当前先支持 CSV，请把表格另存为 CSV 后导入");
      return;
    }
    const rows = (await tableImportFile.text()).replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean).map(parseCsvLine);
    let updatedCount = 0;
    const importedCategories = new Set<string>();
    setPeople(prev => prev.map(person => {
      const row = rows.find(cells => cells[0] === person.name);
      if (!row) return person;
      updatedCount += 1;
      const nextCategory = row[4]?.trim() || person.category;
      importedCategories.add(nextCategory);
      return { ...person, title1: row[1]?.trim() || person.title1, title2: row[2]?.trim() || undefined, title3: row[3]?.trim() || undefined, category: nextCategory };
    }));
    setCategories(prev => Array.from(new Set([...prev, ...importedCategories])));
    setImportTableOpen(false);
    setTableImportFile(null);
    showToast(updatedCount > 0 ? `已更新 ${updatedCount} 位人物职称` : "表格中没有匹配到现有人物姓名");
  };

  return (
    <>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Header */}
        <header
          style={{
            padding: isMobile ? "14px 16px 0" : "20px 28px 0",
            flexShrink: 0,
          }}
        >
          <div className={`mb-4 ${isMobile ? "flex flex-col gap-3" : "flex items-end justify-between"}`}>
            <div className={isMobile ? "flex items-center gap-3" : ""}>
              {isMobile && (
                <button
                  onClick={onOpenDrawer}
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 36, height: 36, background: "#FFFFFF", border: "1.5px solid #E8E3D8", cursor: "pointer", flexShrink: 0 }}
                >
                  <Menu size={16} style={{ color: "#141414" }} />
                </button>
              )}
              <div>
                {!isMobile && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#AAAAAA", letterSpacing: "0.1em", marginBottom: 4 }}>
                    素材库 / 人物素材
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: "#141414", letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {filterCategory === "全部" ? "人物素材" : filterCategory}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full" style={{ background: "#FFF4C7", border: "1px solid #F4D060", fontSize: 11, color: "#8A6500" }}>
                    {filteredPeople.length}
                  </span>
                </div>
                {!isMobile && (
                  <div style={{ fontSize: 13, color: "#AAAAAA", marginTop: 4 }}>
                    已加载 {people.length} 位成员 · 当前筛选 {filteredPeople.length} 位
                  </div>
                )}
              </div>
            </div>

            <div className={`flex items-center gap-2.5 ${isMobile ? "w-full" : ""}`}>
              <div className={`relative ${isMobile ? "flex-1" : ""}`}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#AAAAAA" }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={isMobile ? "搜索人员" : "搜索姓名、职称或分类"}
                  style={{
                    paddingLeft: 34, paddingRight: 14, paddingTop: 8, paddingBottom: 8,
                    borderRadius: 99, border: "1.5px solid #E8E3D8", background: "#FFFFFF",
                    fontSize: 13, color: "#141414", width: isMobile ? "100%" : 220, outline: "none",
                  }}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = "#F4C542"}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = "#E8E3D8"}
                />
              </div>
            </div>
          </div>

          {/* Category chips */}
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <CategoryChip label="全部" active={filterCategory === "全部"} onClick={() => setFilterCategory("全部")} />
            {categories.map(cat => (
              <CategoryChip
                key={cat}
                label={cat}
                active={filterCategory === cat}
                onClick={() => setFilterCategory(cat)}
                onDelete={() => {
                  if (window.confirm(`删除分类「${cat}」？`)) handleDeleteCategory(cat);
                }}
              />
            ))}
            {addingCategory ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "#FFFDF0", border: "1.5px solid #F4C542", flexShrink: 0 }}>
                <input
                  autoFocus
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") commitAddCategory(); if (e.key === "Escape") { setAddingCategory(false); setNewCatName(""); } }}
                  placeholder="分类名"
                  style={{ width: 80, fontSize: 12, background: "transparent", border: "none", outline: "none", color: "#141414" }}
                />
                <button onClick={commitAddCategory} className="flex items-center justify-center rounded-full" style={{ width: 18, height: 18, background: "#F4C542", border: "none", cursor: "pointer" }}>
                  <Check size={10} style={{ color: "#141414" }} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingCategory(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-all duration-150"
                style={{ background: "#F8F6EF", border: "1.5px dashed #D0C8B0", cursor: "pointer", flexShrink: 0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#F4C542"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#D0C8B0"; }}
              >
                <Plus size={11} style={{ color: "#AAAAAA" }} />
                <span style={{ fontSize: 11, color: "#AAAAAA" }}>新增分类</span>
              </button>
            )}
          </div>

          {/* Action toolbar */}
          <div className="flex items-center gap-2 pb-4 overflow-x-auto" style={{ borderBottom: "1px solid #EDE9DF", scrollbarWidth: "none" }}>
            <ActionBtn onClick={handleSelectAll} icon={CheckSquare}>全选当前</ActionBtn>
            <ActionBtn onClick={handleInvert} icon={RefreshCcw}>反选</ActionBtn>
            <ActionBtn onClick={() => setBatchImportOpen(true)} icon={ImagePlus}>批量导入图片</ActionBtn>
            <ActionBtn onClick={() => setImportTableOpen(true)} icon={FileSpreadsheet}>导入职称表</ActionBtn>
            {selectedIds.size > 0 && (
              <ActionBtn onClick={handleDeleteSelected} danger icon={Trash2}>
                批量删除 ({selectedIds.size})
              </ActionBtn>
            )}
            <div style={{ marginLeft: "auto" }}>
              <button
                onClick={handleAddPerson}
                className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-150"
                style={{ background: "#F4C542", border: "none", cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#E8B830"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#F4C542"}
              >
                <UserPlus size={14} style={{ color: "#141414" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#141414" }}>新增人员</span>
              </button>
            </div>
          </div>
        </header>

        {/* Card grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px 16px 24px" : "20px 28px 28px", scrollbarWidth: "thin", scrollbarColor: "#E8E3D8 transparent" }}>
          {filteredPeople.length === 0 ? (
            <div className="flex flex-col items-center justify-center" style={{ height: "100%", minHeight: 320 }}>
              <div className="flex items-center justify-center rounded-2xl mb-4" style={{ width: 64, height: 64, background: "#FFF4C7", border: "1.5px solid #F4D060" }}>
                <Users size={26} style={{ color: "#8A6500" }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#141414", marginBottom: 6 }}>未找到匹配人物</div>
              <div style={{ fontSize: 13, color: "#AAAAAA" }}>
                {searchQuery ? `没有与「${searchQuery}」匹配的人物` : "当前分类下暂无人物"}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fill, minmax(198px, 1fr))",
                gap: isMobile ? 12 : 16,
              }}
            >
              {filteredPeople.map(person => (
                <PersonCard
                  key={person.id}
                  person={person}
                  selected={selectedIds.has(person.id)}
                  active={selectedPerson?.id === person.id}
                  onToggleSelect={handleToggleSelect}
                  onClick={p => setSelectedPerson(prev => prev?.id === p.id ? prev : p)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Right Detail Panel */}
      {selectedPerson ? (
        <PersonDetail
          person={selectedPerson}
          onEdit={handleEditPerson}
          onAI={p => { setSelectedPerson(p); setAiModalOpen(true); }}
          onClose={() => setSelectedPerson(null)}
          onUpdate={handleUpdatePerson}
        />
      ) : (
        !isMobile && <EmptyDetailPanel />
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <EditPersonModal
          person={editingPerson}
          categories={categories}
          onSave={handleSavePerson}
          onCancel={() => { setEditModalOpen(false); setEditingPerson(null); }}
          onDelete={handleDeletePerson}
        />
      )}

      {aiModalOpen && selectedPerson && (
        <AIGenerateModal person={selectedPerson} onClose={() => setAiModalOpen(false)} />
      )}

      {/* Batch import images modal */}
      {batchImportOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          onClick={e => { if (e.target === e.currentTarget) setBatchImportOpen(false); }}
        >
          <div className="flex flex-col rounded-2xl overflow-hidden" style={{ width: 480, maxWidth: "calc(100vw - 16px)", background: "#FAFAF8", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
            <div style={{ height: 4, background: "#F4C542" }} />
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #EDE9DF" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#141414" }}>批量导入图片</div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>支持同时导入多张图片，自动匹配人员</div>
              </div>
              <button onClick={() => setBatchImportOpen(false)} className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer" }}>
                <X size={14} style={{ color: "#141414" }} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div
                onClick={() => imgInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer transition-all duration-150"
                style={{ minHeight: 160, border: "2px dashed #D0C8B0", background: "#F8F6EF" }}
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
              <button onClick={() => { setBatchImportOpen(false); setBatchImportFile(null); }} className="px-5 py-2 rounded-full" style={{ background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer", fontSize: 13, color: "#555", fontWeight: 500 }}>取消</button>
              <button onClick={handleBatchImportImages} className="px-5 py-2 rounded-full" style={{ background: "#F4C542", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#141414" }}>
                {batchImportFile && batchImportFile.length > 0 ? "开始导入" : "选择文件"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import table modal */}
      {importTableOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          onClick={e => { if (e.target === e.currentTarget) setImportTableOpen(false); }}
        >
          <div className="flex flex-col rounded-2xl overflow-hidden" style={{ width: 480, maxWidth: "calc(100vw - 16px)", background: "#FAFAF8", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>
            <div style={{ height: 4, background: "#F4C542" }} />
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #EDE9DF" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#141414" }}>导入职称表</div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>通过 Excel 或 CSV 批量导入人员职称信息</div>
              </div>
              <button onClick={() => setImportTableOpen(false)} className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer" }}>
                <X size={14} style={{ color: "#141414" }} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: "#FFF9E6", border: "1px solid #F4D060" }}>
                <FileSpreadsheet size={16} style={{ color: "#8A6500", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#8A6500", marginBottom: 3 }}>文件格式要求</div>
                  <div style={{ fontSize: 12, color: "#8A6500", lineHeight: 1.6 }}>
                    列顺序：姓名 / 职称一 / 职称二 / 职称三 / 分类<br />
                    支持 .csv 格式
                  </div>
                </div>
              </div>
              <div
                onClick={() => tableInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer"
                style={{ minHeight: 140, border: "2px dashed #D0C8B0", background: "#F8F6EF" }}
              >
                <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: "#FFFFFF", border: "1.5px solid #E8E3D8" }}>
                  <FileSpreadsheet size={20} style={{ color: "#AAAAAA" }} />
                </div>
                <div className="text-center">
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#141414" }}>点击选择文件</div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>csv</div>
                </div>
              </div>
              <input ref={tableInputRef} type="file" accept=".csv" className="hidden" onChange={e => setTableImportFile(e.target.files?.[0] ?? null)} />
              {tableImportFile && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "#F0FFF4", border: "1px solid #86EFAC" }}>
                  <FileSpreadsheet size={13} style={{ color: "#166534" }} />
                  <span style={{ fontSize: 12, color: "#166534" }}>{tableImportFile.name}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid #EDE9DF" }}>
              <button onClick={() => { setImportTableOpen(false); setTableImportFile(null); }} className="px-5 py-2 rounded-full" style={{ background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer", fontSize: 13, color: "#555", fontWeight: 500 }}>取消</button>
              <button onClick={handleImportTitles} className="px-5 py-2 rounded-full" style={{ background: "#F4C542", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#141414" }}>
                {tableImportFile ? "开始导入" : "选择文件"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CategoryChip({ label, active, onClick, onDelete }: { label: string; active: boolean; onClick: () => void; onDelete?: () => void }) {
  return (
    <div
      className="flex items-center gap-1 rounded-full transition-all duration-150"
      style={{
        background: active ? "#FFF4C7" : "#FFFFFF",
        border: active ? "1.5px solid #F4C542" : "1.5px solid #E8E3D8",
        flexShrink: 0,
        cursor: "pointer",
      }}
    >
      <button
        onClick={onClick}
        style={{ padding: "5px 12px", background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: active ? "#8A6500" : "#555", fontWeight: active ? 600 : 500 }}
      >
        {label}
      </button>
      {onDelete && active && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="flex items-center justify-center"
          style={{ width: 18, height: 18, marginRight: 4, background: "transparent", border: "none", cursor: "pointer", borderRadius: 99 }}
        >
          <X size={10} style={{ color: "#8A6500" }} />
        </button>
      )}
    </div>
  );
}

function ActionBtn({ children, onClick, icon: Icon, danger = false }: { children: React.ReactNode; onClick: () => void; icon: any; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all duration-150"
      style={{
        background: "#FFFFFF",
        border: danger ? "1.5px solid #FFCCCC" : "1.5px solid #E8E3D8",
        color: danger ? "#CC3333" : "#141414",
        fontSize: 13, cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap",
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = danger ? "#FFF0F0" : "#F8F6EF"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#FFFFFF"}
    >
      <Icon size={13} />
      {children}
    </button>
  );
}

function EmptyDetailPanel() {
  return (
    <aside
      style={{
        width: 400, minWidth: 400, display: "flex", alignItems: "center", justifyContent: "center",
        borderLeft: "1px solid #E8E3D8", background: "#FAFAF8",
        fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
      }}
    >
      <div className="flex flex-col items-center text-center mx-10 p-8 rounded-3xl" style={{ background: "#FFFFFF", border: "1.5px solid #EDE9DF" }}>
        <div className="flex items-center justify-center rounded-2xl mb-5" style={{ width: 64, height: 64, background: "#FFF4C7", border: "1.5px solid #F4D060" }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: "#8A6500", fontFamily: "serif" }}>初</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#141414", marginBottom: 8 }}>选择一位人物查看完整档案</div>
        <div style={{ fontSize: 13, color: "#AAAAAA", lineHeight: 1.7 }}>
          右侧会展示形象照、职称、简介<br />以及素材操作等完整信息。
        </div>
      </div>
    </aside>
  );
}
