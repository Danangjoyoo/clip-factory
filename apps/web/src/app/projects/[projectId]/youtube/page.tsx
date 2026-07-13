import { YouTubePublishingLocalPage } from '../../../../modules/youtube-publishing/delivery/ui/PublishingGallery';

export default async function ProjectYouTubePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <YouTubePublishingLocalPage projectId={projectId} />;
}
