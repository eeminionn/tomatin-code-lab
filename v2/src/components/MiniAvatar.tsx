import { useId } from "react";
import type { AvatarConfig } from "@/types";

export function MiniAvatar({ config }: { config: AvatarConfig }) {
  const clipId = `mini-${useId().replaceAll(":", "")}`;
  const bodyShape =
    config.miniBody === "square"
      ? { x: 25, y: 18, width: 70, height: 86, rx: 20 }
      : config.miniBody === "bean"
        ? { x: 30, y: 13, width: 60, height: 94, rx: 30 }
        : { x: 23, y: 15, width: 74, height: 90, rx: 37 };

  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Mini del taller">
      <defs>
        <clipPath id={clipId}>
          <rect {...bodyShape} />
        </clipPath>
      </defs>
      <circle cx="60" cy="60" r="58" fill="#0d1b15" />
      <rect
        {...bodyShape}
        fill={`#${config.miniBodyColor}`}
        stroke="#dce7e1"
        strokeWidth="2"
      />

      {config.miniHair === "sprout" ? (
        <path d="M51 17 46 7M59 15 60 4M68 17 75 7" fill="none" stroke="#20332b" strokeLinecap="round" strokeWidth="4" />
      ) : null}
      {config.miniHair === "tuft" ? (
        <path d="M47 18c3-13 16-15 23-5-8-3-10 2-11 7" fill="#20332b" />
      ) : null}
      {config.miniHair === "side" ? (
        <path d="M31 29c8-14 20-18 34-14-11 2-20 8-25 18" fill="#20332b" />
      ) : null}
      {config.miniHair === "cap" ? (
        <path d="M32 24c8-13 41-16 55 1l-5 7H34Z" fill={`#${config.miniAccentColor}`} stroke="#dce7e1" strokeWidth="2" />
      ) : null}

      <g clipPath={`url(#${clipId})`}>
        <path d="M17 75h86v38H17z" fill={`#${config.miniAccentColor}`} />
        {config.miniOutfit === "hoodie" ? (
          <path d="M43 76c2 13 32 13 34 0M60 84v20" fill="none" stroke="#dce7e1" strokeOpacity=".55" strokeWidth="2" />
        ) : null}
        {config.miniOutfit === "apron" ? (
          <path d="M43 73h34l5 38H38z" fill="#214c3c" stroke="#dce7e1" strokeOpacity=".6" strokeWidth="2" />
        ) : null}
        {config.miniOutfit === "jacket" ? (
          <path d="M60 75v38M42 82l18 10 18-10" fill="none" stroke="#dce7e1" strokeOpacity=".65" strokeWidth="2" />
        ) : null}
        {config.miniOutfit === "tee" ? (
          <path d="m50 82 10 8 10-8" fill="none" stroke="#dce7e1" strokeOpacity=".65" strokeWidth="2" />
        ) : null}
      </g>

      {config.miniAccessory === "visor" ? (
        <rect x="35" y="37" width="50" height="23" rx="10" fill="#163c4d" stroke="#dce7e1" strokeWidth="3" />
      ) : (
        <g>
          {config.miniEyes === "happy" ? (
            <path d="M39 48q7-8 14 0M67 48q7-8 14 0" fill="none" stroke="#17231e" strokeLinecap="round" strokeWidth="4" />
          ) : config.miniEyes === "focused" ? (
            <g fill="#17231e"><rect x="41" y="43" width="10" height="7" rx="3" /><rect x="69" y="43" width="10" height="7" rx="3" /></g>
          ) : config.miniEyes === "wink" ? (
            <g><circle cx="46" cy="47" r="5" fill="#17231e" /><path d="M69 48h11" stroke="#17231e" strokeLinecap="round" strokeWidth="4" /></g>
          ) : (
            <g><circle cx="46" cy="47" r="6" fill="#fff" /><circle cx="74" cy="47" r="6" fill="#fff" /><circle cx="46" cy="47" r="3" fill="#17231e" /><circle cx="74" cy="47" r="3" fill="#17231e" /></g>
          )}
          {config.miniAccessory === "glasses" ? (
            <path d="M34 40h23v17H34zM63 40h23v17H63zM57 46h6" fill="none" stroke="#20332b" strokeWidth="3" />
          ) : null}
        </g>
      )}

      {config.miniMouth === "grin" ? (
        <path d="M46 62q14 18 28 0z" fill="#fff" stroke="#17231e" strokeWidth="2" />
      ) : config.miniMouth === "calm" ? (
        <path d="M51 67h18" stroke="#17231e" strokeLinecap="round" strokeWidth="3" />
      ) : config.miniMouth === "surprised" ? (
        <circle cx="60" cy="67" r="6" fill="#17231e" />
      ) : (
        <path d="M49 63q11 12 22 0" fill="none" stroke="#17231e" strokeLinecap="round" strokeWidth="3" />
      )}

      {config.miniAccessory === "headphones" ? (
        <path d="M29 52v15M91 52v15M30 54c0-31 60-31 60 0" fill="none" stroke="#20332b" strokeLinecap="round" strokeWidth="6" />
      ) : null}
    </svg>
  );
}
