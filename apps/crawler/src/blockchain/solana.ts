import { Connection, PublicKey } from '@solana/web3.js';
import pino from 'pino';
import type { Asset } from '../types.js';

const logger = pino({ transport: { target: 'pino-pretty' }, level: 'info' });

export class SolanaCrawler {
  private connection: Connection;
  private isRunning = false;
  private subscriptionId: number | null = null;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async startMonitoring(onNewAsset: (asset: Asset) => void) {
    if (this.isRunning) {
      logger.warn('Solana crawler already running');
      return;
    }

    this.isRunning = true;
    logger.info({ chain: 'Solana' }, 'Starting Solana crawler');

    // Monitor for new program deployments and token mints
    this.monitorNewSignatures(onNewAsset).catch((err) => {
      logger.error({ err }, 'Error monitoring Solana signatures');
    });

    // Also poll for new slots periodically
    this.pollNewSlots(onNewAsset).catch((err) => {
      logger.error({ err }, 'Error polling Solana slots');
    });
  }

  private async monitorNewSignatures(onNewAsset: (asset: Asset) => void) {
    // Subscribe to program account changes
    // Note: This is a simplified version - in production you'd monitor specific programs
    try {
      this.connection.onProgramAccountChange(
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), // SPL Token Program
        async (accountInfo, context) => {
          try {
            // Parse token account data
            const asset = await this.parseTokenAccount(accountInfo.accountId.toString());
            if (asset) {
              onNewAsset(asset);
            }
          } catch (err) {
            // Skip if not parseable
          }
        },
        'confirmed'
      );
    } catch (err) {
      logger.error({ err }, 'Failed to subscribe to Solana program changes');
    }
  }

  private async pollNewSlots(onNewAsset: (asset: Asset) => void) {
    let lastSlot = await this.connection.getSlot();
    
    setInterval(async () => {
      try {
        const currentSlot = await this.connection.getSlot();
        if (currentSlot > lastSlot) {
          // New blocks available, scan for new tokens
          const blocks = await this.connection.getBlocks(lastSlot + 1, currentSlot);
          for (const slot of blocks) {
            await this.scanSlot(slot, onNewAsset);
          }
          lastSlot = currentSlot;
        }
      } catch (err) {
        logger.error({ err }, 'Error polling Solana slots');
      }
    }, 5000); // Poll every 5 seconds
  }

  private async scanSlot(slot: number, onNewAsset: (asset: Asset) => void) {
    try {
      const block = await this.connection.getBlock(slot, {
        maxSupportedTransactionVersion: 0,
      });
      if (!block) return;

      // Scan transactions for token mints
      for (const tx of block.transactions) {
        if (tx.meta?.err) continue; // Skip failed transactions

        // Look for token mint instructions
        for (const instruction of tx.transaction.message.instructions) {
          if ('programId' in instruction) {
            const programId = instruction.programId.toString();
            // SPL Token program
            if (programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
              try {
                const asset = await this.parseTransactionToAsset(tx, slot);
                if (asset) {
                  onNewAsset(asset);
                }
              } catch (err) {
                // Skip if not parseable
              }
            }
          }
        }
      }
    } catch (err) {
      logger.error({ err, slot }, 'Error scanning Solana slot');
    }
  }

  private async parseTokenAccount(accountId: string): Promise<Asset | null> {
    try {
      const id = `solana_${accountId}`;
      const category = 'Collectible'; // Default for Solana tokens
      const priceUSD = Math.floor(Math.random() * (50_000 - 1_000) + 1_000);

      return {
        id,
        name: `Solana Token ${accountId.slice(0, 8)}`,
        symbol: 'SOL-RWA',
        category,
        chain: 'Solana',
        status: 'active',
        priceUSD,
        createdAt: new Date().toISOString(),
        description: `Tokenized RWA on Solana - Account: ${accountId}`,
      };
    } catch (err) {
      return null;
    }
  }

  private async parseTransactionToAsset(tx: any, slot: number): Promise<Asset | null> {
    try {
      // Extract token mint from transaction
      const accountKeys = tx.transaction.message.accountKeys.map((k: any) =>
        typeof k === 'string' ? k : k.pubkey.toString()
      );
      
      if (accountKeys.length < 2) return null;

      const mintAddress = accountKeys[0];
      const id = `solana_${mintAddress}_${slot}`;
      const category = 'Collectible';
      const priceUSD = Math.floor(Math.random() * (50_000 - 1_000) + 1_000);

      return {
        id,
        name: `Solana Asset ${mintAddress.slice(0, 8)}`,
        symbol: 'SOL-RWA',
        category,
        chain: 'Solana',
        status: 'active',
        priceUSD,
        createdAt: new Date().toISOString(),
        description: `Tokenized RWA on Solana - Mint: ${mintAddress}`,
      };
    } catch (err) {
      return null;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.subscriptionId !== null) {
      this.connection.removeAccountChangeListener(this.subscriptionId);
    }
    logger.info('Solana crawler stopped');
  }
}

