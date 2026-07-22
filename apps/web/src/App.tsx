import { useCallback, useEffect, useState } from "react";
import { PostsList } from "./components/PostsList.js";
import { PostDetail } from "./components/PostDetail.js";
import { AdminApp } from "./admin/AdminApp.js";

// ---------------------------------------------------------------------------
// Types — mirrors LandingPublicPayload from the API design contract
// ---------------------------------------------------------------------------

interface FeaturedOutingPayload {
  id: string;
  slug: string;
  title: string;
  location: string;
  mainImageUrl: string | null;
}

interface FeaturedPostPayload {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
}

interface CurrentVersePayload {
  text: string;
  reference: string;
  date: string;
}

interface LandingPublicPayload {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  mission: string | null;
  vision: string | null;
  description: string | null;
  featuredVideoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  featuredOuting: FeaturedOutingPayload | null;
  featuredPosts: FeaturedPostPayload[];
  currentVerse: CurrentVersePayload | null;
}

// ---------------------------------------------------------------------------
// Outings types — mirrors OutingResponse from the API
// ---------------------------------------------------------------------------

interface OutingPayload {
  id: string;
  slug: string;
  title: string;
  dateTime: string;
  location: string;
  description: string;
  status: string;
  likesCount: number;
  mainImageUrl: string | null;
  croquisUrl: string | null;
  planUrl: string | null;
}

interface LikeResponsePayload {
  likesCount: number;
}

// ---------------------------------------------------------------------------
// Public landing shell — shown while the landing fetch is in flight or on
// fetch failure. The fallback is a public state, so it carries the same
// `.public-ui.public-page` root every other public route uses, ensuring the
// shared tokenized visual system and AA-grade base styling cover the loading
// and error fallbacks. Admin markup (rendered for `/admin*`) is unaffected
// because that branch returns `<AdminApp />` and never adds `.public-ui`.
// ---------------------------------------------------------------------------

