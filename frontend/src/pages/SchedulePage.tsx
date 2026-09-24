import { useParams } from 'react-router-dom';
import { OwnedSchedule } from './OwnedSchedule';

export default function SchedulePage() {
  const { id } = useParams();
  if (!id) return <div className="boot error">Missing schedule.</div>;
  return <OwnedSchedule moduleId={id} />;
}
