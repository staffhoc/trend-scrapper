/**
 * TikTok-specific types for scraped data
 */

export interface TikTokProduct {
  product_id: string;
  title: string;
  description?: string;
  image_url?: string;
  price: number;
  original_price?: number;
  currency: string;
  sold_count: number;
  rating?: number;
  review_count?: number;
  shop_id?: string;
  shop_name?: string;
  shop_logo?: string;
  url: string;
}

export interface TikTokHashtag {
  hashtag_id: string;
  name: string;
  video_count: number;
  view_count: number;
  is_trending?: boolean;
}

export interface TikTokSound {
  sound_id: string;
  title: string;
  author?: string;
  duration?: number;
  video_count?: number;
  cover_url?: string;
  is_commercial?: boolean;
}

export interface TikTokVideo {
  video_id: string;
  description?: string;
  thumbnail_url?: string;
  duration?: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  author_username?: string;
  author_name?: string;
  url: string;
}

export interface TikTokCreator {
  user_id: string;
  username: string;
  nickname: string;
  avatar_url?: string;
  follower_count: number;
  video_count?: number;
  bio?: string;
}

export interface ScraperResult<T> {
  success: boolean;
  data: T[];
  count: number;
  timestamp: Date;
  market: string;
}
