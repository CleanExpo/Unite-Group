import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { mapPortfolioYamlToProjects } from "../registry";
import {
  matchDeliveryProject,
  resolveDeliveryProjects,
} from "../delivery-projects";

describe("delivery project identity against the checked-in portfolio", () => {
  it.each([
    "data/command-centre/portfolio.yaml",
    "../../.portfolio/PORTFOLIO.yaml",
  ])(
    "resolves current and historical founder input using %s without changing inventory",
    (source) => {
      const inventory = mapPortfolioYamlToProjects(
        readFileSync(resolve(source), "utf8"),
      );
      const before = structuredClone(inventory);
      const actual = inventory.find(
        (project) =>
          project.github_repo === "CleanExpo/Unite-Group" &&
          project.status !== "retired",
      )!;
      expect(actual).toBeDefined();
      const result = resolveDeliveryProjects(inventory);
      expect(result.error).toBeNull();
      const canonical = result.projects.filter(
        (project) => project.github_repo === "CleanExpo/Unite-Group",
      );
      expect(canonical).toHaveLength(1);
      expect(canonical[0]).toMatchObject({ ...actual, name: "Unite-Group" });
      for (const input of [
        actual.name,
        "Unite-Group",
        "Unite Group",
        "Build a portal for Unite-Group",
      ])
        expect(matchDeliveryProject(input, result.projects)?.name).toBe(
          "Unite-Group",
        );
      expect(
        result.projects.filter(
          (project) => project.github_repo !== "CleanExpo/Unite-Group",
        ),
      ).toEqual(
        inventory.filter(
          (project) => project.github_repo !== "CleanExpo/Unite-Group",
        ),
      );
      expect(inventory).toEqual(before);
    },
  );

  it("refuses multiple nonretired canonical-repository candidates", () => {
    const inventory = mapPortfolioYamlToProjects(
      readFileSync(resolve("data/command-centre/portfolio.yaml"), "utf8"),
    );
    const active = inventory.find(
      (project) =>
        project.github_repo === "CleanExpo/Unite-Group" &&
        project.status !== "retired",
    )!;
    const result = resolveDeliveryProjects([
      ...inventory,
      { ...active, name: "Other subproject" },
    ]);
    expect(result.error).toMatch(/ambiguous/);
    expect(
      result.projects.some(
        (project) => project.github_repo === "CleanExpo/Unite-Group",
      ),
    ).toBe(false);
    expect(matchDeliveryProject("Unite-Group", result.projects)).toBeNull();
  });

  it("reports an unavailable registry instead of a business clarification", () => {
    expect(resolveDeliveryProjects([]).error).toMatch(
      /registry is unavailable/,
    );
  });
});
