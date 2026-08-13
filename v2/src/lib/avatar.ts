import type { AvatarConfig } from "@/types";

export const AVATAR_TOPS = [
  ["shortFlat", "Corto"],
  ["shortWaved", "Ondulado"],
  ["shortCurly", "Rizado"],
  ["theCaesarAndSidePart", "Peinado"],
  ["bob", "Bob"],
  ["bun", "Moño"],
  ["curly", "Rizos largos"],
  ["longButNotTooLong", "Largo"],
  ["hat", "Sombrero"],
  ["winterHat1", "Gorro"],
  ["winterHat03", "Gorro alto"],
  ["turban", "Turbante"],
] as const;

export const AVATAR_EYES = [
  ["default", "Normal"],
  ["happy", "Felices"],
  ["wink", "Guiño"],
  ["side", "Al lado"],
  ["squint", "Entrecerrados"],
  ["surprised", "Sorpresa"],
  ["hearts", "Corazones"],
  ["closed", "Cerrados"],
] as const;

export const AVATAR_EYEBROWS = [
  ["defaultNatural", "Natural"],
  ["flatNatural", "Rectas"],
  ["raisedExcitedNatural", "Levantadas"],
  ["upDownNatural", "Asimétricas"],
  ["frownNatural", "Concentradas"],
  ["unibrowNatural", "Unidas"],
] as const;

export const AVATAR_MOUTHS = [
  ["smile", "Sonrisa"],
  ["default", "Normal"],
  ["twinkle", "Contenta"],
  ["tongue", "Lengua"],
  ["serious", "Seria"],
  ["disbelief", "Duda"],
  ["grimace", "Tensión"],
] as const;

export const AVATAR_ACCESSORIES = [
  ["none", "Sin lentes"],
  ["round", "Redondos"],
  ["wayfarers", "Clásicos"],
  ["prescription01", "Delgados"],
  ["sunglasses", "Sol"],
  ["eyepatch", "Parche"],
] as const;

export const AVATAR_FACIAL_HAIR = [
  ["none", "Sin vello"],
  ["moustacheFancy", "Bigote"],
  ["beardLight", "Barba corta"],
  ["beardMedium", "Barba"],
] as const;

export const AVATAR_CLOTHING = [
  ["hoodie", "Polerón"],
  ["shirtCrewNeck", "Polera"],
  ["overall", "Overol"],
  ["collarAndSweater", "Suéter"],
  ["blazerAndShirt", "Chaqueta"],
  ["graphicShirt", "Gráfica"],
] as const;

export const AVATAR_SKIN_COLORS = [
  "ffdbb4",
  "edb98a",
  "d08b5b",
  "ae5d29",
  "8d5524",
] as const;

export const AVATAR_HAIR_COLORS = [
  "2c1b18",
  "4a312c",
  "724133",
  "a55728",
  "b58143",
  "d6b370",
  "e8e1e1",
  "3c4f5c",
] as const;

export const AVATAR_CLOTHES_COLORS = [
  "65c9e8",
  "67e8a5",
  "f4c96b",
  "e78276",
  "929598",
  "262e33",
] as const;

export const AVATAR_HAT_COLORS = [
  "262e33",
  "3c4f5c",
  "65c9e8",
  "67e8a5",
  "f4c96b",
  "e78276",
] as const;

const AVATAR_EARRINGS = ["none", "stud", "hoop"] as const;

export const MINI_BODIES = [
  ["round", "Redondo"],
  ["square", "Cuadrado"],
  ["bean", "Porotito"],
] as const;

export const MINI_EYES = [
  ["bright", "Atentos"],
  ["happy", "Felices"],
  ["focused", "Concentrados"],
  ["wink", "Guiño"],
] as const;

export const MINI_MOUTHS = [
  ["smile", "Sonrisa"],
  ["grin", "Contento"],
  ["calm", "Tranquilo"],
  ["surprised", "Sorpresa"],
] as const;

export const MINI_HAIR = [
  ["sprout", "Puntas"],
  ["tuft", "Mechón"],
  ["side", "Al lado"],
  ["cap", "Gorro"],
  ["none", "Sin pelo"],
] as const;

export const MINI_ACCESSORIES = [
  ["none", "Sin accesorio"],
  ["glasses", "Lentes"],
  ["visor", "Visor"],
  ["headphones", "Audífonos"],
] as const;

export const MINI_OUTFITS = [
  ["hoodie", "Polerón"],
  ["apron", "Delantal"],
  ["jacket", "Chaqueta"],
  ["tee", "Polera"],
] as const;

export const MINI_BODY_COLORS = [
  "f4c96b",
  "67e8a5",
  "65c9e8",
  "e78276",
  "d6b370",
  "b9a7e8",
] as const;

export const MINI_ACCENT_COLORS = [
  "15332a",
  "255c78",
  "7a3f55",
  "5d4a8a",
  "8a572f",
  "dce7e1",
] as const;

function hashSeed(seed: string) {
  return [...seed].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    2166136261,
  );
}

function pick<T>(items: readonly T[], hash: number, offset: number) {
  return items[(hash + offset) % items.length];
}

