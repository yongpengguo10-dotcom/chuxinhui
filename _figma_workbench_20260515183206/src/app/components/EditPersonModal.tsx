import { useState, useCallback } from "react";
import { X, Upload, AlignCenter, ArrowUp, ArrowDown, RotateCcw, Plus } from "lucide-react";
import { Person, CATEGORIES } from "../data/mockData";
import { PersonAvatar } from "./PersonAvatar";

interface EditPersonModalProps {
  person: Person | null;
  categories: string[];
  onSave: (person: Person) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

const ALL_TAGS = [
  "初心会理事", "教育创新", "扶贫攻坚", "科技赋能", "文化传承",
  "乡村振兴", "青年导师", "公益大使", "创业先锋", "非遗传承",
  "社会企业家", "影响力人物", "智库成员", "志愿者领袖", "品牌创始人",
];

export function EditPersonModal({ person, categories, onSave, onCancel, onDelete }: EditPersonModalProps) {
  const isNew = !person?.id || person.id.startsWith("new_");

  const [name, setName] = useState(person?.name ?? "");
  const [category, setCategory] = useState(person?.category ?? categories[0] ?? CATEGORIES[0]);
  const [title1, setTitle1] = useState(person?.title1 ?? "");
  const [title2, setTitle2] = useState(person?.title2 ?? "");
  const [title3, setTitle3] = useState(person?.title3 ?? "");
  const [tags, setTags] = useState<string[]>(person?.tags ?? []);
  const [bio, setBio] = useState(person?.bio ?? "");
  const [tagInput, setTagInput] = useState("");
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [customTagValue, setCustomTagValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [imgOffsetX, setImgOffsetX] = useState(0);
  const [imgOffsetY, setImgOffsetY] = useState(0);
  const [imgScale, setImgScale] = useState(100);

  const avatarIndex = person?.avatarIndex ?? 0;

  const handleAddTag = (tag: string) => {
    if (tags.length >= 4) return;
    if (!tags.includes(tag)) setTags(prev => [...prev, tag]);
  };

  const handleRemoveTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleAddCustomTag = () => {
    const t = customTagValue.trim();
    if (t && !tags.includes(t) && tags.length < 4) {
      setTags(prev => [...prev, t]);
    }
    setCustomTagValue("");
    setShowCustomTagInput(false);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const saved: Person = {
      id: person?.id ?? `p_${Date.now()}`,
      name: name.trim(),
      category,
      title1: title1.trim(),
      title2: title2.trim() || undefined,
      title3: title3.trim() || undefined,
      tags,
      bio: bio.trim(),
      createdBy: person?.createdBy ?? "管理员",
      imageCount: person?.imageCount ?? 1,
      currentImageIndex: person?.currentImageIndex ?? 0,
      avatarIndex,
    };
    onSave(saved);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(20,20,20,0.4)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="relative flex flex-col"
        style={{
          width: 760,
          maxWidth: "calc(100vw - 16px)",
          maxHeight: "92vh",
          background: "#FFFFFF",
          borderRadius: 24,
          boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
          overflow: "hidden",
          fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5" style={{ borderBottom: "1px solid #F0EDE4", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#141414" }}>
              {isNew ? "新增人员" : "编辑资料"}
            </div>
            <div style={{ fontSize: 12, color: "#AAAAAA", marginTop: 2 }}>
              {isNew ? "填写人物基本信息" : `正在编辑：${person?.name}`}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="flex items-center justify-center rounded-full"
            style={{ width: 32, height: 32, background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer" }}
          >
            <X size={14} style={{ color: "#141414" }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6" style={{ scrollbarWidth: "thin" }}>
          <div className="flex flex-wrap gap-6">
            {/* Left: photo upload */}
            <div style={{ width: 240, maxWidth: "100%", flexShrink: 0 }}>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="rounded-2xl transition-all duration-200"
                style={{
                  height: 200,
                  border: isDragging ? "2px solid #F4C542" : "2px dashed #D0C8B0",
                  background: isDragging ? "#FFF9E6" : "#FBF9F4",
                  cursor: "pointer",
                  overflow: "hidden",
                  marginBottom: 12,
                  position: "relative",
                  display: "flex",
                }}
              >
                <PersonAvatar name={name || "人"} avatarIndex={avatarIndex} size="thumb" />
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-150"
                  style={{ background: "rgba(255,255,255,0.85)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "0"}
                >
                  <Upload size={24} style={{ color: "#8A6500", marginBottom: 8 }} />
                  <div style={{ fontSize: 12, color: "#8A6500", fontWeight: 500 }}>点击或拖拽上传</div>
                  <div style={{ fontSize: 10, color: "#AAAAAA", marginTop: 4 }}>支持 PNG / JPG / WebP</div>
                </div>
              </div>

              {/* Photo adjustments */}
              <div className="p-3 rounded-xl" style={{ background: "#F8F6EF", border: "1px solid #E8E3D8" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#777", marginBottom: 8 }}>图片调整</div>
                <div className="flex gap-1.5 mb-3">
                  {[
                    { icon: AlignCenter, label: "居中", action: () => { setImgOffsetX(0); setImgOffsetY(0); } },
                    { icon: ArrowUp, label: "上移", action: () => setImgOffsetY(y => y - 10) },
                    { icon: ArrowDown, label: "下移", action: () => setImgOffsetY(y => y + 10) },
                    { icon: RotateCcw, label: "重置", action: () => { setImgOffsetX(0); setImgOffsetY(0); setImgScale(100); } },
                  ].map(({ icon: Icon, label, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      title={label}
                      className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded-lg transition-all duration-150"
                      style={{ background: "#FFFFFF", border: "1px solid #E8E3D8", cursor: "pointer" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFF4C7"; (e.currentTarget as HTMLElement).style.borderColor = "#F4C542"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#FFFFFF"; (e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8"; }}
                    >
                      <Icon size={12} style={{ color: "#555" }} />
                      <span style={{ fontSize: 9, color: "#777" }}>{label}</span>
                    </button>
                  ))}
                </div>

                {[
                  { label: "左右位置", min: -100, max: 100, value: imgOffsetX, onChange: (v: number) => setImgOffsetX(v) },
                  { label: "上下位置", min: -100, max: 100, value: imgOffsetY, onChange: (v: number) => setImgOffsetY(v) },
                  { label: "放大缩小", min: 50, max: 200, value: imgScale, onChange: (v: number) => setImgScale(v) },
                ].map(({ label, min, max, value, onChange }) => (
                  <div key={label} className="mb-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 10, color: "#777" }}>{label}</span>
                      <span style={{ fontSize: 10, color: "#AAAAAA" }}>{value}</span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={value}
                      onChange={e => onChange(Number(e.target.value))}
                      className="w-full"
                      style={{ accentColor: "#F4C542" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: form fields */}
            <div className="flex-1" style={{ minWidth: 240 }}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <FormField label="姓名 *">
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="请输入姓名"
                    className="w-full px-3 py-2.5 rounded-xl outline-none transition-all duration-150"
                    style={{ border: "1.5px solid #E8E3D8", fontSize: 14, color: "#141414", background: "#FAFAF8" }}
                    onFocus={e => (e.target as HTMLElement).style.borderColor = "#F4C542"}
                    onBlur={e => (e.target as HTMLElement).style.borderColor = "#E8E3D8"}
                  />
                </FormField>
                <FormField label="分类">
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl outline-none transition-all duration-150"
                    style={{ border: "1.5px solid #E8E3D8", fontSize: 14, color: "#141414", background: "#FAFAF8", cursor: "pointer", appearance: "none" }}
                    onFocus={e => (e.target as HTMLElement).style.borderColor = "#F4C542"}
                    onBlur={e => (e.target as HTMLElement).style.borderColor = "#E8E3D8"}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormField>
              </div>

              {[
                { label: "职称 1", value: title1, onChange: setTitle1, placeholder: "主要职称" },
                { label: "职称 2", value: title2, onChange: setTitle2, placeholder: "第二职称（选填）" },
                { label: "职称 3", value: title3, onChange: setTitle3, placeholder: "第三职称（选填）" },
              ].map(({ label, value, onChange, placeholder }) => (
                <div className="mb-4" key={label}>
                  <FormField label={label}>
                    <input
                      value={value}
                      onChange={e => onChange(e.target.value)}
                      placeholder={placeholder}
                      className="w-full px-3 py-2.5 rounded-xl outline-none transition-all duration-150"
                      style={{ border: "1.5px solid #E8E3D8", fontSize: 14, color: "#141414", background: "#FAFAF8" }}
                      onFocus={e => (e.target as HTMLElement).style.borderColor = "#F4C542"}
                      onBlur={e => (e.target as HTMLElement).style.borderColor = "#E8E3D8"}
                    />
                  </FormField>
                </div>
              ))}

              {/* Tags */}
              <div className="mb-4">
                <label style={{ fontSize: 12, fontWeight: 600, color: "#777", display: "block", marginBottom: 6 }}>
                  人物标签 <span style={{ color: "#AAAAAA", fontWeight: 400 }}>（最多 4 个）</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                      style={{ background: "#FFF4C7", border: "1px solid #F4D060", fontSize: 12, color: "#8A6500" }}
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                      >
                        <X size={10} style={{ color: "#8A6500" }} />
                      </button>
                    </span>
                  ))}
                  {tags.length < 4 && (
                    showCustomTagInput ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "#FFF9E6", border: "1.5px solid #F4C542" }}>
                        <input
                          autoFocus
                          value={customTagValue}
                          onChange={e => setCustomTagValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleAddCustomTag(); if (e.key === "Escape") { setShowCustomTagInput(false); setCustomTagValue(""); } }}
                          placeholder="输入标签名"
                          style={{ width: 80, fontSize: 12, background: "transparent", border: "none", outline: "none", color: "#141414" }}
                        />
                        <button onClick={handleAddCustomTag} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
                          <X size={10} style={{ color: "#8A6500", transform: "rotate(45deg)" }} />
                        </button>
                        <button onClick={() => { setShowCustomTagInput(false); setCustomTagValue(""); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
                          <X size={10} style={{ color: "#AAAAAA" }} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCustomTagInput(true)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-all duration-150"
                        style={{ background: "#F8F6EF", border: "1.5px dashed #D0C8B0", fontSize: 12, color: "#AAAAAA", cursor: "pointer" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#F4C542"; (e.currentTarget as HTMLElement).style.color = "#8A6500"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#D0C8B0"; (e.currentTarget as HTMLElement).style.color = "#AAAAAA"; }}
                      >
                        <Plus size={10} />
                        添加标签
                      </button>
                    )
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_TAGS.filter(t => !tags.includes(t)).map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleAddTag(tag)}
                      disabled={tags.length >= 4}
                      className="px-2.5 py-1 rounded-full transition-all duration-150"
                      style={{
                        background: "#F8F6EF",
                        border: "1px solid #E8E3D8",
                        fontSize: 11,
                        color: "#777",
                        cursor: tags.length >= 4 ? "not-allowed" : "pointer",
                        opacity: tags.length >= 4 ? 0.5 : 1,
                      }}
                      onMouseEnter={e => tags.length < 4 && ((e.currentTarget as HTMLElement).style.borderColor = "#F4C542")}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8")}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div>
                <FormField label="人物简介">
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="请输入人物简介..."
                    rows={5}
                    className="w-full px-3 py-2.5 rounded-xl outline-none resize-none transition-all duration-150"
                    style={{ border: "1.5px solid #E8E3D8", fontSize: 13, color: "#141414", lineHeight: 1.8, background: "#FAFAF8" }}
                    onFocus={e => (e.target as HTMLElement).style.borderColor = "#F4C542"}
                    onBlur={e => (e.target as HTMLElement).style.borderColor = "#E8E3D8"}
                  />
                </FormField>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-7 py-4"
          style={{ borderTop: "1px solid #F0EDE4", flexShrink: 0 }}
        >
          <div>
            {!isNew && (
              <button
                onClick={() => { if (window.confirm(`确认删除「${person?.name}」？`)) onDelete(person!.id); }}
                className="px-4 py-2 rounded-full transition-all duration-150"
                style={{ background: "transparent", border: "1.5px solid #FFCCCC", color: "#CC3333", fontSize: 13, cursor: "pointer", fontWeight: 500 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#FFF0F0"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                删除此人物
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-5 py-2 rounded-full transition-all duration-150"
              style={{ background: "#FFFFFF", border: "1.5px solid #E8E3D8", fontSize: 13, color: "#555", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#F8F6EF"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#FFFFFF"}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-full flex items-center gap-2 transition-all duration-150"
              style={{ background: "#F4C542", border: "none", fontSize: 13, fontWeight: 600, color: "#141414", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#E8B830"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#F4C542"}
            >
              保存资料
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#777", display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
