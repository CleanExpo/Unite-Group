import { getProjects, type CommandCentreProject } from "./registry";
import type { DeliveryRepository } from "./delivery-repositories";

const CANONICAL_REPOSITORY = "CleanExpo/Unite-Group";
type DeliveryProject = CommandCentreProject & { deliveryNames?: string[] };

/** Delivery identity adapter only. The historical portfolio inventory stays unchanged. */
export function resolveDeliveryProjects(projects: CommandCentreProject[]): {
  projects: DeliveryProject[];
  error: string | null;
} {
  const canonical = projects.filter(
    (project) => project.github_repo === CANONICAL_REPOSITORY,
  );
  const survivors = canonical.filter(
    (project) => project.status.toLowerCase() !== "retired",
  );
  if (survivors.length > 1)
    return {
      projects: projects.filter((project) => !canonical.includes(project)),
      error:
        "The Unite-Group project connection is ambiguous. Its registry identity needs review before a mission can be prepared.",
    };
  return {
    projects: projects.flatMap((project) => {
      if (!canonical.includes(project)) return [project];
      if (project !== survivors[0]) return [];
      return [
        {
          ...project,
          name: "Unite-Group",
          deliveryNames: [project.name, "Unite-Group", "Unite Group"],
        },
      ];
    }),
    error:
      projects.length === 0
        ? "The business project registry is unavailable. Restore its connection before preparing this mission."
        : null,
  };
}

export function matchDeliveryProject(
  text: string,
  projects: DeliveryProject[],
): DeliveryProject | null {
  const value = text.trim().toLowerCase();
  const names = (project: DeliveryProject) =>
    [...new Set([project.name, ...(project.deliveryNames ?? [])])].map((name) =>
      name.toLowerCase(),
    );
  const exact = projects.filter(
    (project) =>
      names(project).includes(value) ||
      project.linear_prefix.toLowerCase() === value,
  );
  if (exact.length) return exact.length === 1 ? exact[0] : null;
  const mentioned = projects.filter((project) =>
    names(project).some((name) => name.length > 3 && value.includes(name)),
  );
  return mentioned.length === 1 ? mentioned[0] : null;
}

export async function getDeliveryProjectByName(
  name: string,
): Promise<CommandCentreProject | undefined> {
  const resolved = resolveDeliveryProjects(await getProjects());
  if (resolved.error) throw new Error(resolved.error);
  const target = name.trim().toLowerCase();
  const named = resolved.projects.find(
    (project) => project.name.toLowerCase() === target,
  );
  if (named) return named;
  const byRepository = resolved.projects.filter(
    (project) => project.github_repo?.toLowerCase() === target,
  );
  return byRepository.length === 1 ? { ...byRepository[0], name } : undefined;
}

/** Enrich by exact repository identity only; same short names are never interchangeable. */
export function projectFromDeliveryRepository(
  repository: DeliveryRepository,
  projects: CommandCentreProject[],
): CommandCentreProject {
  const matching = projects.filter(
    (project) =>
      project.github_repo?.toLowerCase() ===
        repository.fullName.toLowerCase() && project.status !== "retired",
  );
  if (matching.length === 1)
    return { ...matching[0], name: repository.fullName };
  return {
    name: repository.fullName,
    github_repo: repository.fullName,
    repo_path: "",
    business_purpose:
      "A GitHub repository selected by the founder. Additional business context has not been registered.",
    brand_rules_ref: "",
    deployment_target: "unconfigured",
    owner: repository.fullName.split("/")[0],
    status: repository.archived ? "archived" : "unregistered",
    evidence_vault_path: "",
    validation_commands: [],
    linear_prefix: "",
    production_url: null,
  };
}
