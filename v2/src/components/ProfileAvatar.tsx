import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import * as avataaars from "@dicebear/avataaars";
import type { Options as AvataaarsOptions } from "@dicebear/avataaars";
import { defaultAvatarConfig, sanitizeAvatarConfig } from "@/lib/avatar";
import type { AvatarConfig, Profile } from "@/types";

type AvatarSize = "small" | "medium" | "large" | "preview";

function createAvatarUri(config: AvatarConfig) {
  return createAvatar(avataaars, {
    seed: config.seed,
    style: ["circle"],
    top: [config.top] as AvataaarsOptions["top"],
    topProbability: 100,
    hairColor: [config.hairColor],
    hatColor: [config.hatColor],
    eyes: [config.eyes] as AvataaarsOptions["eyes"],
    eyebrows: [config.eyebrows] as AvataaarsOptions["eyebrows"],
    mouth: [config.mouth] as AvataaarsOptions["mouth"],
    skinColor: [config.skinColor],
    accessories:
      config.accessories === "none"
        ? undefined
        : ([config.accessories] as AvataaarsOptions["accessories"]),
    accessoriesProbability: config.accessories === "none" ? 0 : 100,
    facialHair:
      config.facialHair === "none"
        ? undefined
        : ([config.facialHair] as AvataaarsOptions["facialHair"]),
    facialHairProbability: config.facialHair === "none" ? 0 : 100,
    clothing: [config.clothing] as AvataaarsOptions["clothing"],
    clothesColor: [config.clothesColor],
  }).toDataUri();
}

export function ProfileAvatar({
  profile,
  config,
  size = "medium",
  decorative = false,
}: {
  profile: Pick<Profile, "id" | "displayName" | "avatarUrl" | "avatarConfig">;
  config?: AvatarConfig;
  size?: AvatarSize;
  decorative?: boolean;
}) {
  const customConfig = config
    ? sanitizeAvatarConfig(config, profile.id)
    : profile.avatarConfig
      ? sanitizeAvatarConfig(profile.avatarConfig, profile.id)
      : undefined;
  const generatedConfig =
    customConfig ??
    (profile.avatarUrl ? undefined : defaultAvatarConfig(profile.id));
  const generatedUri = useMemo(
    () => (generatedConfig ? createAvatarUri(generatedConfig) : undefined),
    [generatedConfig],
  );
  const source = generatedUri ?? profile.avatarUrl;
  const earrings = customConfig?.earrings ?? "none";

  return (
    <span
      className={`profile-avatar size-${size} earrings-${earrings}`}
      aria-hidden={decorative || undefined}
    >
      {source ? (
        <img
          alt={decorative ? "" : `Avatar de ${profile.displayName}`}
          src={source}
        />
      ) : (
        <span>{profile.displayName.slice(0, 1).toUpperCase()}</span>
      )}
      {earrings !== "none" ? (
        <>
          <i className="avatar-earring left" aria-hidden="true" />
          <i className="avatar-earring right" aria-hidden="true" />
        </>
      ) : null}
    </span>
  );
}
