import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import Dashboard from './pages/Dashboard';
import DriveEditor from './pages/DriveEditor';
import DriveHome from './pages/DriveHome';
import DriveNew from './pages/DriveNew';
import DriveViewer from './pages/DriveViewer';
import Login from './pages/Login';
import PublicView from './pages/PublicView';
import { RequireAuth } from './pages/RequireAuth';
import SchedulePage from './pages/SchedulePage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/v/:token" element={<PublicView />} />
        <Route path="/view" element={<Navigate to="/login" replace />} />

        <Route path="/drive" element={<DriveHome />} />
        <Route path="/drive/new" element={<DriveNew />} />
        <Route path="/new" element={<DriveNew />} />
        <Route path="/drive/edit" element={<DriveEditor />} />
        <Route path="/edit" element={<DriveEditor />} />
        <Route path="/drive/view" element={<DriveViewer />} />

        <Route element={<RequireAuth />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/db" element={<Navigate to="/" replace />} />
          <Route path="/schedules/:id" element={<SchedulePage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
