import pino from 'pino';
import { EthereumCrawler } from './ethereum.js';
import { PolygonCrawler } from './polygon.js';
import { SolanaCrawler } from './solana.js';
import type { Asset } from '../types.js';

const logger = pino({ transport: { target: 'pino-pretty' }, level: 'info' });

export class BlockchainCrawler {
  private ethereumCrawler: EthereumCrawler | null = null;
  private polygonCrawler: PolygonCrawler | null = null;
  private solanaCrawler: SolanaCrawler | null = null;
  private onNewAsset: ((asset: Asset) => void) | null = null;

  constructor(
    private rpcUrls: {
      ethereum?: string;
      polygon?: string;
      solana?: string;
    },
    private contractAddresses: {
      ethereum?: string[];
      polygon?: string[];
    } = {}
  ) {}

  setAssetHandler(handler: (asset: Asset) => void) {
    this.onNewAsset = handler;
  }

  async start() {
    logger.info('Starting blockchain crawlers...');

    // Start Ethereum crawler
    if (this.rpcUrls.ethereum) {
      this.ethereumCrawler = new EthereumCrawler(
        this.rpcUrls.ethereum,
        this.contractAddresses.ethereum || []
      );
      this.ethereumCrawler.startMonitoring((asset) => {
        if (this.onNewAsset) {
          this.onNewAsset(asset);
        }
      });
      logger.info('Ethereum crawler started');
    }

    // Start Polygon crawler
    if (this.rpcUrls.polygon) {
      this.polygonCrawler = new PolygonCrawler(
        this.rpcUrls.polygon,
        this.contractAddresses.polygon || []
      );
      this.polygonCrawler.startMonitoring((asset) => {
        if (this.onNewAsset) {
          this.onNewAsset(asset);
        }
      });
      logger.info('Polygon crawler started');
    }

    // Start Solana crawler
    if (this.rpcUrls.solana) {
      this.solanaCrawler = new SolanaCrawler(this.rpcUrls.solana);
      this.solanaCrawler.startMonitoring((asset) => {
        if (this.onNewAsset) {
          this.onNewAsset(asset);
        }
      });
      logger.info('Solana crawler started');
    }

    logger.info('All blockchain crawlers started');
  }

  stop() {
    logger.info('Stopping blockchain crawlers...');
    this.ethereumCrawler?.stop();
    this.polygonCrawler?.stop();
    this.solanaCrawler?.stop();
    logger.info('All blockchain crawlers stopped');
  }
}

