export interface PublicationPublicListItem {
  slug: string;
  title: string;
  excerpt: string;
  type: string;
  publishedAt: string;
  featuredImageUrl: string | null;
}

export interface PublicationsPublicList {
  items: PublicationPublicListItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
