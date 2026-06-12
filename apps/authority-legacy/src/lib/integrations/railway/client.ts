// src/lib/integrations/railway/client.ts
const TOKEN = process.env.RAILWAY_INTEGRATION_TOKEN ?? "";
if (!TOKEN) console.warn("[railway] RAILWAY_INTEGRATION_TOKEN not set");

const ENDPOINT = "https://backboard.railway.app/graphql/v2";

export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) {
    throw new Error(`Railway GraphQL: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

export interface RailwayDeployment {
  id: string;
  status: string;
  staticUrl: string | null;
  createdAt: string;
  url: string | null;
  meta: { commitSha?: string } | null;
}

export interface RailwayService {
  id: string;
  name: string;
  projectId: string;
  deployments: { edges: Array<{ node: RailwayDeployment }> };
}

export async function listServices(projectId: string): Promise<RailwayService[]> {
  const data = await gql<{
    project: { services: { edges: Array<{ node: RailwayService }> } };
  }>(
    `
    query($projectId: String!) {
      project(id: $projectId) {
        services {
          edges { node {
            id name projectId
            deployments(first: 5) { edges { node {
              id status staticUrl createdAt url meta
            } } }
          } }
        }
      }
    }
  `,
    { projectId },
  );
  return data.project.services.edges.map((e) => e.node);
}
