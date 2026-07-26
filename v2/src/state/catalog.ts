import { useQuery, useQueryClient } from "@tanstack/react-query";
import { missions as localMissions } from "@/data/missions";
import { supabase } from "@/services/supabase";
import { useClassroom } from "./classroom-context";
import type { Language, Mission, MissionTest } from "@/types";

interface CatalogVariantRow {
  language: Language;
  starter_code: string;
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

async function loadRemoteCatalog(): Promise<Mission[]> {
  if (!supabase) return localMissions;
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
          public_tests,
          hidden_test_count
        )
      )
    `)
    .is("archived_at", null)
    .eq("mission_versions.status", "published")
    .order("id");
  if (error) throw error;

  return (data as unknown as CatalogRow[]).flatMap((row) => {
    const version = row.mission_versions.find(
      (entry) => entry.version === row.current_version,
    );
    if (!version || version.mission_variants.length !== 3) return [];
    const variants = Object.fromEntries(
      version.mission_variants.map((variant) => [
        variant.language,
        {
          language: variant.language,
          starterCode: variant.starter_code,
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
        version: row.current_version,
        variants,
      },
    ];
  });
}

export function useCatalog() {
  const { profile, backendMode } = useClassroom();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["mission-catalog"],
    queryFn: loadRemoteCatalog,
    enabled: backendMode === "supabase" && Boolean(profile),
    initialData: backendMode === "demo" ? localMissions : undefined,
    staleTime: 60_000,
  });
  const missions = query.data?.length ? query.data : localMissions;

  return {
    missions,
    loading: query.isLoading,
    error: query.error,
    getMissionById: (id: string) =>
      missions.find((mission) => mission.id === id),
    getMissionBySlug: (slug: string) =>
      missions.find((mission) => mission.slug === slug),
    refreshCatalog: () =>
      queryClient.invalidateQueries({ queryKey: ["mission-catalog"] }),
  };
}
