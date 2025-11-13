import React, { useEffect, useState, useCallback } from 'react';
import type { Asset, SearchParams, SearchResponse, StatsResponse } from '../types';
import { AssetCard } from '../components/AssetCard';
import { StatsPanel } from '../components/StatsPanel';

const ITEMS_PER_PAGE = 20;

export function HomePage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [items, setItems] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawlerStatus, setCrawlerStatus] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState<SearchParams>({
    q: '',
    sort: 'createdAt_desc',
    limit: ITEMS_PER_PAGE,
    offset: 0,
  });

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch('/assets/stats');
      if (!r.ok) throw new Error('Failed to load stats');
      const j = await r.json();
      setStats(j);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(async (params: SearchParams) => {
    setSearchLoading(true);
    try {
      const url = new URL('/assets/search', location.origin);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      });
      const r = await fetch(url);
      if (!r.ok) throw new Error('Search failed');
      const j: SearchResponse = await r.json();
      setItems(j.items);
      setTotal(j.total);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const params = {
      ...filters,
      offset: currentPage * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE,
    };
    search(params);
  }, [filters, currentPage, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
    search({ ...filters, offset: 0, limit: ITEMS_PER_PAGE });
  };

  const handleFilterChange = (key: keyof SearchParams, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(0);
  };

  const handleCrawl = async () => {
    setCrawling(true);
    setCrawlerStatus(null);
    try {
      const r = await fetch('/crawl/run', { method: 'POST' });
      if (!r.ok) throw new Error('Crawl failed');
      const result = await r.json();
      setCrawlerStatus(`✅ Successfully crawled ${result.insertedOrUpdated} assets!`);
      // Reload stats and search results
      await loadStats();
      const params = {
        ...filters,
        offset: currentPage * ITEMS_PER_PAGE,
        limit: ITEMS_PER_PAGE,
      };
      await search(params);
    } catch (err) {
      console.error('Crawl error:', err);
      setCrawlerStatus('❌ Failed to run crawler. Make sure the crawler service is running.');
    } finally {
      setCrawling(false);
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ color: '#f1d6ff', fontSize: 36, fontWeight: 700, marginBottom: 8 }}>
              Marcatus
            </h1>
            <p style={{ color: '#8b8fa3', fontSize: 16, margin: 0 }}>
              Real-World Assets Marketplace
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <button
              onClick={handleCrawl}
              disabled={crawling}
              style={{
                background: crawling ? '#3a4258' : '#10b981',
                color: '#fff',
                border: 0,
                padding: '10px 20px',
                borderRadius: 10,
                cursor: crawling ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 600,
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              onMouseEnter={(e) => {
                if (!crawling) e.currentTarget.style.background = '#059669';
              }}
              onMouseLeave={(e) => {
                if (!crawling) e.currentTarget.style.background = '#10b981';
              }}
            >
              {crawling ? '🕷️ Crawling...' : '🕷️ Run Crawler'}
            </button>
            {crawlerStatus && (
              <div
                style={{
                  fontSize: 12,
                  color: crawlerStatus.startsWith('✅') ? '#10b981' : '#ef4444',
                  padding: '6px 12px',
                  background: '#1e2433',
                  borderRadius: 6,
                  border: '1px solid #2a3144',
                  maxWidth: 300,
                  textAlign: 'right',
                }}
              >
                {crawlerStatus}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <StatsPanel stats={stats} loading={loading} />

        <div
          style={{
            background: '#1e2433',
            padding: 24,
            borderRadius: 14,
            minWidth: 320,
            flex: 1,
            border: '1px solid #2a3144',
          }}
        >
          <h3 style={{ marginTop: 0, color: '#f1d6ff', marginBottom: 20 }}>Search Assets</h3>

          <form onSubmit={handleSearch} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <input
                type="text"
                value={filters.q || ''}
                onChange={(e) => handleFilterChange('q', e.target.value)}
                placeholder="Search by name, symbol, or description..."
                style={{
                  flex: 1,
                  minWidth: 200,
                  background: '#2a3144',
                  color: '#fff',
                  border: '1px solid #3a4258',
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 14,
                }}
              />
              <select
                value={filters.sort || 'createdAt_desc'}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                style={{
                  background: '#2a3144',
                  color: '#fff',
                  border: '1px solid #3a4258',
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <option value="createdAt_desc">Newest First</option>
                <option value="createdAt_asc">Oldest First</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="price_asc">Price: Low to High</option>
              </select>
              <button
                type="submit"
                style={{
                  background: '#a95cff',
                  color: '#fff',
                  border: 0,
                  padding: '10px 20px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#8b4dd9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#a95cff')}
              >
                Search
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                style={{
                  background: '#2a3144',
                  color: '#fff',
                  border: '1px solid #3a4258',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <option value="">All Categories</option>
                <option value="Art">Art</option>
                <option value="RealEstate">Real Estate</option>
                <option value="Treasury">Treasury</option>
                <option value="Commodity">Commodity</option>
                <option value="Collectible">Collectible</option>
              </select>

              <select
                value={filters.chain || ''}
                onChange={(e) => handleFilterChange('chain', e.target.value || undefined)}
                style={{
                  background: '#2a3144',
                  color: '#fff',
                  border: '1px solid #3a4258',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <option value="">All Chains</option>
                <option value="Ethereum">Ethereum</option>
                <option value="Polygon">Polygon</option>
                <option value="Solana">Solana</option>
                <option value="Private">Private</option>
              </select>

              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                style={{
                  background: '#2a3144',
                  color: '#fff',
                  border: '1px solid #3a4258',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="locked">Locked</option>
                <option value="settled">Settled</option>
                <option value="pending">Pending</option>
              </select>

              <input
                type="number"
                placeholder="Min Price"
                value={filters.priceMin || ''}
                onChange={(e) =>
                  handleFilterChange('priceMin', e.target.value ? Number(e.target.value) : undefined)
                }
                style={{
                  background: '#2a3144',
                  color: '#fff',
                  border: '1px solid #3a4258',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  width: 120,
                }}
              />

              <input
                type="number"
                placeholder="Max Price"
                value={filters.priceMax || ''}
                onChange={(e) =>
                  handleFilterChange('priceMax', e.target.value ? Number(e.target.value) : undefined)
                }
                style={{
                  background: '#2a3144',
                  color: '#fff',
                  border: '1px solid #3a4258',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  width: 120,
                }}
              />
            </div>
          </form>

          {searchLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#8b8fa3' }}>Loading...</div>
          ) : (
            <>
              <div style={{ marginBottom: 16, color: '#8b8fa3', fontSize: 14 }}>
                Found {total} asset{total !== 1 ? 's' : ''}
              </div>

              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#8b8fa3' }}>
                  No assets found. Try adjusting your filters.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: 16,
                      marginBottom: 24,
                    }}
                  >
                    {items.map((asset) => (
                      <AssetCard key={asset.id} asset={asset} />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        style={{
                          background: currentPage === 0 ? '#2a3144' : '#3a4258',
                          color: '#fff',
                          border: 0,
                          padding: '8px 16px',
                          borderRadius: 8,
                          cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                          fontSize: 14,
                        }}
                      >
                        Previous
                      </button>
                      <span style={{ color: '#8b8fa3', fontSize: 14 }}>
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage >= totalPages - 1}
                        style={{
                          background: currentPage >= totalPages - 1 ? '#2a3144' : '#3a4258',
                          color: '#fff',
                          border: 0,
                          padding: '8px 16px',
                          borderRadius: 8,
                          cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                          fontSize: 14,
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

