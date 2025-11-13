import { ethers } from 'ethers';
import pino from 'pino';
import type { Asset } from '../types.js';

const logger = pino({ transport: { target: 'pino-pretty' }, level: 'info' });

// ERC-721 ABI (minimal for token metadata)
const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalSupply() view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

// ERC-20 ABI (for token info)
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
];

export class EthereumCrawler {
  private provider: ethers.JsonRpcProvider;
  private contracts: string[] = [];
  private isRunning = false;

  constructor(rpcUrl: string, contractAddresses: string[] = []) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contracts = contractAddresses;
  }

  async startMonitoring(onNewAsset: (asset: Asset) => void) {
    if (this.isRunning) {
      logger.warn('Ethereum crawler already running');
      return;
    }

    this.isRunning = true;
    logger.info({ chain: 'Ethereum', contracts: this.contracts.length }, 'Starting Ethereum crawler');

    // Monitor known contracts
    for (const contractAddr of this.contracts) {
      this.monitorContract(contractAddr, onNewAsset).catch((err) => {
        logger.error({ err, contract: contractAddr }, 'Error monitoring contract');
      });
    }

    // Also monitor new blocks for Transfer events
    this.monitorNewBlocks(onNewAsset).catch((err) => {
      logger.error({ err }, 'Error monitoring new blocks');
    });
  }

  private async monitorContract(contractAddress: string, onNewAsset: (asset: Asset) => void) {
    try {
      const contract = new ethers.Contract(contractAddress, ERC721_ABI, this.provider);
      
      // Try to get contract info
      let name: string;
      let symbol: string;
      try {
        name = await contract.name();
        symbol = await contract.symbol();
      } catch {
        // Might be ERC-20, try that
        const erc20Contract = new ethers.Contract(contractAddress, ERC20_ABI, this.provider);
        name = await erc20Contract.name();
        symbol = await erc20Contract.symbol();
      }

      // Listen for Transfer events (new tokens minted)
      contract.on('Transfer', async (from: string, to: string, tokenId: bigint) => {
        if (from === ethers.ZeroAddress) {
          // This is a mint event
          try {
            const asset = await this.parseTokenToAsset(contractAddress, tokenId.toString(), name, symbol, 'Ethereum');
            if (asset) {
              onNewAsset(asset);
            }
          } catch (err) {
            logger.error({ err, contract: contractAddress, tokenId }, 'Error parsing token');
          }
        }
      });

      logger.info({ contract: contractAddress, name, symbol }, 'Monitoring contract');
    } catch (err) {
      logger.error({ err, contract: contractAddress }, 'Failed to setup contract monitoring');
    }
  }

  private async monitorNewBlocks(onNewAsset: (asset: Asset) => void) {
    this.provider.on('block', async (blockNumber) => {
      try {
        const block = await this.provider.getBlock(blockNumber, true);
        if (!block) return;

        // Scan transactions for Transfer events
        for (const tx of block.transactions) {
          if (typeof tx === 'string') continue;
          
          const receipt = await this.provider.getTransactionReceipt(tx.hash);
          if (!receipt) continue;

          // Look for Transfer events
          for (const log of receipt.logs) {
            // Transfer event signature: Transfer(address,address,uint256)
            if (log.topics.length === 4 && log.topics[0] === ethers.id('Transfer(address,address,uint256)')) {
              const from = ethers.getAddress('0x' + log.topics[1].slice(-40));
              if (from === ethers.ZeroAddress) {
                // New token minted
                const tokenId = BigInt(log.topics[3]).toString();
                try {
                  const contract = new ethers.Contract(log.address, ERC721_ABI, this.provider);
                  const name = await contract.name().catch(() => 'Unknown');
                  const symbol = await contract.symbol().catch(() => 'UNK');
                  const asset = await this.parseTokenToAsset(log.address, tokenId, name, symbol, 'Ethereum');
                  if (asset) {
                    onNewAsset(asset);
                  }
                } catch (err) {
                  // Skip if not a standard NFT contract
                }
              }
            }
          }
        }
      } catch (err) {
        logger.error({ err, blockNumber }, 'Error processing block');
      }
    });
  }

  private async parseTokenToAsset(
    contractAddress: string,
    tokenId: string,
    name: string,
    symbol: string,
    chain: 'Ethereum' | 'Polygon'
  ): Promise<Asset | null> {
    try {
      // Generate asset ID
      const id = `${chain.toLowerCase()}_${contractAddress.toLowerCase()}_${tokenId}`;
      
      // Try to determine category from name/symbol
      const category = this.inferCategory(name, symbol);
      
      // For now, use a placeholder price (in production, fetch from price oracle)
      const priceUSD = this.estimatePrice(category);

      return {
        id,
        name: `${name} #${tokenId}`,
        symbol: symbol.slice(0, 10).toUpperCase(),
        category,
        chain,
        status: 'active',
        priceUSD,
        createdAt: new Date().toISOString(),
        description: `Tokenized RWA on ${chain}: ${name} (${symbol}) - Token ID: ${tokenId}`,
      };
    } catch (err) {
      logger.error({ err }, 'Error parsing token to asset');
      return null;
    }
  }

  private inferCategory(name: string, symbol: string): Asset['category'] {
    const lower = (name + ' ' + symbol).toLowerCase();
    if (lower.includes('art') || lower.includes('painting') || lower.includes('sculpture')) {
      return 'Art';
    }
    if (lower.includes('real') || lower.includes('estate') || lower.includes('property')) {
      return 'RealEstate';
    }
    if (lower.includes('treasury') || lower.includes('bond') || lower.includes('t-bill')) {
      return 'Treasury';
    }
    if (lower.includes('gold') || lower.includes('silver') || lower.includes('commodity')) {
      return 'Commodity';
    }
    if (lower.includes('collectible') || lower.includes('vintage') || lower.includes('rare')) {
      return 'Collectible';
    }
    // Default
    return 'Collectible';
  }

  private estimatePrice(category: Asset['category']): number {
    const ranges: Record<Asset['category'], [number, number]> = {
      Art: [10_000, 500_000],
      RealEstate: [100_000, 5_000_000],
      Treasury: [1_000, 100_000],
      Commodity: [5_000, 200_000],
      Collectible: [1_000, 50_000],
    };
    const [min, max] = ranges[category] || [1_000, 100_000];
    return Math.floor(Math.random() * (max - min) + min);
  }

  stop() {
    this.isRunning = false;
    this.provider.removeAllListeners();
    logger.info('Ethereum crawler stopped');
  }
}

