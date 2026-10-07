import { describe, expect, it } from "vitest";
import registry from "../../../../../../.portfolio/CONTROL-PLANE.v1.json";
import { getImportProjects } from "../import-projects";

describe("Synthex import local portfolio references", () => {
  it("derives its references exactly from the current canonical registry", () => {
    expect(getImportProjects()).toEqual(
      registry.repositories.map((project) => ({
        name: project.projectId,
        repository: project.repositoryId,
      })),
    );
    expect(getImportProjects()).toContainEqual({
      name: "synthex",
      repository: "CleanExpo/Synthex",
    });
  });
});
