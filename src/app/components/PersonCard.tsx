import { Person, tagColors } from "../data/mockData";
import { PersonAvatar } from "./PersonAvatar";

interface PersonCardProps {
  person: Person;
  selected: boolean;
  active: boolean;
  onToggleSelect: (id: string) => void;
  onClick: (person: Person) => void;
}

export function PersonCard({ person, selected, active, onToggleSelect, onClick }: PersonCardProps) {
  const displayTags = person.tags.slice(0, 4);
  const coverPhoto = person.photos?.[person.currentImageIndex] ?? person.photos?.[0];

  return (
    <div
      onClick={() => onClick(person)}
      className="relative flex flex-col cursor-pointer transition-all duration-200"
      style={{
        background: "#FFFFFF",
        border: selected ? "2px solid #F4C542" : active ? "2px solid #F4C54280" : "1px solid #E8E3D8",
        borderRadius: 18,
        boxShadow: selected
          ? "0 0 0 3px #F4C54228, 0 4px 16px rgba(0,0,0,0.06)"
          : "0 2px 8px rgba(0,0,0,0.04)",
        overflow: "hidden",
        fontFamily: "'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif",
        transition: "box-shadow 0.2s, border 0.2s, transform 0.15s",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        if (!selected) el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.09)";
        el.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = selected ? "0 0 0 3px #F4C54228, 0 4px 16px rgba(0,0,0,0.06)" : "0 2px 8px rgba(0,0,0,0.04)";
        el.style.transform = "translateY(0)";
      }}
    >
      {/* Checkbox */}
      <div
        className="absolute top-3 left-3 z-10 flex items-center justify-center rounded cursor-pointer transition-all duration-150"
        style={{
          width: 20,
          height: 20,
          background: selected ? "#F4C542" : "#FFFFFF",
          border: selected ? "2px solid #F4C542" : "1.5px solid #D0C8B0",
          borderRadius: 6,
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}
        onClick={e => { e.stopPropagation(); onToggleSelect(person.id); }}
      >
        {selected && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#141414" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Photo area */}
      <div style={{ background: "#F8F7F3" }}>
        <PersonAvatar
          name={person.name}
          avatarIndex={person.avatarIndex}
          src={coverPhoto}
          imageOffsetX={person.imageOffsetX}
          imageOffsetY={person.imageOffsetY}
          imageScale={person.imageScale}
          size="card"
        />
      </div>

      {/* Info */}
      <div className="px-4 pt-3.5 pb-4">
        <div style={{ fontSize: 16, fontWeight: 700, color: "#141414", marginBottom: 2, lineHeight: 1.3 }}>
          {person.name}
        </div>
        <div style={{ fontSize: 12, color: "#777777", marginBottom: 10, lineHeight: 1.4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          {person.title1}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {/* Category tag */}
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: "3px 8px",
              borderRadius: 99,
              background: "#FFF4C7",
              color: "#8A6500",
              border: "1px solid #F4D060",
              height: 22,
              display: "inline-flex",
              alignItems: "center",
              whiteSpace: "nowrap",
            }}
          >
            {person.category}
          </span>
          {displayTags.slice(0, 3).map((tag, i) => {
            const tc = tagColors[(i + 1) % tagColors.length];
            return (
              <span
                key={tag}
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: "3px 7px",
                  borderRadius: 99,
                  background: tc.bg,
                  color: tc.text,
                  border: `1px solid ${tc.border}`,
                  height: 22,
                  display: "inline-flex",
                  alignItems: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {tag}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
