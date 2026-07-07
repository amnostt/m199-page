import { useEffect, useState } from "react";
import { sanitizeAndMakeSafe } from "../lib/sanitize.js";
import type { PostPublicResponse } from "./PostsList.js";

// ---------------------------------------------------------------------------
// Sanitization — defense in depth: shared sanitizeAndMakeSafe from lib/sanitize
// applies DOMPurify + safe link attributes (target=_blank, rel=noopener noreferrer).
// ---------------------------------------------------------------------------

/** Format an ISO date string to a locale-friendly short date. */
function formatDate(iso: string | null): string {
  if (!iso) return "";
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
// PostDetail — renders the public /posts/:slug page
// ---------------------------------------------------------------------------

export function PostDetail({ slug }: { slug: string }) {
  const [post, setPost] = useState<PostPublicResponse | null>(null);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/posts/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: PostPublicResponse | null) => {
        if (data && !cancelled) setPost(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (notFound) {
    return (
      <section data-testid="post-detail-not-found">
        <p>Post no encontrado.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section data-testid="post-detail-error">
        <p>No se pudo cargar el post.</p>
      </section>
    );
  }

  if (!post) {
    return (
      <section data-testid="post-detail-loading">
        <p>Cargando post…</p>
      </section>
    );
  }

  return (
    <section data-testid="post-detail-section">
      {post.coverImageUrl && (
        <img
          data-testid="post-detail-cover"
          src={post.coverImageUrl}
          alt={post.title}
        />
      )}
      <h1>{post.title}</h1>
      <p>{post.description}</p>
      {post.publishedAt && (
        <time data-testid="post-detail-date">
          {formatDate(post.publishedAt)}
        </time>
      )}
      {post.tags.length > 0 && (
        <ul data-testid="post-detail-tags">
          {post.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      )}
      <div
        data-testid="post-detail-content"
        dangerouslySetInnerHTML={{
          __html: sanitizeAndMakeSafe(post.content),
        }}
      />
      {post.downloads?.length > 0 && (
        <section data-testid="post-detail-downloads">
          <h2>Descargas</h2>
          <ul>
            {post.downloads.map((dl, idx) => (
              <li key={idx}>
                <a
                  href={dl.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {dl.label ?? dl.fileUrl}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