export function defaultAvatarConfig(seed: string): AvatarConfig {
  const hash = hashSeed(seed);
  return {
    style: "avataaars",
    seed: seed.slice(0, 80),
    top: pick(AVATAR_TOPS, hash, 1)[0],
    hairColor: pick(AVATAR_HAIR_COLORS, hash, 2),
    hatColor: pick(AVATAR_HAT_COLORS, hash, 3),
    eyes: pick(AVATAR_EYES, hash, 4)[0],
    eyebrows: pick(AVATAR_EYEBROWS, hash, 5)[0],
    mouth: "smile",
    skinColor: pick(AVATAR_SKIN_COLORS, hash, 6),
    accessories: "none",
    facialHair: "none",
    clothing: pick(AVATAR_CLOTHING, hash, 7)[0],
    clothesColor: pick(AVATAR_CLOTHES_COLORS, hash, 8),
    earrings: "none",
    miniBody: pick(MINI_BODIES, hash, 9)[0],
    miniEyes: pick(MINI_EYES, hash, 10)[0],
    miniMouth: pick(MINI_MOUTHS, hash, 11)[0],
    miniHair: pick(MINI_HAIR, hash, 12)[0],
    miniAccessory: pick(MINI_ACCESSORIES, hash, 13)[0],
    miniOutfit: pick(MINI_OUTFITS, hash, 14)[0],
    miniBodyColor: pick(MINI_BODY_COLORS, hash, 15),
    miniAccentColor: pick(MINI_ACCENT_COLORS, hash, 16),
  };
}

function optionValue(
  value: unknown,
  options: readonly (readonly [string, string])[],
  fallback: string,
) {
  return typeof value === "string" &&
    options.some(([candidate]) => candidate === value)
    ? value
    : fallback;
}

function colorValue(
  value: unknown,
  options: readonly string[],
  fallback: string,
) {
  return typeof value === "string" && options.includes(value)
    ? value
    : fallback;
}

export function sanitizeAvatarConfig(
  value: unknown,
  seed: string,
): AvatarConfig {
  const fallback = defaultAvatarConfig(seed);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const input = value as Record<string, unknown>;
  return {
    style: input.style === "mini" ? "mini" : "avataaars",
    seed:
      typeof input.seed === "string" && input.seed.trim()
        ? input.seed.trim().slice(0, 80)
        : fallback.seed,
    top: optionValue(input.top, AVATAR_TOPS, fallback.top),
    hairColor: colorValue(
      input.hairColor,
      AVATAR_HAIR_COLORS,
      fallback.hairColor,
    ),
    hatColor: colorValue(
      input.hatColor,
      AVATAR_HAT_COLORS,
      fallback.hatColor,
    ),
    eyes: optionValue(input.eyes, AVATAR_EYES, fallback.eyes),
    eyebrows: optionValue(
      input.eyebrows,
      AVATAR_EYEBROWS,
      fallback.eyebrows,
    ),
    mouth: optionValue(input.mouth, AVATAR_MOUTHS, fallback.mouth),
    skinColor: colorValue(
      input.skinColor,
      AVATAR_SKIN_COLORS,
      fallback.skinColor,
    ),
    accessories: optionValue(
      input.accessories,
      AVATAR_ACCESSORIES,
      fallback.accessories,
    ),
    facialHair: optionValue(
      input.facialHair,
      AVATAR_FACIAL_HAIR,
      fallback.facialHair,
    ),
    clothing: optionValue(
      input.clothing,
      AVATAR_CLOTHING,
      fallback.clothing,
    ),
    clothesColor: colorValue(
      input.clothesColor,
      AVATAR_CLOTHES_COLORS,
      fallback.clothesColor,
    ),
    earrings:
      typeof input.earrings === "string" &&
      AVATAR_EARRINGS.includes(
        input.earrings as (typeof AVATAR_EARRINGS)[number],
      )
        ? (input.earrings as AvatarConfig["earrings"])
        : fallback.earrings,
    miniBody: optionValue(
      input.miniBody,
      MINI_BODIES,
      fallback.miniBody,
    ) as AvatarConfig["miniBody"],
    miniEyes: optionValue(
      input.miniEyes,
      MINI_EYES,
      fallback.miniEyes,
    ) as AvatarConfig["miniEyes"],
    miniMouth: optionValue(
      input.miniMouth,
      MINI_MOUTHS,
      fallback.miniMouth,
    ) as AvatarConfig["miniMouth"],
    miniHair: optionValue(
      input.miniHair,
      MINI_HAIR,
      fallback.miniHair,
    ) as AvatarConfig["miniHair"],
    miniAccessory: optionValue(
      input.miniAccessory,
      MINI_ACCESSORIES,
      fallback.miniAccessory,
    ) as AvatarConfig["miniAccessory"],
    miniOutfit: optionValue(
      input.miniOutfit,
      MINI_OUTFITS,
      fallback.miniOutfit,
    ) as AvatarConfig["miniOutfit"],
    miniBodyColor: colorValue(
      input.miniBodyColor,
      MINI_BODY_COLORS,
      fallback.miniBodyColor,
    ),
    miniAccentColor: colorValue(
      input.miniAccentColor,
      MINI_ACCENT_COLORS,
      fallback.miniAccentColor,
    ),
  };
}
