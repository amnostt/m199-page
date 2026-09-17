export interface PublicationPublicListItem {
  slug: string;
  title: string;
  excerpt: string;
  type: string;
  publishedAt: string;
  featuredImageUrl: string | null;
  activityDate?: string;
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

export interface PublicationMissionLink {
  slug: string;
  title: string;
  status: "ACTIVE" | "ARCHIVED";
  profileImageUrl: string | null;
}

export interface PublicationPublicDetail extends PublicationPublicDetailBase {
  missions: PublicationMissionLink[];
  imageUrls: string[];
}
