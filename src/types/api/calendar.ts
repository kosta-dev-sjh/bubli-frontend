export type CalendarEventResponse = {
  allDay: boolean;
  endsAt?: string | null;
  id: string;
  provider: "GOOGLE";
  providerEventId?: string | null;
  roomId?: string | null;
  startsAt: string;
  taskId?: string | null;
  title: string;
  wbsItemId?: string | null;
};

export type CalendarEventRequest = {
  allDay?: boolean;
  endsAt?: string | null;
  roomId?: string | null;
  startsAt: string;
  taskId?: string | null;
  title: string;
  wbsItemId?: string | null;
};

export type CalendarEventListParams = {
  end?: string;
  roomId?: string;
  start?: string;
};
