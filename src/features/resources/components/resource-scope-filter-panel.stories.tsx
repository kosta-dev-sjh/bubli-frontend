import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  defaultResourceScopes,
  defaultScopedResources,
  ResourceScopeFilterPanel,
} from "./resource-scope-filter-panel";

const meta = {
  component: ResourceScopeFilterPanel,
  parameters: {
    docs: {
      description: {
        component:
          "v15 자료 구분/권한 정책과 디자인보드 v20의 자료보드 범위 필터를 바탕으로, 개인 자료와 프로젝트룸 자료를 같은 자료보드 안에서 전환하는 패널입니다.",
      },
    },
  },
  title: "Features/Resources/ResourceScopeFilterPanel",
} satisfies Meta<typeof ResourceScopeFilterPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RoomResources: Story = {
  args: {
    activeScope: "room",
    resources: defaultScopedResources,
    scopes: defaultResourceScopes,
  },
};

export const PersonalResources: Story = {
  args: {
    activeScope: "personal",
    resources: defaultScopedResources,
    scopes: defaultResourceScopes,
    title: "개인 자료 범위",
  },
};

export const ReviewItems: Story = {
  args: {
    activeScope: "review",
    resources: defaultScopedResources,
    scopes: defaultResourceScopes,
    title: "확인할 항목 범위",
  },
};

export const RelatedResources: Story = {
  args: {
    activeScope: "related",
    resources: defaultScopedResources,
    scopes: defaultResourceScopes,
    title: "관련 자료 범위",
  },
};
