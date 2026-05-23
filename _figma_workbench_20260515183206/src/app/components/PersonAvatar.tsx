import { avatarGradients } from "../data/mockData";

interface PersonAvatarProps {
  name: string;
  avatarIndex: number;
  size?: "card" | "detail" | "thumb" | "mini";
  className?: string;
}

export function PersonAvatar({ name, avatarIndex, size = "card", className = "" }: PersonAvatarProps) {
  const g = avatarGradients[avatarIndex % avatarGradients.length];
  const char = name.charAt(0);

  const configs = {
    card: { h: 172, w: "100%", fontSize: 44, silhouetteW: 80, silhouetteH: 110, letterSpacing: "-0.02em", radius: 0 },
    detail: { h: 270, w: "100%", fontSize: 64, silhouetteW: 120, silhouetteH: 180, letterSpacing: "-0.02em", radius: 0 },
    thumb: { h: "100%", w: "100%", fontSize: 20, silhouetteW: 30, silhouetteH: 44, letterSpacing: "0", radius: 0 },
    mini: { h: "100%", w: "100%", fontSize: 14, silhouetteW: 20, silhouetteH: 28, letterSpacing: "0", radius: 0 },
  };

  const c = configs[size];

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center select-none ${className}`}
      style={{
        height: c.h,
        width: c.w,
        background: `linear-gradient(160deg, ${g.from} 0%, ${g.to} 100%)`,
        flexShrink: 0,
      }}
    >
      {/* Portrait silhouette backdrop */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: c.silhouetteW,
          height: c.silhouetteH,
          background: `${g.text}14`,
          borderRadius: "50% 50% 0 0 / 40% 40% 0 0",
        }}
      />
      {/* Small head circle */}
      <div
        className="absolute"
        style={{
          width: c.silhouetteW * 0.5,
          height: c.silhouetteW * 0.5,
          background: `${g.text}18`,
          borderRadius: "50%",
          bottom: c.silhouetteH * 0.72,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />
      <span
        className="relative z-10"
        style={{
          fontSize: c.fontSize,
          color: g.text,
          fontWeight: 700,
          letterSpacing: c.letterSpacing,
          opacity: 0.65,
          fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif",
        }}
      >
        {char}
      </span>
    </div>
  );
}
