import { useEffect, useState } from "react";
import { sanitizeAndMakeSafe } from "../lib/sanitize.js";

// ---------------------------------------------------------------------------
// Types — mirrors PostPublicResponse from the API
// ---------------------------------------------------------------------------

export interface PostPublicDownload {
  label: string | null;
  fileUrl: string;
}

export interface PostPublicResponse {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  content: string;
  status: "PUBLISHED";
  tags: string[];
  publishedAt: string | null;
  downloads: PostPublicDownload[];
}

// ---------------------------------------------------------------------------
// Sanitization — defense in depth: shared sanitizeAndMakeSafe from lib/sanitize
// applies DOMPurify + safe link attributes (target=_blank, rel=noopener noreferrer).
// ---------------------------------------------------------------------------

/** Format an ISO date string to a locale-friendly short date. */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// PostsList — renders the public /posts page
// ---------------------------------------------------------------------------

export function PostsList() {
  const [posts, setPosts] = useState<PostPublicResponse[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/posts")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: PostPublicResponse[]) => {
        if (!cancelled) setPosts(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <section data-testid="posts-error">
        <p>No se pudo cargar la lista de posts.</p>
      </section>
    );
  }

  if (!posts) {
    return (
      <section data-testid="posts-loading">
        <p>Cargando posts…</p>
      </section>
    );
  }

  if (posts.length === 0) {
    return (
      <section data-testid="posts-list-section">
        <p data-testid="posts-empty">No hay posts publicados.</p>
      </section>
    );
  }

  return (
    <section data-testid="posts-list-section">
      {posts.map((post) => (
        <article key={post.id} data-testid={`post-${post.id}`}>
          {post.coverImageUrl && (
            <img
              data-testid={`post-cover-${post.id}`}
              src={post.coverImageUrl}
              alt={post.title}
            />
          )}
          <h2>
            <a href={`/posts/${post.slug}`}>{post.title}</a>
          </h2>
          <p>{post.description}</p>
          {post.publishedAt && (
            <time data-testid={`post-date-${post.id}`}>
              {formatDate(post.publishedAt)}
            </time>
          )}
          {post.tags.length > 0 && (
            <ul data-testid={`post-tags-${post.id}`}>
              {post.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          )}
          <div
            data-testid={`post-content-${post.id}`}
            dangerouslySetInnerHTML={{
              __html: sanitizeAndMakeSafe(post.content),
            }}
          />
        </article>
      ))}
    </section>
  );
}
