import React from 'react';

interface PillProps {
  children: React.ReactNode;
  variant?: 'default' | 'category' | 'chain' | 'status';
}

const variantColors: Record<string, string> = {
  category: '#6366f1',
  chain: '#10b981',
  status: '#f59e0b',
  default: '#2a3144',
};

export function Pill({ children, variant = 'default' }: PillProps) {
  const bgColor = variantColors[variant] || variantColors.default;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 999,
        background: bgColor,
        marginRight: 6,
        fontSize: 12,
        fontWeight: 500,
        color: '#fff',
      }}
    >
      {children}
    </span>
  );
}

