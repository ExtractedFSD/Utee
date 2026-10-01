import { describe, expect, it } from "vitest";
import { trackingEventFromWebhook } from "./trackship";

describe("TrackShip webhook mapping", () => {
  it("maps a delivered update with its last event", () => {
    const { event, status } = trackingEventFromWebhook({
      tracking_number: "RM123",
      tracking_provider: "royal-mail",
      tracking_event_status: "delivered",
      tracking_events: [
        { message: "Accepted at Post Office", date: "2026-10-01T09:00:00+01:00", location: "Reading" },
        { message: "Delivered", date: "2026-10-02T10:30:00+01:00", location: "Oxford" },
      ],
    });
    expect(status).toBe("delivered");
    expect(event).toEqual({
      trackingNumber: "RM123",
      status: "delivered",
      description: "Delivered",
      occurredAt: "2026-10-02T09:30:00.000Z",
      location: "Oxford",
    });
  });

  it("treats label-created and pending as nothing to record", () => {
    expect(trackingEventFromWebhook({ tracking_number: "RM1", shipment_status: "pre_transit" }).event).toBeNull();
    expect(trackingEventFromWebhook({ tracking_number: "RM1", status: "pending_trackship" }).event).toBeNull();
    expect(trackingEventFromWebhook({ nothing: true }).trackingNumber).toBeNull();
  });

  it("maps failures to exceptions and unknown wording to in transit", () => {
    expect(trackingEventFromWebhook({ tracking_number: "RM1", tracking_event_status: "Return_To_Sender" }).event?.status).toBe("exception");
    expect(trackingEventFromWebhook({ tracking_number: "RM1", tracking_event_status: "arrived_at_depot" }).event?.status).toBe("in_transit");
  });
});
