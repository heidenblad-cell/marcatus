import React from 'react';
import type { StatsResponse } from '../types';
import { Pill } from './Pill';

interface StatsPanelProps {
  stats: StatsResponse | null;
  loading: boolean;
}

export function StatsPanel({ stats, loading }: StatsPanelProps) {
  if (loading) {
    return (
      <div
        style={{
          background: '#1e2433',
          padding: 20,
          borderRadius: 14,
          minWidth: 280,
          border: '1px solid #2a3144',
        }}
      >
        <h3 style={{ marginTop: 0, color: '#f1d6ff' }}>Statistics</h3>
        <div style={{ color: '#8b8fa3' }}>Loading...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div
        style={{
          background: '#1e2433',
          padding: 20,
          borderRadius: 14,
          minWidth: 280,
          border: '1px solid #2a3144',
        }}
      >
        <h3 style={{ marginTop: 0, color: '#f1d6ff' }}>Statistics</h3>
        <div style={{ color: '#8b8fa3' }}>No data available</div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#1e2433',
        padding: 20,
        borderRadius: 14,
        minWidth: 280,
        border: '1px solid #2a3144',
        position: 'sticky',
        top: 20,
        height: 'fit-content',
      }}
    >
      <h3 style={{ marginTop: 0, color: '#f1d6ff', marginBottom: 16 }}>Statistics</h3>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#a95cff', marginBottom: 4 }}>
          {stats.total}
        </div>
        <div style={{ fontSize: 14, color: '#8b8fa3' }}>Total Assets</div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#b8bcc8', marginBottom: 8 }}>
          Price Range
        </div>
        <div style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 4 }}>
          Min: ${stats.price.min.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 4 }}>
          Max: ${stats.price.max.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: '#8b8fa3' }}>
          Avg: ${Math.round(stats.price.avg).toLocaleString()}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#b8bcc8', marginBottom: 8 }}>
          By Category
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {stats.byCategory.map((item) => (
            <Pill key={item.key} variant="category">
              {item.key} ({item.count})
            </Pill>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#b8bcc8', marginBottom: 8 }}>
          By Chain
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {stats.byChain.map((item) => (
            <Pill key={item.key} variant="chain">
              {item.key} ({item.count})
            </Pill>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#b8bcc8', marginBottom: 8 }}>
          By Status
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {stats.byStatus.map((item) => (
            <Pill key={item.key} variant="status">
              {item.key} ({item.count})
            </Pill>
          ))}
        </div>
      </div>
    </div>
  );
}

