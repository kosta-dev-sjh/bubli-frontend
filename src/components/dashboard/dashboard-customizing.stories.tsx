import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { HTMLAttributes } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DashboardDropzone } from "@/components/dashboard/dashboard-dropzone";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { DashboardPalette, widgetIcon } from "@/components/dashboard/dashboard-palette";
import { DashboardWidgetTile } from "@/components/dashboard/dashboard-widget-tile";
import { WIDGET_CATALOG } from "@/components/dashboard/widget-catalog";
import type { DashboardWidgetDef } from "@/components/dashboard/widget-catalog";

const meta = {
  tags: ["uikit", "dashboard"],
  title: "Dashboard/CustomizingFlow",
  parameters: {
    docs: {
      description: {
        component:
          "Storybook 정적 상태와 dnd kit 기반 커스터마이징 UX. edit mode, widget selected, dragging visual, hidden widget, dropzone active를 한 화면에서 확인한다.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const byId = (id: string) => WIDGET_CATALOG.find((w) => w.widgetId === id) as DashboardWidgetDef;

function SortableTile({
  def,
  editMode,
  hidden,
  onRemove,
  onSelect,
  onToggleHide,
  selected,
}: {
  def: DashboardWidgetDef;
  editMode: boolean;
  hidden: boolean;
  onRemove: () => void;
  onSelect: () => void;
  onToggleHide: () => void;
  selected: boolean;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({ id: def.widgetId });
  const sizeClass = def.size === "S" ? "bubli-dash-tile--s" : def.size === "L" ? "bubli-dash-tile--l" : "bubli-dash-tile--m";
  const handleProps = { ...attributes, ...listeners } as unknown as HTMLAttributes<HTMLButtonElement>;

  return (
    <div ref={setNodeRef} className={sizeClass} style={{ transform: CSS.Transform.toString(transform), transition, minWidth: 0 }}>
      <DashboardWidgetTile
        dragHandleProps={handleProps}
        dragging={isDragging}
        editMode={editMode}
        hidden={hidden}
        icon={widgetIcon(def.widgetId)}
        interactive
        onClick={onSelect}
        onRemove={onRemove}
        onToggleHide={onToggleHide}
        selected={selected}
        size={def.size}
        title={def.title}
      >
        {def.description}
      </DashboardWidgetTile>
    </div>
  );
}

function Flow() {
  const [ids, setIds] = useState<string[]>([
    "today-todos",
    "project-time-ring",
    "agent-suggestions",
    "timer",
    "today-summary",
  ]);
  const [hidden, setHidden] = useState<Set<string>>(new Set(["today-summary"]));
  const [selected, setSelected] = useState<string | null>("agent-suggestions");
  const [query, setQuery] = useState("");
  const [editMode, setEditMode] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const available = WIDGET_CATALOG.filter((w) => !ids.includes(w.widgetId));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setIds((cur) => arrayMove(cur, cur.indexOf(String(active.id)), cur.indexOf(String(over.id))));
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 18, alignItems: "start" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <strong style={{ fontSize: 14 }}>내 워크스페이스</strong>
          <button
            className={editMode ? "bubli-button bubli-button--primary bubli-button--sm" : "bubli-button bubli-button--sm"}
            onClick={() => setEditMode((v) => !v)}
            type="button"
          >
            {editMode ? "편집 완료" : "편집"}
          </button>
        </div>
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd} sensors={sensors}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <DashboardGrid mode={editMode ? "edit" : "view"}>
              {ids.map((id) => (
                <SortableTile
                  def={byId(id)}
                  editMode={editMode}
                  hidden={hidden.has(id)}
                  key={id}
                  onRemove={() => setIds((cur) => cur.filter((x) => x !== id))}
                  onSelect={() => setSelected(id)}
                  onToggleHide={() =>
                    setHidden((cur) => {
                      const next = new Set(cur);
                      if (next.has(id)) {
                        next.delete(id);
                      } else {
                        next.add(id);
                      }
                      return next;
                    })
                  }
                  selected={selected === id}
                />
              ))}
              {editMode ? (
                <div style={{ gridColumn: "span 4" }}>
                  <DashboardDropzone state="active" />
                </div>
              ) : null}
            </DashboardGrid>
          </SortableContext>
        </DndContext>
      </div>
      <DashboardPalette
        items={available}
        onAdd={(id) => setIds((cur) => [...cur, id])}
        onSearch={setQuery}
        query={query}
      />
    </div>
  );
}

export const CustomizingFlow: Story = {
  render: () => <Flow />,
};
