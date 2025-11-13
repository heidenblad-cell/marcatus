import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Asset } from '../types';
import { Pill } from './Pill';

interface AssetCardProps {
  asset: Asset;
}

export function AssetCard({ asset }: AssetCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/assets/${asset.id}`);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        background: '#111624',
        padding: 16,
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        border: '1px solid #1e2433',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(169, 92, 255, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <Pill variant="category">{asset.category}</Pill>
        <Pill variant="chain">{asset.chain}</Pill>
        <Pill variant="status">{asset.status}</Pill>
      </div>
      <h4 style={{ margin: '8px 0 4px 0', fontSize: 18, fontWeight: 600, color: '#f1d6ff' }}>
        {asset.name}
      </h4>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#a95cff', marginBottom: 8 }}>
        ${asset.priceUSD.toLocaleString()}
      </div>
      <div style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 8 }}>
        {new Date(asset.createdAt).toLocaleDateString()}
      </div>
      <p
        style={{
          fontSize: 14,
          color: '#b8bcc8',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {asset.description}
      </p>
    </div>
  );
}

