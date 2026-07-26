import { publicMissions } from "./missions-public.generated";
import type { Mission } from "@/types";

export const missions: Mission[] = publicMissions;

export function getMissionById(id: string): Mission | undefined {
  return missions.find((mission) => mission.id === id);
}

export function getMissionBySlug(slug: string): Mission | undefined {
  return missions.find((mission) => mission.slug === slug);
}
