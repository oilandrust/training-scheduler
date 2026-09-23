import DbApp from './pages/DbApp';
import DriveEditor from './pages/DriveEditor';
import DriveHome from './pages/DriveHome';
import DriveNew from './pages/DriveNew';

function currentPath(): string {
  return window.location.pathname.replace(/\/$/, '') || '/';
}

export default function App() {
  const path = currentPath();

  if (path === '/db') return <DbApp />;
  if (path === '/new') return <DriveNew />;
  if (path === '/edit') return <DriveEditor />;
  return <DriveHome />;
}
