import { ResultsDashboard } from '../../../../modules/clips/delivery/ui/ResultsDashboard';

export default async function ClipsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <ResultsDashboard
      clips={[
        {
          id: 'clip-1',
          title: 'First local render',
          durationLabel: '00:28',
          state: 'RENDERING',
          originLabel: 'AI highlight · score pending',
          sizeLabel: 'Size available after render',
          formatLabel: 'MP4 · H.264 + AAC · captions stitched',
          editorHref: `/projects/${projectId}/editor`,
        },
      ]}
    />
  );
}
