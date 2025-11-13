export type Asset = {
  id: string;
  name: string;
  symbol: string;
  category: "Art" | "RealEstate" | "Treasury" | "Commodity" | "Collectible";
  chain: "Ethereum" | "Polygon" | "Solana" | "Private";
  status: "active" | "locked" | "settled" | "pending";
  priceUSD: number;
  createdAt: string;
  description: string;
};

