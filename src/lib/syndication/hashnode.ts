/**
 * Hashnode GraphQL API client — auto-publish blog posts with canonical link back.
 * Docs: https://apidocs.hashnode.com/
 *
 * Env vars:
 *   HASHNODE_API_KEY          — from hashnode.com → Settings → Developer → Generate Token
 *   HASHNODE_PUBLICATION_ID   — run the discoverPublicationId helper below (or test endpoint)
 *
 * IMPORTANT: Authorization header uses raw token (no "Bearer" prefix).
 */

const HASHNODE_ENDPOINT = "https://gql.hashnode.com";

export interface HashnodePublishParams {
  title: string;
  contentMarkdown: string;
  canonicalUrl: string;
  subtitle?: string;
  coverImageUrl?: string;
  tags?: string[]; // raw strings — will be converted to {name, slug} objects
}

export interface HashnodePublishResult {
  success: boolean;
  url?: string;
  id?: string;
  error?: string;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

async function gqlRequest(apiKey: string, query: string, variables: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(HASHNODE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: apiKey, // NO "Bearer" prefix — just the raw PAT
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  if (data.errors) {
    throw new Error(
      `GraphQL error: ${JSON.stringify(data.errors).slice(0, 300)}`,
    );
  }
  return data.data;
}

export async function publishToHashnode(
  params: HashnodePublishParams,
): Promise<HashnodePublishResult> {
  const apiKey = process.env.HASHNODE_API_KEY;
  const publicationId = process.env.HASHNODE_PUBLICATION_ID;

  if (!apiKey) return { success: false, error: "HASHNODE_API_KEY not set" };
  if (!publicationId) return { success: false, error: "HASHNODE_PUBLICATION_ID not set" };

  const tagObjects = (params.tags || [])
    .slice(0, 5)
    .map((t) => ({ name: t.slice(0, 30), slug: slugify(t) }))
    .filter((t) => t.slug.length > 0);

  const mutation = `
    mutation PublishPost($input: PublishPostInput!) {
      publishPost(input: $input) {
        post {
          id
          url
          slug
        }
      }
    }
  `;

  const input: Record<string, unknown> = {
    title: params.title.slice(0, 250),
    contentMarkdown: params.contentMarkdown,
    publicationId,
    originalArticleURL: params.canonicalUrl, // this is the canonical/backlink
    tags: tagObjects,
  };

  if (params.subtitle) input.subtitle = params.subtitle.slice(0, 250);
  if (params.coverImageUrl) {
    input.coverImageOptions = { coverImageURL: params.coverImageUrl };
  }

  try {
    const data = (await gqlRequest(apiKey, mutation, { input })) as {
      publishPost?: { post?: { id: string; url: string } };
    };
    const post = data.publishPost?.post;
    if (!post) {
      return { success: false, error: "No post returned in response" };
    }
    return { success: true, url: post.url, id: post.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Helper — discover publicationId for a user. Run once during setup.
 * Returns the first publication (most users have one).
 */
export async function discoverPublicationId(): Promise<{
  ok: boolean;
  publicationId?: string;
  publicationTitle?: string;
  publicationUrl?: string;
  error?: string;
}> {
  const apiKey = process.env.HASHNODE_API_KEY;
  if (!apiKey) return { ok: false, error: "HASHNODE_API_KEY not set" };

  const query = `
    query Me {
      me {
        username
        publications(first: 5) {
          edges {
            node {
              id
              title
              url
            }
          }
        }
      }
    }
  `;

  try {
    const data = (await gqlRequest(apiKey, query, {})) as {
      me?: {
        username?: string;
        publications?: {
          edges: { node: { id: string; title: string; url: string } }[];
        };
      };
    };

    const firstPub = data.me?.publications?.edges?.[0]?.node;
    if (!firstPub) {
      return {
        ok: false,
        error: "No publications found. Create a publication on hashnode.com first.",
      };
    }
    return {
      ok: true,
      publicationId: firstPub.id,
      publicationTitle: firstPub.title,
      publicationUrl: firstPub.url,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function testHashnodeConnection(): Promise<{
  ok: boolean;
  username?: string;
  publicationId?: string;
  publicationTitle?: string;
  error?: string;
}> {
  const apiKey = process.env.HASHNODE_API_KEY;
  if (!apiKey) return { ok: false, error: "HASHNODE_API_KEY not set" };

  const discovery = await discoverPublicationId();
  if (!discovery.ok) return { ok: false, error: discovery.error };

  // Also get username
  try {
    const data = (await gqlRequest(apiKey, `query { me { username } }`, {})) as {
      me?: { username?: string };
    };
    return {
      ok: true,
      username: data.me?.username,
      publicationId: discovery.publicationId,
      publicationTitle: discovery.publicationTitle,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function isHashnodeEnabled(): boolean {
  return !!(process.env.HASHNODE_API_KEY && process.env.HASHNODE_PUBLICATION_ID);
}
