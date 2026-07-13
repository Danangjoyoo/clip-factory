import { youtubePublishingModule } from '../../../../../../modules/youtube-publishing/composition/youtube-publishing.module';

export async function POST(request: Request) {
  return youtubePublishingModule().connectionController.disconnect(request);
}
