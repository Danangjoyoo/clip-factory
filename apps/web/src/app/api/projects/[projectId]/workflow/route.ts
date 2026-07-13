import { NextResponse } from 'next/server';
import { workflowsComposition } from '../../../../../modules/workflows/composition/workflows.composition';

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  try {
    return NextResponse.json(
      await workflowsComposition().runner.execute(projectId),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'WORKFLOW_FAILED';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
