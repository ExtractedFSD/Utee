import { describe, expect, it } from "vitest";
import { buildReturnRequest } from "./royalmail-request";

const sender = { firstName: "Demo", lastName: "Patient", addressLine1: "12 High Street", city: "Reading", postcode: "RG1 2AB" };
const lab = { firstName: "Utee", lastName: "Laboratory", companyName: "Utee Laboratory", addressLine1: "Unit 4", addressLine2: "Science Park", city: "Oxford", postcode: "OX4 4GA" };

describe("Royal Mail return request", () => {
  it("sends the parcel from the patient to the lab with the kit code as the reference", () => {
    const body = buildReturnRequest({ serviceCode: "TSN", reference: "UTEE UT-7K4M-92QX", sender, lab });
    expect(body.service).toEqual({ serviceCode: "TSN" });
    expect(body.shipment.shippingAddress).toMatchObject({ companyName: "Utee Laboratory", addressLine1: "Unit 4", addressLine2: "Science Park", city: "Oxford", postcode: "OX4 4GA", country: "United Kingdom", countryIsoCode: "GBR" });
    expect(body.shipment.returnAddress).toMatchObject({ firstName: "Demo", lastName: "Patient", addressLine1: "12 High Street", postcode: "RG1 2AB", countryIsoCode: "GBR" });
    expect(body.shipment.returnAddress).not.toHaveProperty("addressLine2");
    expect(body.shipment.customerReference).toEqual({ reference: "UTEE UT-7K4M-92QX" });
  });

  it("keeps the reference within Royal Mail's 50 characters", () => {
    const body = buildReturnRequest({ serviceCode: "TSS", reference: "x".repeat(80), sender, lab });
    expect(body.shipment.customerReference.reference).toHaveLength(50);
  });
});
