import { EthereumCrawler } from './ethereum.js';

// Polygon uses the same EVM structure as Ethereum
export class PolygonCrawler extends EthereumCrawler {
  constructor(rpcUrl: string, contractAddresses: string[] = []) {
    super(rpcUrl, contractAddresses);
  }
}

