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

export interface PublicationPublicDetailBase extends PublicationPublicListItem {
  content: string;
}

export interface PublicationPublicDetail extends PublicationPublicDetailBase {
  startDate?: string;
  endDate?: string | null;
  activityStatus?: string;
  documentationStatus?: string;
}
