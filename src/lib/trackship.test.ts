import { describe, expect, it } from "vitest";
import { locationText, londonToIso, trackingEventFromWebhook } from "./trackship";

/** The example payload from TrackShip's webhook documentation, verbatim. */
const EXAMPLE = {
  user_key: "84cac6f02e418c3c8a3dc142fa3d2ef5",
  order_id: "41086",
  tracking_number: "9405511206203420254870",
  tracking_provider: "usps",
  tracking_event_status: "in_transit",
  tracking_est_delivery_date: "2022-12-02 00:00:00",
  tracking_destination_events: null,
  origin_country: null,
  destination_country: "US",
  delivery_number: null,
  delivery_provider: null,
  shipping_service: "Priority Mail<SUP>&reg;</SUP>",
  last_event_time: "2022-11-29 21:40:00",
  events: [
    {
      object: "TrackingDetail",
      message: "Shipment Received, Package Acceptance Pending - MAGNA, UT",
      description: "",
      status: "pre_transit",
      status_detail: "pre_transit",
      datetime: "2022-11-29 16:52:00",
      source: "USPS",
      tracking_location: { object: "TrackingLocation", city: "MAGNA", state: "UT", country: "", zip: "84044" },
    },
    {
      object: "TrackingDetail",
      message: "Accepted at USPS Origin Facility - MAGNA, UT",
      description: "",
      status: "in_transit",
      status_detail: "in_transit",
      datetime: "2022-11-29 20:25:00",
      source: "USPS",
      tracking_location: { object: "TrackingLocation", city: "MAGNA", state: "UT", country: "", zip: "84044" },
    },
    {
      object: "TrackingDetail",
      message: "Arrived at USPS Regional Origin Facility - SALT LAKE CITY DISTRIBUTION CENTER, ",
      description: "",
      status: "in_transit",
      status_detail: "in_transit",
      datetime: "2022-11-29 21:40:00",
      source: "USPS",
      tracking_location: { object: "TrackingLocation", city: "SALT LAKE CITY DISTRIBUTION CENTER", state: "", country: "", zip: "" },
    },
  ],
  destination_events: null,
};

describe("TrackShip webhook mapping", () => {
  it("maps the documented example: latest event, London time read as UTC in winter, location without blanks", () => {
    const { event, status, trackingNumber } = trackingEventFromWebhook(EXAMPLE);
    expect(trackingNumber).toBe("9405511206203420254870");
    expect(status).toBe("in_transit");
    expect(event).toEqual({
      trackingNumber: "9405511206203420254870",
      status: "in_transit",
      description: "Arrived at USPS Regional Origin Facility - SALT LAKE CITY DISTRIBUTION CENTER,",
      occurredAt: "2022-11-29T21:40:00.000Z",
      location: "SALT LAKE CITY DISTRIBUTION CENTER",
    });
  });

  it("reads summer scans as British Summer Time", () => {
    expect(londonToIso("2026-07-01 10:00:00")).toBe("2026-07-01T09:00:00.000Z");
    expect(londonToIso("2026-01-15 10:00:00")).toBe("2026-01-15T10:00:00.000Z");
    expect(londonToIso("")).toBeNull();
  });

  it("joins the location parts that are present", () => {
    expect(locationText({ city: "MAGNA", state: "UT", country: "", zip: "84044" })).toBe("MAGNA, UT, 84044");
    expect(locationText({ city: "", state: "", country: "", zip: "" })).toBeUndefined();
    expect(locationText(null)).toBeUndefined();
  });

  it("records nothing for unknown and pre_transit, exceptions for failures, and maps every documented status", () => {
    for (const s of ["unknown", "pre_transit"]) {
      expect(trackingEventFromWebhook({ tracking_number: "RM1", tracking_event_status: s }).event).toBeNull();
    }
    for (const s of ["return_to_sender", "failure", "cancelled"]) {
      expect(trackingEventFromWebhook({ tracking_number: "RM1", tracking_event_status: s }).event?.status).toBe("exception");
    }
    expect(trackingEventFromWebhook({ tracking_number: "RM1", tracking_event_status: "delivered" }).event?.status).toBe("delivered");
    expect(trackingEventFromWebhook({ tracking_number: "RM1", tracking_event_status: "out_for_delivery" }).event?.status).toBe("out_for_delivery");
    expect(trackingEventFromWebhook({ tracking_number: "RM1", tracking_event_status: "available_for_pickup" }).event?.status).toBe("in_transit");
    expect(trackingEventFromWebhook({ nothing: true }).trackingNumber).toBeNull();
  });
});
