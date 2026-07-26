import { programmingOneMissions } from "./programming-one";
import { programmingTwoMissions } from "./programming-two";
import type { Mission } from "@/types";

export const secureMissions: Mission[] = [
  ...programmingOneMissions,
  ...programmingTwoMissions,
];
