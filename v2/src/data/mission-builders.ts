import type {
  Course,
  Difficulty,
  Language,
  Mission,
  MissionTest,
  MissionVariant,
} from "@/types";

export function test(
  id: string,
  label: string,
  expression: string,
  expected: string,
  feedback: string,
  actualExpression?: string,
): MissionTest {
  return { id, label, expression, expected, feedback, actualExpression };
}

export function variant(
  language: Language,
  starterCode: string,
  referenceSolution: string,
  publicTests: MissionTest[],
  hiddenTests: MissionTest[],
): MissionVariant {
  return { language, starterCode, referenceSolution, publicTests, hiddenTests };
}

export function cpp(source: string): string {
  return `#include <algorithm>
#include <cmath>
#include <deque>
#include <iostream>
#include <memory>
#include <numeric>
#include <optional>
#include <queue>
#include <regex>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>
using namespace std;

${source.trim()}
`;
}

interface MissionInput {
  id: string;
  slug: string;
  course: Course;
  module: string;
  order: number;
  title: string;
  summary: string;
  context: string;
  brief: string;
  difficulty: Difficulty;
  points: number;
  duration: number;
  tags: string[];
  objectives: string[];
  hints: string[];
  variants: Record<Language, MissionVariant>;
}

export function mission(input: MissionInput): Mission {
  return {
    ...input,
    courseLabel:
      input.course === "programming-1" ? "Programación I" : "Programación II",
    version: 1,
  };
}