function Shell() {
  return (
    <main data-testid="shell-fallback" className="public-ui public-page">
      <p>Misión 1-99 workspace shell is running.</p>
      <p>
        Product UI ships in future changes. No admin screens, public routes,
        auth flows, uploads, or data features are implemented yet.
      </p>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Landing sections — each hides itself when its data is null/empty
// ---------------------------------------------------------------------------

function HeroSection({ data }: { data: LandingPublicPayload }) {
  if (!data.heroImageUrl) return null;
  return (
    <section data-testid="hero-section" className="public-hero">
      <img
        src={data.heroImageUrl}
        alt="Hero"
        data-testid="hero-image"
        className="public-media public-media--cover"
      />
      {data.heroTitle && <h1 data-testid="hero-title">{data.heroTitle}</h1>}
      {data.heroSubtitle && (
        <p data-testid="hero-subtitle">{data.heroSubtitle}</p>
      )}
    </section>
  );
}

function MissionSection({ data }: { data: LandingPublicPayload }) {
  if (!data.mission) return null;
  return (
    <section data-testid="mission-section" className="public-section">
      <p data-testid="mission-text">{data.mission}</p>
    </section>
  );
}

function VisionSection({ data }: { data: LandingPublicPayload }) {
  if (!data.vision) return null;
  return (
    <section data-testid="vision-section" className="public-section">
      <p data-testid="vision-text">{data.vision}</p>
    </section>
  );
}

function DescriptionSection({ data }: { data: LandingPublicPayload }) {
  if (!data.description) return null;
  return (
    <section data-testid="description-section" className="public-section">
      <p data-testid="description-text">{data.description}</p>
    </section>
  );
}

function VideoSection({ data }: { data: LandingPublicPayload }) {
  if (!data.featuredVideoUrl) return null;
  return (
    <section data-testid="video-section" className="public-section">
      <div className="public-media public-media--cover">
        <iframe
          src={data.featuredVideoUrl}
          data-testid="featured-video"
          title="Featured Video"
        />
      </div>
    </section>
  );
}

function ContactSection({ data }: { data: LandingPublicPayload }) {
  if (!data.contactEmail && !data.contactPhone) return null;
  return (
    <section data-testid="contact-section" className="public-section">
      {data.contactEmail && (
        <p data-testid="contact-email">{data.contactEmail}</p>
      )}
      {data.contactPhone && (
        <p data-testid="contact-phone">{data.contactPhone}</p>
      )}
    </section>
  );
}

function FeaturedOutingSection({ data }: { data: LandingPublicPayload }) {
  if (!data.featuredOuting) return null;
  const outing = data.featuredOuting;
  return (
    <section data-testid="featured-outing-section" className="public-section">
      <article data-testid={`outing-${outing.id}`} className="public-card">
        <h3 data-testid="featured-outing-title">{outing.title}</h3>
        <p data-testid="outing-location">{outing.location}</p>
        <a
          data-testid="featured-outing-link"
          href={`/outings/${outing.slug}`}
          className="public-action public-action--primary"
        >
          Ver salida
        </a>
      </article>
    </section>
  );
}

function FeaturedPostsSection({ data }: { data: LandingPublicPayload }) {
  if (data.featuredPosts.length === 0) return null;
  return (
    <section data-testid="featured-posts-section" className="public-section">
      <ul className="public-card-list">
        {data.featuredPosts.map((post) => (
          <li key={post.id} data-testid={`post-${post.id}`}>
            <article className="public-card">
              <h3>{post.title}</h3>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

function VerseSection({ data }: { data: LandingPublicPayload }) {
  if (!data.currentVerse) return null;
  const verse = data.currentVerse;
  return (
    <section data-testid="verse-section" className="public-section">
      <blockquote data-testid="verse-block" className="public-verse">
        <span data-testid="verse-text">{verse.text}</span>
        <cite data-testid="verse-reference">{verse.reference}</cite>
      </blockquote>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Outings components — OutingsList, OutingDetail, LikeButton
// ---------------------------------------------------------------------------

function OutingsList() {
  const [outings, setOutings] = useState<OutingPayload[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/outings")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: OutingPayload[]) => {
        if (!cancelled) setOutings(data);
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
      <section
        data-testid="outings-error"
        className="public-state public-state--error"
      >
        <p>No se pudo cargar la lista de salidas.</p>
      </section>
    );
  }

  if (!outings) {
    return (
      <section data-testid="outings-loading" className="public-state">
        <p>Cargando salidas…</p>
      </section>
    );
  }

  if (outings.length === 0) {
    return (
      <section data-testid="outings-list-section" className="public-section">
        <p data-testid="outings-empty" className="public-state">
          No hay salidas publicadas.
        </p>
      </section>
    );
  }

  return (
    <section data-testid="outings-list-section" className="public-section">
      <ul className="public-card-list">
        {outings.map((outing) => (
          <li key={outing.id} data-testid={`outing-${outing.id}`}>
            <article className="public-card">
              <a href={`/outings/${outing.slug}`} className="public-action">
                {outing.title}
              </a>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LikeButton({
  initialCount,
  slug,
}: {
  initialCount: number;
  slug: string;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [error, setError] = useState(false);

  const handleLike = useCallback(() => {
    if (liked) return;

    fetch(`/outings/${slug}/like`, { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: LikeResponsePayload) => {
        setCount(data.likesCount);
        setLiked(true);
      })
      .catch(() => {
        setError(true);
      });
  }, [slug, liked]);

  return (
    <div className="public-action-row">
      <button
        data-testid="like-button"
        onClick={handleLike}
        disabled={liked}
        className="public-action public-action--primary"
      >
        ❤️ <span data-testid="like-count">{count}</span>
      </button>
      {error && (
        <span data-testid="like-error" className="public-state--error">
          Error al registrar like.
        </span>
      )}
    </div>
  );
}

function OutingDetail({ slug }: { slug: string }) {
  const [outing, setOuting] = useState<OutingPayload | null>(null);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/outings/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: OutingPayload | null) => {
        if (data && !cancelled) setOuting(data);
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
      <section
        data-testid="outing-not-found"
        className="public-state public-state--error"
      >
        <p>Salida no encontrada.</p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        data-testid="outing-error"
        className="public-state public-state--error"
      >
        <p>No se pudo cargar la salida.</p>
      </section>
    );
  }

  if (!outing) {
    return (
      <section data-testid="outing-detail-loading" className="public-state">
        <p>Cargando salida…</p>
      </section>
    );
  }

  return (
    <article data-testid="outing-detail-section" className="public-section">
      <h1 data-testid="outing-title">{outing.title}</h1>
      <p data-testid="outing-location">{outing.location}</p>
      <time data-testid="outing-datetime">{outing.dateTime}</time>
      <p data-testid="outing-description" className="public-prose">
        {outing.description}
      </p>
      {outing.mainImageUrl && (
        <figure className="public-media public-media--cover">
          <img
            data-testid="outing-main-image"
            src={outing.mainImageUrl}
            alt={outing.title}
          />
        </figure>
      )}
      {outing.croquisUrl && (
        <figure className="public-media">
          <img
            data-testid="outing-croquis"
            src={outing.croquisUrl}
            alt="Croquis"
          />
        </figure>
      )}
      {outing.planUrl && (
        <figure className="public-media">
          <img data-testid="outing-plan" src={outing.planUrl} alt="Plan" />
        </figure>
      )}
      <LikeButton initialCount={outing.likesCount} slug={slug} />
    </article>
  );
}

// ---------------------------------------------------------------------------
// Routing helpers
// ---------------------------------------------------------------------------

const ROUTE_OUTINGS = "/outings";
const ROUTE_POSTS = "/posts";

function isOutingsList(path: string): boolean {
  return path === ROUTE_OUTINGS;
}

function matchOutingSlug(path: string): string | null {
  if (!path.startsWith(`${ROUTE_OUTINGS}/`)) return null;
  const slug = path.slice(ROUTE_OUTINGS.length + 1);
  // Reject empty slugs and slugs containing another slash
  if (slug.length === 0 || slug.includes("/")) return null;
  return slug;
}

function isPostsList(path: string): boolean {
  return path === ROUTE_POSTS;
}

function matchPostSlug(path: string): string | null {
  if (!path.startsWith(`${ROUTE_POSTS}/`)) return null;
  const slug = path.slice(ROUTE_POSTS.length + 1);
  // Reject empty slugs and slugs containing another slash
  if (slug.length === 0 || slug.includes("/")) return null;
  return slug;
}

// ---------------------------------------------------------------------------
// LandingPage — renders the full landing experience
// ---------------------------------------------------------------------------

function LandingPage() {
  const [data, setData] = useState<LandingPublicPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/landing/public")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload: LandingPublicPayload) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error || !data) {
    return <Shell />;
  }

  return (
    <main className="public-ui public-page">
      <HeroSection data={data} />
      <FeaturedOutingSection data={data} />
      <MissionSection data={data} />
      <VisionSection data={data} />
      <DescriptionSection data={data} />
      <VideoSection data={data} />
      <ContactSection data={data} />
      <FeaturedPostsSection data={data} />
      <VerseSection data={data} />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Main Application component — path-based routing
// ---------------------------------------------------------------------------

export function App({ pathname }: { pathname?: string }) {
  const rawPath = pathname ?? window.location.pathname;

  // Admin route: /admin exactly, or /admin/* (excludes /administrator etc.)
  if (rawPath === "/admin" || rawPath.startsWith("/admin/")) {
    return <AdminApp />;
  }

  // Post detail: /posts/:slug (check before /posts list)
  const postSlug = matchPostSlug(rawPath);
  if (postSlug !== null) {
    return (
      <main className="public-ui public-page">
        <PostDetail slug={postSlug} />
      </main>
    );
  }

  // Posts list: /posts
  if (isPostsList(rawPath)) {
    return (
      <main className="public-ui public-page">
        <PostsList />
      </main>
    );
  }

  // Outing detail: /outings/:slug
  const outingSlug = matchOutingSlug(rawPath);
  if (outingSlug !== null) {
    return (
      <main className="public-ui public-page">
        <OutingDetail slug={outingSlug} />
      </main>
    );
  }

  // Outings list: /outings
  if (isOutingsList(rawPath)) {
    return (
      <main className="public-ui public-page">
        <OutingsList />
      </main>
    );
  }

  // Default: landing page at /
  return <LandingPage />;
}
