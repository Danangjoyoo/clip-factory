import { youtubePublishingModule } from '../../../../../modules/youtube-publishing/composition/youtube-publishing.module';

export async function GET() {
  return youtubePublishingModule().connectionController.get();
}

export async function POST(request: Request) {
  return youtubePublishingModule().connectionController.connect(request);
}
