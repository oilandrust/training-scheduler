import { DbSchedule } from './DbSchedule';

/** Prisma-backed read-only schedule at `/view`. */
export default function DbViewer() {
  return (
    <DbSchedule
      readOnly
      headerExtra={
        <div className="drive-actions">
          <a className="btn primary" href="/">
            Open Editor
          </a>
        </div>
      }
    />
  );
}
