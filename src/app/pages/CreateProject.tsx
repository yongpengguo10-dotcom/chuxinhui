import { useState } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { Project } from "../data/projects";
import { PageShell } from "../components/PageShell";
import { DateTimePicker } from "../components/DateTimePicker";
import { NavKey } from "../components/Sidebar";

interface CreateProjectProps {
  existingSeries: string[];
  onCreate: (p: Omit<Project, "completion" | "riskCount" | "imageCount" | "pendingReviewCount">) => void;
  onNavigate: (key: NavKey) => void;
  isMobile: boolean;
  onOpenDrawer: () => void;
  showToast: (msg: string) => void;
}

const PHASES = ["立项启动", "市场预热", "集中邀约", "活动执行", "活动复盘"];

export function CreateProject({
  existingSeries, onCreate, onNavigate, isMobile, onOpenDrawer, showToast,
}: CreateProjectProps) {
  const [series, setSeries] = useState(existingSeries[0] ?? "");
  const [customSeries, setCustomSeries] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [phase, setPhase] = useState(PHASES[0]);
  const [owner, setOwner] = useState("");
  const [goals, setGoals] = useState("");
  const [notes, setNotes] = useState("");

  const finalSeries = series === "__new__" ? customSeries.trim() : series;
  const canSubmit = finalSeries && name.trim() && date && owner.trim();

  const handleSubmit = () => {
    if (!canSubmit) {
      showToast("请填写必填项");
      return;
    }
    const id = `p_${Date.now().toString(36)}`;
    onCreate({
      id,
      series: finalSeries,
      name: name.trim(),
      fullName: `${finalSeries} · ${name.trim()}`,
      date,
      phase,
      owner: owner.trim(),
      goals: goals.trim() || "未设置",
      notes: notes.trim() || undefined,
    });
    showToast(`项目「${finalSeries} · ${name.trim()}」已创建`);
    onNavigate("control.board");
  };

  return (
    <PageShell
      title="创建项目"
      breadcrumb="项目总控 / 创建项目"
      description="设置基础信息后即可进入任务分发"
      isMobile={isMobile}
      onOpenDrawer={onOpenDrawer}
    >
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", alignItems: "start", width: "100%" }}
      >
        <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
          <Row label="项目系列" required>
            <select
              value={series}
              onChange={e => setSeries(e.target.value)}
              style={inputStyle}
            >
              {existingSeries.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="__new__">+ 新建系列</option>
            </select>
            {series === "__new__" && (
              <input
                value={customSeries}
                onChange={e => setCustomSeries(e.target.value)}
                placeholder="输入新系列名称"
                style={{ ...inputStyle, marginTop: 8 }}
              />
            )}
          </Row>

          <Row label="项目名称" required>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="如：2026年7月课程"
              style={inputStyle}
            />
          </Row>

          <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
            <Row label="活动日期" required>
              <DateTimePicker value={date} onChange={setDate} placeholder="选择活动日期" />
            </Row>

            <Row label="项目阶段">
              <select value={phase} onChange={e => setPhase(e.target.value)} style={inputStyle}>
                {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Row>
          </div>
        </div>

        <div className="rounded-2xl p-5 flex flex-col h-full" style={{ background: "#FFFFFF", border: "1px solid #EDE9DF" }}>
          <Row label="项目负责人" required>
            <input
              value={owner}
              onChange={e => setOwner(e.target.value)}
              placeholder="负责人姓名"
              style={inputStyle}
            />
          </Row>

          <Row label="项目目标">
            <input
              value={goals}
              onChange={e => setGoals(e.target.value)}
              placeholder="如：报名80人 · 到场60人 · 成交20人"
              style={inputStyle}
            />
          </Row>

          <Row label="备注说明" className="flex-1">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="可选"
              rows={4}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", minHeight: 80 }}
            />
          </Row>

          <div className="flex items-center justify-end gap-2 mt-auto pt-4" style={{ borderTop: "1px solid #F0EDE4" }}>
            <button
              onClick={() => onNavigate("overview")}
              className="px-4 py-2 rounded-full"
              style={{ background: "#FFFFFF", border: "1px solid #E8E3D8", cursor: "pointer", fontSize: 13, color: "#555" }}
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full"
              style={{
              background: canSubmit ? "#F4C542" : "#F0EDE4",
              border: `1px solid ${canSubmit ? "#E0B232" : "#E8E3D8"}`,
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontSize: 13, color: canSubmit ? "#141414" : "#AAA", fontWeight: 600,
            }}
          >
            <Sparkles size={13} /> 创建并进入任务分发 <ChevronRight size={13} />
          </button>
        </div>
      </div>
      </div>
    </PageShell>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid #E8E3D8",
  background: "#FAFAF8",
  fontSize: 13,
  color: "#141414",
  outline: "none",
};

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "#CC3333" }}>*</span>}
      </div>
      {children}
    </div>
  );
}
