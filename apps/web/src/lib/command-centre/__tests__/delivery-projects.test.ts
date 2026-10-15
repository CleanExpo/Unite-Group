import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { mapPortfolioYamlToProjects } from "../registry";
import {
  matchDeliveryProject,
  resolveDeliveryProjects,
  matchesStoredDeliveryProjectKey,
} from "../delivery-projects";

describe("delivery project identity against the checked-in portfolio", () => {
  it(
    "resolves current and historical founder input using the checked-in portfolio without changing inventory",
    () => {
      const inventory = mapPortfolioYamlToProjects(
        readFileSync(resolve("../../.portfolio/PORTFOLIO.yaml"), "utf8"),
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

  it("uses the surviving canonical production identity and confines legacy keys to saved metadata", () => {
    const inventory = mapPortfolioYamlToProjects(
      readFileSync(resolve("../../.portfolio/PORTFOLIO.yaml"), "utf8"),
    );
    const actual = inventory.find((project) => project.name === "Unite-Group")!;
    expect(actual).toBeDefined();
    expect(actual).toMatchObject({
      github_repo: "CleanExpo/Unite-Group", production_url: "https://unite-group.in",
      production_deployment: {
        projectId: "prj_IfUuJNLjXTE8VXqEGwLAleIGhiA0",
        teamId: "team_KMZACI5rIltoCRhAtGCXlxUf",
        projectName: "unite-group", teamSlug: "unite-group",
        environment: "Production – unite-group",
      },
    });
    const result = resolveDeliveryProjects(inventory);
    const storedKey = actual.repo_path.split("/").at(-1)!;
    expect(matchesStoredDeliveryProjectKey(actual, storedKey)).toBe(true);
    expect(matchesStoredDeliveryProjectKey(actual, storedKey.toUpperCase())).toBe(true);
    expect(matchDeliveryProject(storedKey, result.projects)).toBeNull();
    expect(matchesStoredDeliveryProjectKey({ ...actual, github_repo: "Other/Repo" }, storedKey)).toBe(false);
    expect(matchesStoredDeliveryProjectKey({ ...actual, status: "retired" }, storedKey)).toBe(false);
    expect(matchesStoredDeliveryProjectKey({ ...actual, repo_path: "" }, storedKey)).toBe(false);
    expect(matchesStoredDeliveryProjectKey(actual, "unregistered-key")).toBe(false);
  });

  it("refuses multiple nonretired canonical-repository candidates", () => {
    const inventory = mapPortfolioYamlToProjects(
      readFileSync(resolve("../../.portfolio/PORTFOLIO.yaml"), "utf8"),
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
