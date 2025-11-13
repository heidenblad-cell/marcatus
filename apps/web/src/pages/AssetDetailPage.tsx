import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Asset } from '../types';
import { Pill } from '../components/Pill';

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Invalid asset ID');
      setLoading(false);
      return;
    }

    const loadAsset = async () => {
      try {
        const r = await fetch(`/assets/${id}`);
        if (!r.ok) {
          if (r.status === 404) {
            setError('Asset not found');
          } else {
            setError('Failed to load asset');
          }
          return;
        }
        const data: Asset = await r.json();
        setAsset(data);
      } catch (err) {
        console.error('Failed to load asset:', err);
        setError('Failed to load asset');
      } finally {
        setLoading(false);
      }
    };

    loadAsset();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: 40, color: '#8b8fa3' }}>Loading...</div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: '#2a3144',
            color: '#fff',
            border: '1px solid #3a4258',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          ← Back to Search
        </button>
        <div
          style={{
            background: '#1e2433',
            padding: 24,
            borderRadius: 14,
            border: '1px solid #2a3144',
            textAlign: 'center',
            color: '#8b8fa3',
          }}
        >
          {error || 'Asset not found'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <button
        onClick={() => navigate('/')}
        style={{
          background: '#2a3144',
          color: '#fff',
          border: '1px solid #3a4258',
          padding: '8px 16px',
          borderRadius: 8,
          cursor: 'pointer',
          marginBottom: 24,
          fontSize: 14,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#3a4258')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#2a3144')}
      >
        ← Back to Search
      </button>

      <div
        style={{
          background: '#1e2433',
          padding: 32,
          borderRadius: 14,
          border: '1px solid #2a3144',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <Pill variant="category">{asset.category}</Pill>
          <Pill variant="chain">{asset.chain}</Pill>
          <Pill variant="status">{asset.status}</Pill>
        </div>

        <h1 style={{ color: '#f1d6ff', fontSize: 36, fontWeight: 700, marginBottom: 8 }}>
          {asset.name}
        </h1>

        <div style={{ fontSize: 14, color: '#8b8fa3', marginBottom: 24 }}>
          Symbol: <strong style={{ color: '#b8bcc8' }}>{asset.symbol}</strong> • Created:{' '}
          {new Date(asset.createdAt).toLocaleString()}
        </div>

        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#a95cff',
            marginBottom: 32,
            paddingBottom: 24,
            borderBottom: '1px solid #2a3144',
          }}
        >
          ${asset.priceUSD.toLocaleString()}
        </div>

        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#f1d6ff', fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
            Description
          </h3>
          <p style={{ color: '#b8bcc8', fontSize: 16, lineHeight: 1.6, margin: 0 }}>
            {asset.description}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginTop: 32,
            paddingTop: 24,
            borderTop: '1px solid #2a3144',
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 4 }}>Asset ID</div>
            <div style={{ fontSize: 14, color: '#b8bcc8', fontFamily: 'monospace' }}>
              {asset.id}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 4 }}>Category</div>
            <div style={{ fontSize: 14, color: '#b8bcc8' }}>{asset.category}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 4 }}>Blockchain</div>
            <div style={{ fontSize: 14, color: '#b8bcc8' }}>{asset.chain}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#8b8fa3', marginBottom: 4 }}>Status</div>
            <div style={{ fontSize: 14, color: '#b8bcc8' }}>{asset.status}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

