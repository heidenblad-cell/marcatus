export type Asset = {
  id: string;
  name: string;
  symbol: string;
  category: 'Art' | 'RealEstate' | 'Treasury' | 'Commodity' | 'Collectible';
  chain: 'Ethereum' | 'Polygon' | 'Solana' | 'Private';
  status: 'active' | 'locked' | 'settled' | 'pending';
  priceUSD: number;
  createdAt: string;
  description: string;
};

export type SearchParams = {
  q?: string;
  category?: string;
  chain?: string;
  status?: string;
  priceMin?: number;
  priceMax?: number;
  limit?: number;
  offset?: number;
  sort?: 'createdAt_desc' | 'createdAt_asc' | 'price_desc' | 'price_asc';
};

export type SearchResponse = {
  total: number;
  limit: number;
  offset: number;
  items: Asset[];
};

export type StatsResponse = {
  total: number;
  byCategory: Array<{ key: string; count: number }>;
  byChain: Array<{ key: string; count: number }>;
  byStatus: Array<{ key: string; count: number }>;
  price: {
    min: number;
    max: number;
    avg: number;
  };
};

