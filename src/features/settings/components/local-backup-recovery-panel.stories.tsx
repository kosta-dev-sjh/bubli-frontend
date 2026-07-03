import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LocalBackupRecoveryPanel } from "./local-backup-recovery-panel";

const meta = {
  args: {
    autoLoad: false,
    initialIntegrity: {
      checkedAt: "2026-07-04T09:20:00+09:00",
      databaseSizeBytes: 18_874_368,
      freelistCount: 2,
      journalMode: "wal",
      ok: true,
      pageCount: 4608,
      pageSize: 4096,
      quickCheck: "ok",
      recoveryRequired: false,
      walSizeBytes: 1_048_576,
    },
    initialManifest: {
      backups: [
        {
          backupId: "backup-story-1",
          createdAt: "2026-07-04T09:15:00+09:00",
          fileName: "bubli-local-20260704-091500.sqlite",
          sizeBytes: 19_922_944,
        },
        {
          backupId: "backup-story-2",
          createdAt: "2026-07-03T22:10:00+09:00",
          fileName: "bubli-local-20260703-221000.sqlite",
          sizeBytes: 18_769_920,
        },
        {
          backupId: "backup-story-3",
          createdAt: "2026-06-30T18:02:00+09:00",
          fileName: "bubli-local-20260630-180200.sqlite",
          sizeBytes: 16_891_904,
        },
      ],
      latestBackupId: "backup-story-1",
      readAt: "2026-07-04T09:20:00+09:00",
    },
  },
  component: LocalBackupRecoveryPanel,
  parameters: {
    layout: "padded",
  },
  title: "Features/Settings/LocalBackupRecoveryPanel",
} satisfies Meta<typeof LocalBackupRecoveryPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
