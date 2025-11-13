import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { AssetDetailPage } from './pages/AssetDetailPage';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/assets/:id" element={<AssetDetailPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
