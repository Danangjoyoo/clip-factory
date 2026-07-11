export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <main>
      <h1>Project {projectId}</h1>
      <p>Project details and media gallery are coming soon.</p>
    </main>
  );
}
