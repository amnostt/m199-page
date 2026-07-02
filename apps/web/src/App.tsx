import { useEffect, useState } from "react";

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
// Vite shell — shown while loading or on fetch failure
// ---------------------------------------------------------------------------

function Shell() {
  return (
    <main data-testid="shell-fallback">
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
    <section data-testid="hero-section">
      <img
        src={data.heroImageUrl}
        alt="Hero"
        data-testid="hero-image"
      />
      {data.heroTitle && (
        <h1 data-testid="hero-title">{data.heroTitle}</h1>
      )}
      {data.heroSubtitle && (
        <p data-testid="hero-subtitle">{data.heroSubtitle}</p>
      )}
    </section>
  );
}

function MissionSection({ data }: { data: LandingPublicPayload }) {
  if (!data.mission) return null;
  return (
    <section data-testid="mission-section">
      <p data-testid="mission-text">{data.mission}</p>
    </section>
  );
}

function VisionSection({ data }: { data: LandingPublicPayload }) {
  if (!data.vision) return null;
  return (
    <section data-testid="vision-section">
      <p data-testid="vision-text">{data.vision}</p>
    </section>
  );
}

function DescriptionSection({ data }: { data: LandingPublicPayload }) {
  if (!data.description) return null;
  return (
    <section data-testid="description-section">
      <p data-testid="description-text">{data.description}</p>
    </section>
  );
}

function VideoSection({ data }: { data: LandingPublicPayload }) {
  if (!data.featuredVideoUrl) return null;
  return (
    <section data-testid="video-section">
      <iframe
        src={data.featuredVideoUrl}
        data-testid="featured-video"
        title="Featured Video"
      />
    </section>
  );
}

function ContactSection({ data }: { data: LandingPublicPayload }) {
  if (!data.contactEmail && !data.contactPhone) return null;
  return (
    <section data-testid="contact-section">
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
    <section data-testid="featured-outing-section">
      <h2>{outing.title}</h2>
      <p data-testid="outing-location">{outing.location}</p>
    </section>
  );
}

function FeaturedPostsSection({ data }: { data: LandingPublicPayload }) {
  if (data.featuredPosts.length === 0) return null;
  return (
    <section data-testid="featured-posts-section">
      {data.featuredPosts.map((post) => (
        <article key={post.id} data-testid={`post-${post.id}`}>
          <h3>{post.title}</h3>
        </article>
      ))}
    </section>
  );
}

function VerseSection({ data }: { data: LandingPublicPayload }) {
  if (!data.currentVerse) return null;
  const verse = data.currentVerse;
  return (
    <section data-testid="verse-section">
      <blockquote data-testid="verse-text">{verse.text}</blockquote>
      <cite data-testid="verse-reference">{verse.reference}</cite>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Application component
// ---------------------------------------------------------------------------

export function App() {
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
    <main>
      <HeroSection data={data} />
      <MissionSection data={data} />
      <VisionSection data={data} />
      <DescriptionSection data={data} />
      <VideoSection data={data} />
      <ContactSection data={data} />
      <FeaturedOutingSection data={data} />
      <FeaturedPostsSection data={data} />
      <VerseSection data={data} />
    </main>
  );
}
