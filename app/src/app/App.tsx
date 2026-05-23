import { useState, useMemo } from "react";
import { Search, UserPlus, Trash2, CheckSquare, RefreshCcw, Users, AlertTriangle } from "lucide-react";
import { mockPeople, CATEGORIES, Person } from "./data/mockData";
import { Sidebar } from "./components/Sidebar";
import { PersonCard } from "./components/PersonCard";
import { PersonDetail } from "./components/PersonDetail";
import { EditPersonModal } from "./components/EditPersonModal";
import { AIGenerateModal } from "./components/AIGenerateModal";

export default function App() {
  const [people, setPeople] = useState<Person[]>(mockPeople);
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [activeNav, setActiveNav] = useState("人员目录");
  const [filterCategory, setFilterCategory] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

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
  const handleDeselectAll = () => setSelectedIds(new Set());
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
    setSelectedIds(new Set());
    showToast(`已删除 ${selectedIds.size} 位人物`);
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
      category: CATEGORIES[0],
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
  };

  const handleAddCategory = (cat: string) => {
    const trimmed = cat.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    setCategories(prev => [...prev, trimmed]);
    showToast(`已添加分类「${trimmed}」`);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        overflow: "hidden",
        background: "#F8F6EF",
        fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Left Sidebar */}
      <Sidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
        filterCategory={filterCategory}
        onCategoryChange={setFilterCategory}
        categories={categories}
        onDeleteCategory={handleDeleteCategory}
        onAddCategory={handleAddCategory}
      />

      {/* Main Content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Top header */}
        <header
          style={{
            padding: "20px 28px 0",
            flexShrink: 0,
          }}
        >
          {/* Title row */}
          <div className="flex items-end justify-between mb-4">
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#AAAAAA", letterSpacing: "0.1em", marginBottom: 4 }}>
                DIRECTORY
              </div>
              <div className="flex items-center gap-3">
                <h1 style={{ fontSize: 26, fontWeight: 800, color: "#141414", letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {filterCategory === "全部" ? "人员目录" : filterCategory}
                </h1>
                <span
                  className="px-2.5 py-1 rounded-full"
                  style={{ background: "#FFF4C7", border: "1px solid #F4D060", fontSize: 12, color: "#8A6500" }}
                >
                  {filteredPeople.length} 位成员
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#AAAAAA", marginTop: 4 }}>
                已加载 {people.length} 位成员 · 当前筛选 {filteredPeople.length} 位
              </div>
            </div>

            {/* Search + actions */}
            <div className="flex items-center gap-2.5">
              {/* Search bar */}
              <div className="relative">
                <Search
                  size={14}
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#AAAAAA" }}
                />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索姓名、职称或分类"
                  style={{
                    paddingLeft: 34,
                    paddingRight: 14,
                    paddingTop: 8,
                    paddingBottom: 8,
                    borderRadius: 99,
                    border: "1.5px solid #E8E3D8",
                    background: "#FFFFFF",
                    fontSize: 13,
                    color: "#141414",
                    width: 220,
                    outline: "none",
                  }}
                  onFocus={e => (e.target as HTMLElement).style.borderColor = "#F4C542"}
                  onBlur={e => (e.target as HTMLElement).style.borderColor = "#E8E3D8"}
                />
              </div>
            </div>
          </div>

          {/* Action buttons row */}
          <div
            className="flex items-center gap-2 pb-4"
            style={{ borderBottom: "1px solid #EDE9DF" }}
          >
            <ActionBtn onClick={handleSelectAll} icon={CheckSquare}>全选当前</ActionBtn>
            <ActionBtn onClick={handleInvert} icon={RefreshCcw}>反选</ActionBtn>
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
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 28px 28px",
            scrollbarWidth: "thin",
            scrollbarColor: "#E8E3D8 transparent",
          }}
        >
          {filteredPeople.length === 0 ? (
            <div className="flex flex-col items-center justify-center" style={{ height: "100%", minHeight: 320 }}>
              <div
                className="flex items-center justify-center rounded-2xl mb-4"
                style={{ width: 64, height: 64, background: "#FFF4C7", border: "1.5px solid #F4D060" }}
              >
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
                gridTemplateColumns: "repeat(auto-fill, minmax(198px, 1fr))",
                gap: 16,
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

      {/* Right Detail Panel or Empty State */}
      {selectedPerson ? (
        <PersonDetail
          person={selectedPerson}
          onEdit={handleEditPerson}
          onAI={p => { setSelectedPerson(p); setAiModalOpen(true); }}
          onClose={() => setSelectedPerson(null)}
        />
      ) : (
        <EmptyDetailPanel />
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

      {/* AI Modal */}
      {aiModalOpen && selectedPerson && (
        <AIGenerateModal
          person={selectedPerson}
          onClose={() => setAiModalOpen(false)}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#FFF9E6",
            border: "1.5px solid #F4D060",
            borderRadius: 99,
            padding: "10px 20px",
            fontSize: 13,
            color: "#8A6500",
            fontWeight: 500,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            zIndex: 100,
            whiteSpace: "nowrap",
            fontFamily: "'PingFang SC', sans-serif",
          }}
        >
          ✓ {toastMsg}
        </div>
      )}
    </div>
  );
}

function EmptyDetailPanel() {
  return (
    <aside
      style={{
        width: 400,
        minWidth: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderLeft: "1px solid #E8E3D8",
        background: "#FAFAF8",
        fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
      }}
    >
      <div
        className="flex flex-col items-center text-center mx-10 p-8 rounded-3xl"
        style={{ background: "#FFFFFF", border: "1.5px solid #EDE9DF" }}
      >
        <div
          className="flex items-center justify-center rounded-2xl mb-5"
          style={{ width: 64, height: 64, background: "#FFF4C7", border: "1.5px solid #F4D060" }}
        >
          <span style={{ fontSize: 28, fontWeight: 900, color: "#8A6500", fontFamily: "serif" }}>初</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#141414", marginBottom: 8 }}>
          选择一位人物查看完整档案
        </div>
        <div style={{ fontSize: 13, color: "#AAAAAA", lineHeight: 1.7 }}>
          右侧会展示形象照、职称、简介<br />以及素材操作等完整信息。
        </div>
      </div>
    </aside>
  );
}

function ActionBtn({
  children,
  onClick,
  icon: Icon,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon: any;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all duration-150"
      style={{
        background: "#FFFFFF",
        border: danger ? "1.5px solid #FFCCCC" : "1.5px solid #E8E3D8",
        color: danger ? "#CC3333" : "#141414",
        fontSize: 13,
        cursor: "pointer",
        fontWeight: 500,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = danger ? "#FFF0F0" : "#F8F6EF";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "#FFFFFF";
      }}
    >
      <Icon size={13} />
      {children}
    </button>
  );
}
