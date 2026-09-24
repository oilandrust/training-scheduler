import DbApp from './pages/DbApp';
import DbViewer from './pages/DbViewer';
import DriveEditor from './pages/DriveEditor';
import DriveHome from './pages/DriveHome';
import DriveNew from './pages/DriveNew';
import DriveViewer from './pages/DriveViewer';

function currentPath(): string {
  return window.location.pathname.replace(/\/$/, '') || '/';
}

export default function App() {
  const path = currentPath();

  // Primary: Postgres-backed editor and read-only view
  if (path === '/' || path === '') return <DbApp />;
  if (path === '/view') return <DbViewer />;

  // Drive prototype kept under /drive for later
  if (path === '/drive') return <DriveHome />;
  if (path === '/drive/new' || path === '/new') return <DriveNew />;
  if (path === '/drive/edit' || path === '/edit') return <DriveEditor />;
  if (path === '/drive/view') return <DriveViewer />;

  // Legacy alias
  if (path === '/db') return <DbApp />;

  return <DbApp />;
}
