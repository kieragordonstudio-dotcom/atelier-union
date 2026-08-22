import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { App } from './App';
import { ArtistsPage } from './pages/ArtistsPage';
import { BookingPage } from './pages/BookingPage';
import { FAQPage } from './pages/FAQPage';
import { HomePage } from './pages/HomePage';
import { LookbookPage } from './pages/LookbookPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { StudioPage } from './pages/StudioPage';
import { TreatmentsPage } from './pages/TreatmentsPage';
import './styles/tokens.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<HomePage />} />
          <Route path="services" element={<TreatmentsPage />} />
          <Route path="treatments" element={<TreatmentsPage />} />
          <Route path="lookbook" element={<LookbookPage />} />
          <Route path="artists" element={<ArtistsPage />} />
          <Route path="studio" element={<StudioPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="faq" element={<FAQPage />} />
          <Route path="book" element={<BookingPage />} />
          <Route path="policies" element={<PoliciesPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
