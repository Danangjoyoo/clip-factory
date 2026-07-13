import { EditorLocalPage } from '../../../../modules/clips/delivery/ui/EditorLocalPage';
import { editorView } from '../../../../modules/clips/composition/clip-views.composition';

export default async function EditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <EditorLocalPage {...(await editorView(projectId))} />;
}
