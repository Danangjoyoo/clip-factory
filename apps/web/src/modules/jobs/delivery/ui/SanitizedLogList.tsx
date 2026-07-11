export function SanitizedLogList({ logs }: { logs: string[] }) {
  return (
    <details>
      <summary>Worker logs</summary>
      <ul>
        {logs.map((log, i) => (
          <li key={i}>{log}</li>
        ))}
      </ul>
    </details>
  );
}
