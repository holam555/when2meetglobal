export type AvailabilityStatus = "free" | "maybe" | "busy";

export type AvailabilitySlot = {
  utcStart: string;
  status: AvailabilityStatus;
};

export type EventDoc = {
  slug: string;
  name: string;
  dates: string[];
  timeRange: { start: number; end: number };
  organizerTimezone: string;
  createdAt: string;
  confirmedSlot?: string;
};

export type ResponseDoc = {
  id: string;
  eventSlug: string;
  name: string;
  timezone: string;
  availability: AvailabilitySlot[];
  createdAt: string;
};

export type EventBundle = {
  event: EventDoc;
  responses: ResponseDoc[];
};
