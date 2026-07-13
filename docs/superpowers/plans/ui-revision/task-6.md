# Task 6: YouTube connection, channel/account management, publishing gallery, and Details drawer

**Files:**

- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/YouTubeConnectionView.tsx`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/YouTubeAccountMenu.tsx`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/PublishingGallery.tsx`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/PublicationDetailsDrawer.tsx`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/PublishingView.module.css`
- Create: `apps/web/src/modules/youtube-publishing/delivery/ui/PublishingGallery.test.tsx`
- Create: `apps/web/src/app/projects/[projectId]/youtube/page.tsx`
- Create: `apps/web/src/modules/youtube-publishing/delivery/http/publishing-ui.controller.ts`
- Modify: `apps/web/src/modules/youtube-publishing/composition/youtube-publishing.composition.ts`

**Interfaces:**

- Consume sanitized `YouTubeConnectionViewModel`, `ChannelChoiceViewModel`, and
  `PublicationCardViewModel`; no token/code/PKCE field is present in a React
  prop or API response.
- Drawer tab union: `'publishing' | 'metadata' | 'thumbnail' | 'schedule'`.
- Account actions emit `onConnect`, `onChooseChannel(channelId)`,
  `onSwitchChannel`, and `onDisconnect`; they never mutate a connection in the
  browser directly.
- This task starts only after Phase 2 YouTube plan Tasks 8, 13, and 14 expose
  sanitized connection and publication view models.

- [ ] **Step 1: Write failing connection/gallery tests**

```tsx
it('opens a sanitized channel chooser after OAuth completes', async () => {
  render(<YouTubeConnectionView state="CHOOSE_CHANNEL" channels={channels} {...handlers} />);
  await userEvent.click(screen.getByRole('button', { name: 'Use Clip Factory Studio' }));
  expect(handlers.onChooseChannel).toHaveBeenCalledWith('brand-channel-id');
});

it('keeps publishing card actions inside Details', async () => {
  render(<PublishingGallery publications={[publication]} {...handlers} />);
  expect(screen.getAllByRole('button', { name: 'Details' })).toHaveLength(1);
  await userEvent.click(screen.getByRole('button', { name: 'Details' }));
  expect(screen.getByRole('tab', { name: 'Schedule' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run --config vitest.workspace.ts --project=unit apps/web/src/modules/publishing/delivery/ui/PublishingGallery.test.tsx`

Expected: FAIL because publishing UI components do not exist.

- [ ] **Step 3: Implement OAuth/channel/account UI only through sanitized contracts**

Render `Connect YouTube`; after the native worker reports sanitized choices,
render personal/Brand channel cards. Show connection health in the channel chip.
`Switch channel` must start a fresh explicit flow and explain that existing
uploads/schedules remain in their original channel. `Disconnect` must explain
that local drafts/history remain while the worker revokes/removes credentials.

- [ ] **Step 4: Implement the clean publishing gallery and Details drawer**

Cards show poster, duration, title, compact state, and exactly one `Details`
button. The drawer contains Publishing, Metadata, Thumbnail, and Schedule tabs.
Every schedule is per clip with IANA timezone. Metadata generation and Complete
mode scheduling recommendation remain drafts until explicit save/confirmation;
no component calls upload/schedule automatically.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm exec vitest run --config vitest.workspace.ts --project=unit apps/web/src/modules/publishing/delivery/ui/PublishingGallery.test.tsx`

Expected: PASS.

Run: `pnpm --filter @clip-factory/web typecheck`

Expected: exit code 0.

```bash
git add apps/web/src/modules/youtube-publishing apps/web/src/app/projects
git commit -m "feat: add YouTube publishing workspace UI"
```
