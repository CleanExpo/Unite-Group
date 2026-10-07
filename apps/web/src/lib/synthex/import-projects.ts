import registry from "../../../../../.portfolio/CONTROL-PLANE.v1.json";
import { PortfolioControlPlaneRegistrySchema } from "@/lib/command-centre/portfolio-control-plane";
import type { ImportProject } from "./import-schema";

// This local registry establishes planning references, never execution admission.
export function getImportProjects(): ImportProject[] {
  const parsed = PortfolioControlPlaneRegistrySchema.parse(registry);
  return parsed.repositories.map((project) => ({
    name: project.projectId,
    repository: project.repositoryId,
  }));
}
