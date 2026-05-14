/**
 * Minimal GraphQL client for our Goldsky subgraph.
 *
 * We don't pull in Apollo or urql — they're overkill. The subgraph URL is set via
 * NEXT_PUBLIC_SUBGRAPH_URL. If the env var isn't set, hooks fall back to direct
 * RPC reads (the old behavior) so the app still works.
 */

export const SUBGRAPH_URL =
  process.env.NEXT_PUBLIC_SUBGRAPH_URL || "";

export const HAS_INDEXER = SUBGRAPH_URL.length > 0;

export class SubgraphError extends Error {
  constructor(message: string, public readonly raw?: unknown) {
    super(message);
    this.name = "SubgraphError";
  }
}

/**
 * Fire a GraphQL query against the subgraph.
 *
 * @throws SubgraphError if the request fails or returns GraphQL errors
 */
export async function gqlQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!SUBGRAPH_URL) {
    throw new SubgraphError(
      "NEXT_PUBLIC_SUBGRAPH_URL not set — indexer not configured"
    );
  }

  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new SubgraphError(`HTTP ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { data?: T; errors?: unknown[] };

  if (json.errors && json.errors.length > 0) {
    throw new SubgraphError("GraphQL errors", json.errors);
  }

  if (!json.data) {
    throw new SubgraphError("No data returned");
  }

  return json.data;
}
