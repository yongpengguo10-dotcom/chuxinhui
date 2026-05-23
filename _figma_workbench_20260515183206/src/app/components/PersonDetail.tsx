import { useState, useRef, useCallback, useEffect } from "react";
import { X, ZoomIn, Edit3, Upload, Wand2, Download, Copy, ChevronLeft, ChevronRight, Sparkles, Star, ImagePlus, FolderOpen } from "lucide-react";
import { Person, tagColors } from "../data/mockData";
import { PersonAvatar } from "./PersonAvatar";

interface PersonDetailProps {
  person: Person;
  onEdit: (person: Person) => void;
  onAI: (person: Person) => void;
  onClose: () => void;
  isMobile?: boolean;
}

export function PersonDetail({ person, onEdit, onAI, onClose, isMobile = false }: PersonDetailProps) {
  const [currentImg, setCurrentImg] = useState(0);
  const [copiedInfo, setCopiedInfo] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [mainImgFeedback, setMainImgFeedback] = useState(false);

  // Mobile slide-in animation + swipe-right to close
  const [entered, setEntered] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const lockDir = useRef<"h" | "v" | null>(null);

  useEffect(() => {
    if (isMobile) {
      const id = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id);
    }
  }, [isMobile, person.id]);

  const closeWithAnim = useCallback(() => {
    if (!isMobile) { onClose(); return; }
    setEntered(false);
    setTimeout(onClose, 240);
  }, [isMobile, onClose]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    lockDir.current = null;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !dragging) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (lockDir.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        lockDir.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
    }
    if (lockDir.current === "h" && dx > 0) setDragX(dx);
  };
  const onTouchEnd = () => {
    if (!isMobile) return;
    setDragging(false);
    if (dragX > 100) {
      closeWithAnim();
    }
    setDragX(0);
  };

  const handleSetMainImg = () => {
    setMainImgFeedback(true);
    setTimeout(() => setMainImgFeedback(false), 2000);
  };

  const imageCount = person.imageCount;

  const handleCopyInfo = () => {
    const text = `姓名：${person.name}\n职称：${person.title1}${person.title2 ? "\n" + person.title2 : ""}${person.title3 ? "\n" + person.title3 : ""}\n分类：${person.category}\n标签：${person.tags.join("、")}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedInfo(true);
    setTimeout(() => setCopiedInfo(false), 2000);
  };

  const quickActions = [
    { icon: Edit3, label: "编辑资料", onClick: () => onEdit(person) },
    { icon: Upload, label: "上传图片", onClick: () => setShowUploadModal(true) },
    { icon: Wand2, label: "一键去背景", onClick: () => {} },
    { icon: Download, label: "保存图片", onClick: () => {} },
    { icon: Copy, label: copiedInfo ? "已复制" : "复制信息", onClick: handleCopyInfo },
  ];

  if (isMobile) {
    return (
      <>
        <MobileDetail
          person={person}
          currentImg={currentImg}
          setCurrentImg={setCurrentImg}
          imageCount={imageCount}
          quickActions={quickActions}
          onEdit={onEdit}
          onAI={onAI}
          onClose={closeWithAnim}
          onSetMainImg={handleSetMainImg}
          mainImgFeedback={mainImgFeedback}
          onOpenUpload={() => setShowUploadModal(true)}
          onOpenPreview={() => setShowFullPreview(true)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          entered={entered}
          dragX={dragX}
          dragging={dragging}
        />
        {showUploadModal && <UploadModal personName={person.name} onClose={() => setShowUploadModal(false)} />}
        {showFullPreview && (
          <FullPreviewModal person={person} currentImg={currentImg} onChangeImg={setCurrentImg} onClose={() => setShowFullPreview(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <aside
        className="flex flex-col overflow-y-auto"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width: isMobile ? "100vw" : 400,
          minWidth: isMobile ? "100vw" : 400,
          height: isMobile ? "100vh" : "100%",
          background: "#FAFAF8",
          borderLeft: isMobile ? "none" : "1px solid #E8E3D8",
          fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
          scrollbarWidth: "thin",
          scrollbarColor: "#E8E3D8 transparent",
          ...(isMobile
            ? {
                position: "fixed",
                inset: 0,
                zIndex: 45,
                transform: `translateX(${entered ? dragX : (typeof window !== "undefined" ? window.innerWidth : 400)}px)`,
                transition: dragging ? "none" : "transform 240ms cubic-bezier(0.32, 0.72, 0, 1)",
                boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
                willChange: "transform",
              }
            : null),
        }}
      >
        {/* Yellow accent top bar */}
        <div style={{ height: 4, background: "#F4C542", flexShrink: 0 }} />

        {/* Header */}
        <div className="relative px-5 pt-4 pb-3 flex items-start justify-between" style={{ flexShrink: 0 }}>
          {/* Watermark logo */}
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 pointer-events-none select-none"
            style={{ opacity: 0.06 }}
          >
            <span style={{ fontSize: 32, fontWeight: 900, color: "#141414", fontFamily: "serif", letterSpacing: "-0.02em" }}>初心会</span>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: "#AAAAAA", letterSpacing: "0.08em", textTransform: "uppercase", paddingTop: 2 }}>
            PROFILE
          </div>

          <div className="flex items-center gap-2">
            <ActionCircleBtn icon={ZoomIn} title="查看全图" onClick={() => setShowFullPreview(true)} />
            <ActionCircleBtn icon={X} title="关闭" onClick={closeWithAnim} />
          </div>
        </div>

        {/* Photo area */}
        <div className="mx-5 mb-4 relative" style={{ borderRadius: 16, overflow: "hidden", background: "#F2F0EB", flexShrink: 0 }}>
          <PersonAvatar name={person.name} avatarIndex={person.avatarIndex} size="detail" />

          {/* Image navigation */}
          {imageCount > 1 && (
            <>
              <button
                onClick={() => setCurrentImg(i => (i - 1 + imageCount) % imageCount)}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-150"
                style={{ width: 32, height: 32, background: "rgba(255,255,255,0.9)", border: "1px solid #E8E3D8", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
              >
                <ChevronLeft size={16} style={{ color: "#141414" }} />
              </button>
              <button
                onClick={() => setCurrentImg(i => (i + 1) % imageCount)}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-150"
                style={{ width: 32, height: 32, background: "rgba(255,255,255,0.9)", border: "1px solid #E8E3D8", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
              >
                <ChevronRight size={16} style={{ color: "#141414" }} />
              </button>
              {/* Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {Array.from({ length: imageCount }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImg(i)}
                    style={{
                      width: i === currentImg ? 18 : 6,
                      height: 6,
                      borderRadius: 99,
                      background: i === currentImg ? "#F4C542" : "rgba(255,255,255,0.7)",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      transition: "width 0.2s",
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Person info */}
        <div className="px-5 mb-5 text-center" style={{ flexShrink: 0 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#141414", letterSpacing: "-0.02em", marginBottom: 8 }}>
            {person.name}
          </h2>
          <div style={{ fontSize: 13, color: "#444", lineHeight: 1.8, marginBottom: 12 }}>
            <div>{person.title1}</div>
            {person.title2 && <div>{person.title2}</div>}
            {person.title3 && <div>{person.title3}</div>}
          </div>

          {/* Category + tags */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            <span style={{
              fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 99,
              background: "#FFF4C7", color: "#8A6500", border: "1px solid #F4D060",
              display: "inline-flex", alignItems: "center",
            }}>
              {person.category}
            </span>
            {person.tags.slice(0, 4).map((tag, i) => {
              const tc = tagColors[(i + 1) % tagColors.length];
              return (
                <span key={tag} style={{
                  fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 99,
                  background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`,
                  display: "inline-flex", alignItems: "center",
                }}>
                  {tag}
                </span>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mx-5 mb-5 p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF", flexShrink: 0 }}>
          <div className="flex items-start justify-around gap-1">
            {quickActions.map(({ icon: Icon, label, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex flex-col items-center gap-1.5 transition-all duration-150 rounded-xl p-2"
                style={{ border: "none", background: "transparent", cursor: "pointer", minWidth: 56 }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "#FFF4C7";
                  const iconWrap = el.querySelector(".icon-wrap") as HTMLElement;
                  if (iconWrap) { iconWrap.style.borderColor = "#F4C542"; iconWrap.style.background = "#FFF9E6"; }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "transparent";
                  const iconWrap = el.querySelector(".icon-wrap") as HTMLElement;
                  if (iconWrap) { iconWrap.style.borderColor = "#E8E3D8"; iconWrap.style.background = "#FFFFFF"; }
                }}
              >
                <div
                  className="icon-wrap flex items-center justify-center rounded-full transition-all duration-150"
                  style={{ width: 40, height: 40, background: "#FFFFFF", border: "1.5px solid #E8E3D8" }}
                >
                  <Icon size={16} style={{ color: "#141414" }} />
                </div>
                <span style={{ fontSize: 10, color: "#555", textAlign: "center", whiteSpace: "nowrap", lineHeight: 1.2 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bio section */}
        <Section title="人物简介">
          {person.bio ? (
            <p style={{ fontSize: 13, color: "#444", lineHeight: 1.9 }}>{person.bio}</p>
          ) : (
            <p style={{ fontSize: 13, color: "#AAAAAA", fontStyle: "italic" }}>暂无人物简介</p>
          )}
        </Section>

        {/* Info section */}
        <Section title="人物信息">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "分类", value: person.category },
              { label: "创建人", value: person.createdBy },
              { label: "图片数量", value: `${person.imageCount} 张` },
              { label: "当前图片", value: `第 ${currentImg + 1} 张` },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: "#AAAAAA", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: "#141414", fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Materials section */}
        <Section title="素材操作">
          <div className="flex items-center gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
            {Array.from({ length: person.imageCount }).map((_, i) => (
              <div
                key={i}
                className="relative flex-shrink-0 rounded-xl overflow-hidden cursor-pointer group"
                style={{
                  width: 60,
                  height: 72,
                  border: i === currentImg ? "2px solid #F4C542" : "1.5px solid #E8E3D8",
                  boxShadow: i === currentImg ? "0 0 0 2px #F4C54240" : "none",
                  display: "flex",
                }}
                onClick={() => setCurrentImg(i)}
              >
                <PersonAvatar name={person.name} avatarIndex={person.avatarIndex} size="thumb" />
                <div
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full hidden group-hover:flex items-center justify-center"
                  style={{ background: "rgba(220,50,50,0.9)" }}
                >
                  <X size={8} style={{ color: "#fff" }} />
                </div>
              </div>
            ))}

            <button
              className="flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-150"
              style={{ width: 60, height: 72, background: "#F8F6EF", border: "1.5px dashed #D0C8B0", cursor: "pointer" }}
              onClick={() => setShowUploadModal(true)}
            >
              <span style={{ fontSize: 20, color: "#C0B898" }}>+</span>
            </button>
          </div>
          <button
            onClick={handleSetMainImg}
            className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all duration-150"
            style={{
              background: mainImgFeedback ? "#FFF4C7" : "#F8F6EF",
              border: mainImgFeedback ? "1.5px solid #F4C542" : "1.5px solid #E8E3D8",
              cursor: "pointer",
            }}
            onMouseEnter={e => { if (!mainImgFeedback) { (e.currentTarget as HTMLElement).style.borderColor = "#F4C542"; (e.currentTarget as HTMLElement).style.background = "#FFF9E6"; } }}
            onMouseLeave={e => { if (!mainImgFeedback) { (e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8"; (e.currentTarget as HTMLElement).style.background = "#F8F6EF"; } }}
          >
            <Star size={13} style={{ color: "#8A6500" }} />
            <span style={{ fontSize: 12, color: "#8A6500", fontWeight: 500 }}>
              {mainImgFeedback ? `已设第 ${currentImg + 1} 张为主图` : "设为主图"}
            </span>
          </button>
        </Section>

        {/* AI section */}
        <Section title="AI形象照">
          <p style={{ fontSize: 12, color: "#777", lineHeight: 1.7, marginBottom: 12 }}>
            基于当前人物照片生成形象照与人物名片。保留五官、脸型、年龄特征，每账号每日最多生成 10 张。
          </p>
          <button
            onClick={() => onAI(person)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-150"
            style={{ background: "#F4C542", border: "none", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#E8B830"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#F4C542"}
          >
            <Sparkles size={14} style={{ color: "#141414" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#141414" }}>开始生成</span>
          </button>
        </Section>

        <div style={{ height: 24, flexShrink: 0 }} />
      </aside>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal personName={person.name} onClose={() => setShowUploadModal(false)} />
      )}

      {/* Full Preview Modal */}
      {showFullPreview && (
        <FullPreviewModal
          person={person}
          currentImg={currentImg}
          onChangeImg={setCurrentImg}
          onClose={() => setShowFullPreview(false)}
        />
      )}
    </>
  );
}

function FullPreviewModal({
  person,
  currentImg,
  onChangeImg,
  onClose,
}: {
  person: Person;
  currentImg: number;
  onChangeImg: (i: number) => void;
  onClose: () => void;
}) {
  const count = person.imageCount;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 flex items-center justify-center rounded-full transition-all duration-150"
        style={{ width: 40, height: 40, background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)", cursor: "pointer" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.22)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"}
      >
        <X size={16} style={{ color: "#fff" }} />
      </button>

      {/* Prev button */}
      {count > 1 && (
        <button
          onClick={() => onChangeImg((currentImg - 1 + count) % count)}
          className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-150"
          style={{ width: 44, height: 44, background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)", cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.22)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"}
        >
          <ChevronLeft size={20} style={{ color: "#fff" }} />
        </button>
      )}

      {/* Next button */}
      {count > 1 && (
        <button
          onClick={() => onChangeImg((currentImg + 1) % count)}
          className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all duration-150"
          style={{ width: 44, height: 44, background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)", cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.22)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"}
        >
          <ChevronRight size={20} style={{ color: "#fff" }} />
        </button>
      )}

      {/* Image container */}
      <div
        className="flex flex-col items-center gap-4"
        style={{ maxWidth: "80vw", maxHeight: "90vh" }}
      >
        <div
          className="rounded-2xl overflow-hidden flex items-center justify-center"
          style={{ maxWidth: "70vw", maxHeight: "75vh", background: "#1A1A1A", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}
        >
          <PersonAvatar name={person.name} avatarIndex={person.avatarIndex} size="detail" />
        </div>

        {/* Info bar */}
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{person.name}</span>
          {count > 1 && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{currentImg + 1} / {count}</span>
          )}
        </div>

        {/* Dot indicators */}
        {count > 1 && (
          <div className="flex items-center gap-2">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                onClick={() => onChangeImg(i)}
                style={{
                  width: i === currentImg ? 20 : 7,
                  height: 7,
                  borderRadius: 99,
                  background: i === currentImg ? "#F4C542" : "rgba(255,255,255,0.3)",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  transition: "width 0.2s, background 0.2s",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadModal({ personName, onClose }: { personName: string; onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).filter(f => f.type.startsWith("image/"));
    setFiles(prev => [...prev, ...arr]);
    arr.forEach(f => {
      const reader = new FileReader();
      reader.onload = e => setPreviews(prev => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: 480,
          maxWidth: "calc(100vw - 16px)",
          maxHeight: "85vh",
          background: "#FAFAF8",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ height: 4, background: "#F4C542", flexShrink: 0 }} />
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #EDE9DF", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#141414" }}>上传图片</div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>为 {personName} 添加照片</div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full transition-all duration-150"
            style={{ width: 32, height: 32, background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFF4C7"; (e.currentTarget as HTMLElement).style.borderColor = "#F4C542"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#F8F6EF"; (e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8"; }}
          >
            <X size={14} style={{ color: "#141414" }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 p-6 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer transition-all duration-150"
            style={{
              minHeight: 160,
              border: dragging ? "2px dashed #F4C542" : "2px dashed #D0C8B0",
              background: dragging ? "#FFF9E6" : "#F8F6EF",
            }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 52, height: 52, background: dragging ? "#FFF4C7" : "#FFFFFF", border: "1.5px solid #E8E3D8" }}
            >
              <ImagePlus size={22} style={{ color: dragging ? "#F4C542" : "#AAAAAA" }} />
            </div>
            <div className="text-center">
              <div style={{ fontSize: 14, fontWeight: 600, color: "#141414" }}>拖拽图片到此处</div>
              <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>或点击选择文件 · 支持 JPG、PNG、WebP</div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />

          {/* Buttons row */}
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 transition-all duration-150"
              style={{ background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#F4C542"; (e.currentTarget as HTMLElement).style.background = "#FFF9E6"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8"; (e.currentTarget as HTMLElement).style.background = "#F8F6EF"; }}
            >
              <FolderOpen size={14} style={{ color: "#555" }} />
              <span style={{ fontSize: 13, color: "#555", fontWeight: 500 }}>选择文件</span>
            </button>
          </div>

          {/* Preview grid */}
          {previews.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 8 }}>已选择 {files.length} 张</div>
              <div className="grid grid-cols-4 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden" style={{ aspectRatio: "1", background: "#F2F0EB" }}>
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      style={{ background: "rgba(220,50,50,0.9)" }}
                    >
                      <X size={10} style={{ color: "#fff" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid #EDE9DF", flexShrink: 0 }}>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full transition-all duration-150"
            style={{ background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer", fontSize: 13, color: "#555", fontWeight: 500 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#AAAAAA"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8"; }}
          >
            取消
          </button>
          <button
            onClick={() => { if (files.length > 0) onClose(); }}
            className="px-5 py-2 rounded-full transition-all duration-150"
            style={{
              background: files.length > 0 ? "#F4C542" : "#F2F0EB",
              border: "none",
              cursor: files.length > 0 ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 600,
              color: files.length > 0 ? "#141414" : "#AAAAAA",
            }}
            onMouseEnter={e => { if (files.length > 0) (e.currentTarget as HTMLElement).style.background = "#E8B830"; }}
            onMouseLeave={e => { if (files.length > 0) (e.currentTarget as HTMLElement).style.background = "#F4C542"; }}
          >
            上传 {files.length > 0 ? `(${files.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="mx-5 mb-3 p-4 rounded-2xl"
      style={{ background: "#FFFFFF", border: "1px solid #EDE9DF", flexShrink: 0 }}
    >
      <h4 style={{ fontSize: 13, fontWeight: 700, color: "#141414", marginBottom: 10 }}>{title}</h4>
      {children}
    </div>
  );
}

function ActionCircleBtn({ icon: Icon, title, onClick }: { icon: any; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex items-center justify-center rounded-full transition-all duration-150"
      style={{ width: 32, height: 32, background: "#F8F6EF", border: "1.5px solid #E8E3D8", cursor: "pointer" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#FFF4C7"; (e.currentTarget as HTMLElement).style.borderColor = "#F4C542"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#F8F6EF"; (e.currentTarget as HTMLElement).style.borderColor = "#E8E3D8"; }}
    >
      <Icon size={14} style={{ color: "#141414" }} />
    </button>
  );
}

interface MobileDetailProps {
  person: Person;
  currentImg: number;
  setCurrentImg: (i: number | ((p: number) => number)) => void;
  imageCount: number;
  quickActions: { icon: any; label: string; onClick: () => void }[];
  onEdit: (p: Person) => void;
  onAI: (p: Person) => void;
  onClose: () => void;
  onSetMainImg: () => void;
  mainImgFeedback: boolean;
  onOpenUpload: () => void;
  onOpenPreview: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  entered: boolean;
  dragX: number;
  dragging: boolean;
}

function MobileDetail({
  person, currentImg, setCurrentImg, imageCount, quickActions,
  onEdit, onAI, onClose, onSetMainImg, mainImgFeedback, onOpenUpload, onOpenPreview,
  onTouchStart, onTouchMove, onTouchEnd, entered, dragX, dragging,
}: MobileDetailProps) {
  const [tab, setTab] = useState<"bio" | "info" | "media" | "ai">("bio");
  const winW = typeof window !== "undefined" ? window.innerWidth : 400;

  return (
    <aside
      className="flex flex-col overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 45,
        background: "#FAFAF8",
        fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
        transform: `translateX(${entered ? dragX : winW}px)`,
        transition: dragging ? "none" : "transform 240ms cubic-bezier(0.32, 0.72, 0, 1)",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
        willChange: "transform",
      }}
    >
      {/* Sticky top bar */}
      <div
        className="flex items-center gap-2 px-3"
        style={{
          height: 52,
          background: "rgba(250,250,248,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #EDE9DF",
          flexShrink: 0,
          position: "relative",
          zIndex: 2,
        }}
      >
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-full"
          style={{ width: 34, height: 34, background: "#FFFFFF", border: "1.5px solid #E8E3D8", cursor: "pointer", flexShrink: 0 }}
        >
          <ChevronLeft size={16} style={{ color: "#141414" }} />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <div style={{ fontSize: 15, fontWeight: 700, color: "#141414", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {person.name}
          </div>
          <div style={{ fontSize: 10, color: "#AAAAAA", letterSpacing: "0.08em" }}>PROFILE</div>
        </div>
        <button
          onClick={() => onEdit(person)}
          className="flex items-center gap-1 px-3 rounded-full"
          style={{ height: 34, background: "#F4C542", border: "none", cursor: "pointer", flexShrink: 0 }}
        >
          <Edit3 size={13} style={{ color: "#141414" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#141414" }}>编辑</span>
        </button>
      </div>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {/* Hero image */}
        <div className="relative" style={{ width: "100%", aspectRatio: "1 / 1", background: "#F2F0EB", display: "flex", overflow: "hidden" }} onClick={onOpenPreview}>
          <PersonAvatar name={person.name} avatarIndex={person.avatarIndex} size="detail" />
          {imageCount > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setCurrentImg(i => (i - 1 + imageCount) % imageCount); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full"
                style={{ width: 36, height: 36, background: "rgba(255,255,255,0.92)", border: "1px solid #E8E3D8" }}
              >
                <ChevronLeft size={16} style={{ color: "#141414" }} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setCurrentImg(i => (i + 1) % imageCount); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full"
                style={{ width: 36, height: 36, background: "rgba(255,255,255,0.92)", border: "1px solid #E8E3D8" }}
              >
                <ChevronRight size={16} style={{ color: "#141414" }} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {Array.from({ length: imageCount }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: i === currentImg ? 20 : 6,
                      height: 6,
                      borderRadius: 99,
                      background: i === currentImg ? "#F4C542" : "rgba(255,255,255,0.75)",
                      transition: "width 0.2s",
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Identity block */}
        <div className="px-5 pt-4 pb-3">
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#141414", letterSpacing: "-0.02em", marginBottom: 6 }}>
            {person.name}
          </h2>
          <div style={{ fontSize: 13, color: "#444", lineHeight: 1.7, marginBottom: 10 }}>
            {[person.title1, person.title2, person.title3].filter(Boolean).join(" · ")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span style={{
              fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 99,
              background: "#FFF4C7", color: "#8A6500", border: "1px solid #F4D060",
            }}>{person.category}</span>
            {person.tags.slice(0, 4).map((tag, i) => {
              const tc = tagColors[(i + 1) % tagColors.length];
              return (
                <span key={tag} style={{
                  fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 99,
                  background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`,
                }}>{tag}</span>
              );
            })}
          </div>
        </div>

        {/* Quick action bar */}
        <div className="px-3 pb-3">
          <div
            className="flex items-center justify-between gap-1 p-2 rounded-2xl"
            style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}
          >
            {quickActions.map(({ icon: Icon, label, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="flex flex-col items-center gap-1 flex-1 py-1.5 rounded-xl"
                style={{ background: "transparent", border: "none", cursor: "pointer", minWidth: 0 }}
              >
                <div className="flex items-center justify-center rounded-full" style={{ width: 34, height: 34, background: "#F8F6EF", border: "1px solid #E8E3D8" }}>
                  <Icon size={14} style={{ color: "#141414" }} />
                </div>
                <span style={{ fontSize: 10, color: "#555", whiteSpace: "nowrap" }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-3" style={{ position: "sticky", top: 0, background: "#FAFAF8", zIndex: 1, paddingBottom: 8 }}>
          <div
            className="flex items-center p-1 rounded-full"
            style={{ background: "#F0EDE4" }}
          >
            {[
              { key: "bio", label: "简介" },
              { key: "info", label: "信息" },
              { key: "media", label: "素材" },
              { key: "ai", label: "AI" },
            ].map(t => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as any)}
                  className="flex-1 rounded-full transition-all duration-150"
                  style={{
                    height: 32,
                    background: active ? "#FFFFFF" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    color: active ? "#141414" : "#777",
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-3 pb-6">
          {tab === "bio" && (
            <div className="p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
              {person.bio ? (
                <p style={{ fontSize: 13, color: "#444", lineHeight: 1.9 }}>{person.bio}</p>
              ) : (
                <p style={{ fontSize: 13, color: "#AAAAAA", fontStyle: "italic" }}>暂无人物简介</p>
              )}
            </div>
          )}

          {tab === "info" && (
            <div className="p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "分类", value: person.category },
                  { label: "创建人", value: person.createdBy },
                  { label: "图片数量", value: `${person.imageCount} 张` },
                  { label: "当前图片", value: `第 ${currentImg + 1} 张` },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: "#AAAAAA", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 13, color: "#141414", fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "media" && (
            <div className="p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {Array.from({ length: person.imageCount }).map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setCurrentImg(i)}
                    className="relative rounded-xl overflow-hidden"
                    style={{
                      aspectRatio: "3 / 4",
                      border: i === currentImg ? "2px solid #F4C542" : "1.5px solid #E8E3D8",
                      cursor: "pointer",
                      display: "flex",
                    }}
                  >
                    <PersonAvatar name={person.name} avatarIndex={person.avatarIndex} size="thumb" />
                  </div>
                ))}
                <button
                  onClick={onOpenUpload}
                  className="flex items-center justify-center rounded-xl"
                  style={{ aspectRatio: "3 / 4", background: "#F8F6EF", border: "1.5px dashed #D0C8B0", cursor: "pointer" }}
                >
                  <span style={{ fontSize: 22, color: "#C0B898" }}>+</span>
                </button>
              </div>
              <button
                onClick={onSetMainImg}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5"
                style={{
                  background: mainImgFeedback ? "#FFF4C7" : "#F8F6EF",
                  border: mainImgFeedback ? "1.5px solid #F4C542" : "1.5px solid #E8E3D8",
                  cursor: "pointer",
                }}
              >
                <Star size={13} style={{ color: "#8A6500" }} />
                <span style={{ fontSize: 12, color: "#8A6500", fontWeight: 500 }}>
                  {mainImgFeedback ? `已设第 ${currentImg + 1} 张为主图` : "设为主图"}
                </span>
              </button>
            </div>
          )}

          {tab === "ai" && (
            <div className="p-4 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
              <p style={{ fontSize: 12, color: "#777", lineHeight: 1.7, marginBottom: 12 }}>
                基于当前人物照片生成形象照与人物名片。保留五官、脸型、年龄特征，每账号每日最多生成 10 张。
              </p>
              <button
                onClick={() => onAI(person)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full"
                style={{ background: "#F4C542", border: "none", cursor: "pointer" }}
              >
                <Sparkles size={14} style={{ color: "#141414" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#141414" }}>开始生成</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
