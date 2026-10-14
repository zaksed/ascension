import { useEffect, lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { useApp } from './store/app';
import { HomePage } from './pages/HomePage';

// Pages chargées à la demande (toutes pré-cachées pour le hors-ligne).
const CoursePage = lazy(() => import('./pages/CoursePage'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const TrainingPage = lazy(() => import('./pages/TrainingPage'));
const TrainingSessionPage = lazy(() => import('./pages/TrainingSessionPage'));
const PlacementPage = lazy(() => import('./pages/PlacementPage'));
const ExamsPage = lazy(() => import('./pages/ExamsPage'));
const ExamRunnerPage = lazy(() => import('./pages/ExamRunnerPage'));
const ExamReportPage = lazy(() => import('./pages/ExamReportPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export function App() {
  const ready = useApp((s) => s.ready);
  const init = useApp((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);

  if (!ready) return <Spinner label="Ouverture d’Ascension…" />;

  return (
    <HashRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="parcours" element={<CoursePage />} />
            <Route path="parcours/:exam" element={<CoursePage />} />
            <Route path="lecon/:exam/:unitId/:lesson" element={<LessonPage />} />
            <Route path="revision" element={<ReviewPage />} />
            <Route path="revision/seance/:exam" element={<ReviewPage />} />
            <Route path="entrainement" element={<TrainingPage />} />
            <Route path="entrainement/seance/:exam" element={<TrainingSessionPage />} />
            <Route path="placement/:exam" element={<PlacementPage />} />
            <Route path="examens" element={<ExamsPage />} />
            <Route path="examen/:exam/:mockId" element={<ExamRunnerPage />} />
            <Route path="rapport/:attemptId" element={<ExamReportPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="reglages" element={<SettingsPage />} />
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
