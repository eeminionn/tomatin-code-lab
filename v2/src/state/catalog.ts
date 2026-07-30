import { useQuery, useQueryClient } from "@tanstack/react-query";
import { missions as localMissions } from "@/data/missions";
import { supabase } from "@/services/supabase";
import { useClassroom } from "./classroom-context";
import type {
  Language,
  Mission,
  MissionExample,
  MissionTest,
} from "@/types";

interface CatalogVariantRow {
  language: Language;
  starter_code: string;
  expected_signature: string | null;
  examples: MissionExample[];
  public_tests: MissionTest[];
  hidden_test_count: number;
}

interface CatalogVersionRow {
  version: number;
  status: string;
  content: Omit<Mission, "variants">;
  mission_variants: CatalogVariantRow[];
}

interface CatalogRow {
  id: string;
  slug: string;
  course: Mission["course"];
  title: string;
  current_version: number;
  mission_versions: CatalogVersionRow[];
}

export interface VersionedMission extends Mission {
  isCurrent: boolean;
}

export function findMissionVersion(
  catalog: VersionedMission[],
  id: string,
  version?: number,
): VersionedMission | undefined {
  return catalog.find(
    (mission) =>
      mission.id === id &&
      (version === undefined
        ? mission.isCurrent
        : mission.version === version),
  );
}

function localCatalog(): VersionedMission[] {
  return localMissions.map((mission) => ({ ...mission, isCurrent: true }));
}

async function loadRemoteCatalog(): Promise<VersionedMission[]> {
  if (!supabase) return localCatalog();
  const { data, error } = await supabase
    .from("missions")
    .select(`
      id,
      slug,
      course,
      title,
      current_version,
      mission_versions!inner(
        version,
        status,
        content,
        mission_variants(
          language,
          starter_code,
          expected_signature,
          examples,
          public_tests,
          hidden_test_count
        )
      )
    `)
    .is("archived_at", null)
    .eq("mission_versions.status", "published")
    .order("id");
  if (error) throw error;

  return (data as unknown as CatalogRow[]).flatMap((row) =>
    row.mission_versions.flatMap((version) => {
      if (version.mission_variants.length !== 3) return [];
      const variants = Object.fromEntries(
        version.mission_variants.map((variant) => [
          variant.language,
          {
            language: variant.language,
            starterCode: variant.starter_code,
            expectedSignature: variant.expected_signature ?? "",
            examples: variant.examples ?? [],
            publicTests: variant.public_tests,
            hiddenTestCount: variant.hidden_test_count,
          },
        ]),
      ) as Mission["variants"];
      return [
        {
          ...version.content,
          id: row.id,
          slug: row.slug,
          course: row.course,
          title: row.title,
          version: version.version,
          variants,
          isCurrent: version.version === row.current_version,
        },
      ];
    }),
  );
}

export function useCatalog() {
  const { profile, backendMode } = useClassroom();
  const queryClient = useQueryClient();
  const query = useQuery<VersionedMission[]>({
    queryKey: ["mission-catalog"],
    queryFn: loadRemoteCatalog,
    enabled: backendMode === "supabase" && Boolean(profile),
    initialData: backendMode === "demo" ? localCatalog() : undefined,
    staleTime: 60_000,
  });
  const versionedMissions = query.data?.length ? query.data : localCatalog();
  const missions = versionedMissions.filter((mission) => mission.isCurrent);

  return {
    missions,
    versionedMissions,
    loading: query.isLoading,
    error: query.error,
    getMissionById: (id: string, version?: number) =>
      findMissionVersion(versionedMissions, id, version),
    getMissionBySlug: (slug: string, version?: number) =>
      versionedMissions.find(
        (mission) =>
          mission.slug === slug &&
          (version === undefined ? mission.isCurrent : mission.version === version),
      ),
    refreshCatalog: () =>
      queryClient.invalidateQueries({ queryKey: ["mission-catalog"] }),
  };
}
