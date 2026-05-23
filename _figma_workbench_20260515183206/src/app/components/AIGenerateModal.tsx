import { useState } from "react";
import { X, Sparkles, Download, Plus, Briefcase, User, Coffee, Mic } from "lucide-react";
import { Person } from "../data/mockData";
import { PersonAvatar } from "./PersonAvatar";

interface AIGenerateModalProps {
  person: Person;
  onClose: () => void;
}

const PORTRAIT_STYLES = [
  { id: "business", icon: Briefcase, label: "商务正面", desc: "正装领带，标准证件照风格" },
  { id: "natural", icon: User, label: "侧身自然", desc: "休闲侧身，自然光线，亲和力十足" },
  { id: "tea", icon: Coffee, label: "茶会场景", desc: "中式茶室环境，人文气息浓厚" },
  { id: "speaker", icon: Mic, label: "导师演讲", desc: "演讲台背景，专业权威形象" },
];

export function AIGenerateModal({ person, onClose }: AIGenerateModalProps) {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [hasResult, setHasResult] = useState(false);
  const [cardGenerating, setCardGenerating] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const handleGenerate = () => {
    if (!selectedStyle) return;
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setHasResult(true);
      setGeneratedCount(c => c + 1);
    }, 2200);
  };

  const handleCardGenerate = (size: string) => {
    setCardGenerating(size);
    setTimeout(() => setCardGenerating(null), 1800);
  };

  const handleSaveToLocal = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleAddToProfile = () => {
    setAddedFeedback(true);
    setTimeout(() => { setAddedFeedback(false); onClose(); }, 1200);
  };

  const maxDaily = 10;
  const remaining = maxDaily - generatedCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(20,20,20,0.4)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 680,
          maxWidth: "calc(100vw - 16px)",
          maxHeight: "88vh",
          background: "#FFFFFF",
          borderRadius: 24,
          boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
          overflow: "hidden",
          fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5" style={{ borderBottom: "1px solid #F0EDE4", flexShrink: 0 }}>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 36, height: 36, background: "#FFF4C7", border: "1.5px solid #F4D060" }}
            >
              <Sparkles size={16} style={{ color: "#8A6500" }} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#141414" }}>AI 形象照生成</div>
              <div style={{ fontSize: 12, color: "#AAAAAA", marginTop: 1 }}>
                今日剩余生成次数：<span style={{ color: remaining > 0 ? "#8A6500" : "#CC3333", fontWeight: 600 }}>{remaining}</span> / {maxDaily}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full"
            style={{ width: 32, height: 32, background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer" }}
          >
            <X size={14} style={{ color: "#141414" }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-7 py-6" style={{ scrollbarWidth: "thin" }}>
          {/* Person info */}
          <div
            className="flex items-center gap-4 p-4 rounded-2xl mb-6"
            style={{ background: "#F8F6EF", border: "1px solid #EDE9DF" }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", flexShrink: 0, display: "flex" }}>
              <PersonAvatar name={person.name} avatarIndex={person.avatarIndex} size="thumb" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#141414" }}>{person.name}</div>
              <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>{person.title1}</div>
            </div>
            <div className="ml-auto">
              <span style={{
                fontSize: 11, padding: "4px 10px", borderRadius: 99,
                background: "#FFF4C7", color: "#8A6500", border: "1px solid #F4D060",
              }}>
                {person.category}
              </span>
            </div>
          </div>

          {/* Description */}
          <div
            className="flex items-start gap-3 p-4 rounded-xl mb-6"
            style={{ background: "#FFFBF0", border: "1px solid #F4D060" }}
          >
            <Sparkles size={14} style={{ color: "#8A6500", flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 13, color: "#6B4A00", lineHeight: 1.8 }}>
              基于当前人物照片生成形象照，AI 将保留相同人物的五官、脸型、年龄和身份特征，呈现不同场景下的专业形象。每个账号每天最多生成 10 张。
            </p>
          </div>

          {/* Portrait styles */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#141414", marginBottom: 12 }}>选择形象照风格</div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {PORTRAIT_STYLES.map(({ id, icon: Icon, label, desc }) => {
              const active = selectedStyle === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedStyle(id)}
                  className="flex items-start gap-3 p-4 rounded-2xl text-left transition-all duration-150"
                  style={{
                    background: active ? "#FFF9E6" : "#FFFFFF",
                    border: active ? "2px solid #F4C542" : "1.5px solid #E8E3D8",
                    boxShadow: active ? "0 0 0 3px #F4C54220" : "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => !active && ((e.currentTarget as HTMLElement).style.borderColor = "#F4D060")}
                  onMouseLeave={e => !active && ((e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8")}
                >
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{ width: 40, height: 40, background: active ? "#FFF4C7" : "#F8F6EF", flexShrink: 0 }}
                  >
                    <Icon size={18} style={{ color: active ? "#8A6500" : "#777" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#141414", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 11, color: "#777", lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Card generation */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#141414", marginBottom: 12 }}>人物名片生成</div>
          <div className="flex gap-3 mb-6">
            {[
              { label: "生成竖版名片", size: "9:16", color: "#F4C542" },
              { label: "生成横版名片", size: "16:9", color: "#F8F6EF" },
            ].map(({ label, size, color }) => {
              const isThisGenerating = cardGenerating === size;
              return (
                <button
                  key={size}
                  onClick={() => !isThisGenerating && handleCardGenerate(size)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-150"
                  style={{ background: isThisGenerating ? "#E8E3D8" : color, border: color === "#F8F6EF" ? "1.5px solid #E8E3D8" : "none", cursor: isThisGenerating ? "not-allowed" : "pointer", opacity: isThisGenerating ? 0.7 : 1 }}
                  onMouseEnter={e => !isThisGenerating && ((e.currentTarget as HTMLElement).style.opacity = "0.85")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#141414" }}>
                    {isThisGenerating ? "生成中..." : label}
                  </span>
                  {!isThisGenerating && (
                    <span className="rounded px-1.5 py-0.5" style={{ fontSize: 10, background: "rgba(0,0,0,0.08)", color: "#444" }}>
                      {size}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Result preview */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#141414", marginBottom: 12 }}>生成结果</div>
          <div
            className="flex flex-col items-center justify-center rounded-2xl"
            style={{
              minHeight: 200,
              background: "#F8F6EF",
              border: "1.5px solid #E8E3D8",
              overflow: "hidden",
            }}
          >
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4">
                <div
                  className="rounded-full"
                  style={{
                    width: 48,
                    height: 48,
                    border: "3px solid #F4D060",
                    borderTopColor: "#F4C542",
                    animation: "spin 0.9s linear infinite",
                  }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#141414", textAlign: "center", marginBottom: 4 }}>
                    AI 正在生成中
                  </div>
                  <div style={{ fontSize: 12, color: "#777", textAlign: "center" }}>
                    保留五官特征，渲染{PORTRAIT_STYLES.find(s => s.id === selectedStyle)?.label}风格...
                  </div>
                </div>
              </div>
            ) : hasResult ? (
              <div className="w-full">
                <div style={{ position: "relative", height: 240, overflow: "hidden" }}>
                  <PersonAvatar name={person.name} avatarIndex={person.avatarIndex} size="detail" />
                  <div
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.95)", border: "1px solid #E8E3D8", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                  >
                    <Sparkles size={11} style={{ color: "#8A6500" }} />
                    <span style={{ fontSize: 11, color: "#8A6500", fontWeight: 600 }}>
                      {PORTRAIT_STYLES.find(s => s.id === selectedStyle)?.label}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3 p-4">
                  <button
                    onClick={handleSaveToLocal}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all duration-150"
                    style={{ background: savedFeedback ? "#FFF4C7" : "#F8F6EF", border: savedFeedback ? "1.5px solid #F4C542" : "1.5px solid #E8E3D8", cursor: "pointer" }}
                    onMouseEnter={e => !savedFeedback && ((e.currentTarget as HTMLElement).style.borderColor = "#F4C542")}
                    onMouseLeave={e => !savedFeedback && ((e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8")}
                  >
                    <Download size={14} style={{ color: "#555" }} />
                    <span style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>{savedFeedback ? "已保存" : "保存到本地"}</span>
                  </button>
                  <button
                    onClick={handleAddToProfile}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all duration-150"
                    style={{ background: addedFeedback ? "#4CAF50" : "#F4C542", border: "none", cursor: "pointer" }}
                    onMouseEnter={e => !addedFeedback && ((e.currentTarget as HTMLElement).style.background = "#E8B830")}
                    onMouseLeave={e => !addedFeedback && ((e.currentTarget as HTMLElement).style.background = "#F4C542")}
                  >
                    <Plus size={14} style={{ color: addedFeedback ? "#fff" : "#141414" }} />
                    <span style={{ fontSize: 13, color: addedFeedback ? "#fff" : "#141414", fontWeight: 600 }}>{addedFeedback ? "已添加 ✓" : "添加到资料"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12">
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 56, height: 56, background: "#FFF4C7", border: "1.5px solid #F4D060" }}
                >
                  <Sparkles size={22} style={{ color: "#8A6500" }} />
                </div>
                <div style={{ fontSize: 13, color: "#777", textAlign: "center" }}>
                  选择风格后点击「开始生成」<br />即可生成 AI 形象照
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-7 py-4"
          style={{ borderTop: "1px solid #F0EDE4", flexShrink: 0 }}
        >
          <div style={{ fontSize: 12, color: "#AAAAAA" }}>
            {remaining <= 3 && remaining > 0 && (
              <span style={{ color: "#CC8800" }}>⚠ 今日剩余次数不多，请合理使用</span>
            )}
            {remaining === 0 && (
              <span style={{ color: "#CC3333" }}>今日生成次数已用完，明日可继续使用</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full transition-all duration-150"
              style={{ background: "#FFFFFF", border: "1.5px solid #E8E3D8", fontSize: 13, color: "#555", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#F8F6EF"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#FFFFFF"}
            >
              关闭
            </button>
            <button
              onClick={handleGenerate}
              disabled={!selectedStyle || isGenerating || remaining === 0}
              className="px-6 py-2 rounded-full flex items-center gap-2 transition-all duration-150"
              style={{
                background: !selectedStyle || isGenerating || remaining === 0 ? "#E8E3D8" : "#F4C542",
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                color: !selectedStyle || isGenerating || remaining === 0 ? "#AAAAAA" : "#141414",
                cursor: !selectedStyle || isGenerating || remaining === 0 ? "not-allowed" : "pointer",
              }}
            >
              <Sparkles size={14} />
              {isGenerating ? "生成中..." : "开始生成"}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
