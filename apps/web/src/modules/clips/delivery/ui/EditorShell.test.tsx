import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddClipDialog } from './AddClipDialog';
import { EditorShell } from './EditorShell';

const clip = {
  id: 'clip-1',
  title: 'Opening',
  startMs: 1000,
  endMs: 5000,
  sourceDurationMs: 10000,
  state: 'READY',
};

describe('EditorShell', () => {
  afterEach(cleanup);
  it('allows selecting a ready filmstrip clip while the current clip updates', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { unmount } = render(
      <EditorShell
        clips={[
          {
            ...clip,
            id: 'updating',
            title: 'Updating clip',
            previewState: 'UPDATING',
          },
          { ...clip, id: 'ready', title: 'Ready clip', previewState: 'READY' },
        ]}
        selectedClipId="updating"
        onSelect={onSelect}
        onAddClip={vi.fn()}
        onRenderSelected={vi.fn()}
        onRenderAll={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /ready clip/i }));
    expect(onSelect).toHaveBeenCalledWith('ready');
    unmount();
  });

  it('submits manual source timecodes as milliseconds', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const { unmount } = render(
      <AddClipDialog open onCancel={vi.fn()} onAdd={onAdd} />,
    );

    await user.clear(screen.getByLabelText('Start timecode'));
    await user.type(screen.getByLabelText('Start timecode'), '00:32:14');
    await user.clear(screen.getByLabelText('End timecode'));
    await user.type(screen.getByLabelText('End timecode'), '00:33:02');
    await user.click(screen.getByRole('button', { name: 'Add clip' }));

    expect(onAdd).toHaveBeenCalledWith(1_934_000, 1_982_000);
    unmount();
  });

  it('accepts the largest valid hour timecode', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const { unmount } = render(<AddClipDialog open onCancel={vi.fn()} onAdd={onAdd} />);

    await user.clear(screen.getByLabelText('Start timecode'));
    await user.type(screen.getByLabelText('Start timecode'), '99:59:58');
    await user.clear(screen.getByLabelText('End timecode'));
    await user.type(screen.getByLabelText('End timecode'), '99:59:59');
    await user.click(screen.getByRole('button', { name: 'Add clip' }));

    expect(onAdd).toHaveBeenCalledWith(359_998_000, 359_999_000);
    unmount();
  });

  it('focuses the start timecode when the dialog opens', () => {
    render(<AddClipDialog open onCancel={vi.fn()} onAdd={vi.fn()} />);

    expect(screen.getByLabelText('Start timecode')).toHaveFocus();
  });

  it.each(['00:00:01:00', '00::01'])(
    'rejects malformed timecode %s',
    async (start) => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      const { unmount } = render(
        <AddClipDialog open onCancel={vi.fn()} onAdd={onAdd} />,
      );

      await user.clear(screen.getByLabelText('Start timecode'));
      await user.type(screen.getByLabelText('Start timecode'), start);
      await user.click(screen.getByRole('button', { name: 'Add clip' }));

      expect(onAdd).not.toHaveBeenCalled();
      unmount();
    },
  );

  it('shows frame and metadata inspector tabs after the timeline in DOM order', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <EditorShell
        clips={[clip]}
        onSelect={vi.fn()}
        onAddClip={vi.fn()}
        onRenderSelected={vi.fn()}
        onRenderAll={vi.fn()}
      />,
    );

    const timeline = screen.getByRole('region', { name: 'Trim timeline' });
    const inspector = screen.getByRole('complementary', { name: 'Inspector' });
    expect(timeline.compareDocumentPosition(inspector)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      screen.getByRole('button', { name: 'Center focal point' }),
    ).toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'Metadata' }));
    expect(screen.getByText('Origin')).toBeVisible();
    unmount();
  });

  it('displays selected clip provenance in the metadata inspector', async () => {
    const user = userEvent.setup();
    render(
      <EditorShell
        clips={[
          {
            ...clip,
            origin: 'AI_HIGHLIGHT',
            model: 'gpt-5.2',
            reasoning: 'Strong opening hook',
            score: 0.92,
            costMicrousd: 2_500_000n,
            language: 'en-US',
            inheritedFrame: '9:16 · 1080×1920',
            outputFrame: '9:16 · 1080×1920',
          },
        ]}
        onSelect={vi.fn()}
        onAddClip={vi.fn()}
        onRenderSelected={vi.fn()}
        onRenderAll={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Metadata' }));
    expect(screen.getByText('gpt-5.2')).toBeVisible();
    expect(screen.getByText('Strong opening hook')).toBeVisible();
    expect(screen.getByText('0.92')).toBeVisible();
    expect(screen.getByText(/\$2\.50/)).toBeVisible();
    expect(screen.getByText('1000–5000 ms')).toBeVisible();
    expect(screen.getByText('en-US')).toBeVisible();
    expect(screen.getByText('Output frame: 9:16 · 1080×1920')).toBeVisible();
  });

  it('shows selected output-frame provenance instead of a fixed frame', () => {
    render(
      <EditorShell
        clips={[{ ...clip, outputFrame: '4:5 · 1080×1350' }]}
        projectOutputFrame="9:16 · 1080×1920"
        onSelect={vi.fn()}
        onAddClip={vi.fn()}
        onRenderSelected={vi.fn()}
        onRenderAll={vi.fn()}
      />,
    );

    expect(screen.getByText('Output frame: 4:5 · 1080×1350')).toBeVisible();
  });

  it('shows an unavailable output frame when provenance is absent', () => {
    render(
      <EditorShell
        clips={[clip]}
        onSelect={vi.fn()}
        onAddClip={vi.fn()}
        onRenderSelected={vi.fn()}
        onRenderAll={vi.fn()}
      />,
    );

    expect(screen.getByText('Output frame: Not available')).toBeVisible();
  });

  it('wires selection, trim, add and render actions', async () => {
    const onTrimChange = vi.fn();
    const user = userEvent.setup();
    const onAddClip = vi.fn();
    const onRenderSelected = vi.fn();
    render(
      <EditorShell
        clips={[clip]}
        onSelect={vi.fn()}
        onAddClip={onAddClip}
        onTrimChange={onTrimChange}
        onRenderSelected={onRenderSelected}
        onRenderAll={vi.fn()}
      />,
    );
    expect(screen.getByRole('main', { name: 'Clip editor' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Trim timeline' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Render selected' }));
    expect(onRenderSelected).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Add Clip' }));
    expect(screen.getByLabelText('Start timecode')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Add clip' }));
    expect(onAddClip).toHaveBeenCalledWith(0, 10000);
  });
});
