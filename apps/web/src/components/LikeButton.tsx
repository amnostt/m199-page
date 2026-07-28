import { useState } from "react";

export function LikeButton({
  initialCount,
  slug,
}: {
  initialCount: number;
  slug: string;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [error, setError] = useState(false);

  async function handleLike() {
    if (liked) return;
    setError(false);
    try {
      const response = await fetch(`/outings/${slug}/like`, { method: "POST" });
      if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
      const payload = (await response.json()) as { likesCount: number };
      setCount(payload.likesCount);
      setLiked(true);
    } catch {
      setError(true);
    }
  }

  return (
    <div className="public-action-row">
      <button
        data-testid="like-button"
        onClick={handleLike}
        disabled={liked}
        className="public-action public-action--primary"
      >
        Like <span data-testid="like-count">{count}</span>
      </button>
      {error && (
        <span data-testid="like-error" className="public-state--error">
          Error al registrar like.
        </span>
      )}
    </div>
  );
}
