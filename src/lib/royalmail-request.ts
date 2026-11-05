/*
 * The Royal Mail return request, kept free of server-only imports so it can
 * be unit tested. The client in royalmail.ts sends it.
 */
export type PostalAddress = {
  firstName: string;
  lastName: string;
  companyName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
};

/** The body Royal Mail expects. Exported so a test can check it without a network. */
export function buildReturnRequest(input: { serviceCode: string; reference: string; sender: PostalAddress; lab: PostalAddress }) {
  const address = (a: PostalAddress) => ({
    firstName: a.firstName,
    lastName: a.lastName,
    ...(a.companyName ? { companyName: a.companyName } : {}),
    addressLine1: a.addressLine1,
    ...(a.addressLine2 ? { addressLine2: a.addressLine2 } : {}),
    city: a.city,
    postcode: a.postcode,
    country: "United Kingdom",
    countryIsoCode: "GBR",
  });
  return {
    service: { serviceCode: input.serviceCode },
    shipment: {
      // The parcel travels from the patient (returnAddress) to the lab (shippingAddress).
      shippingAddress: address(input.lab),
      returnAddress: address(input.sender),
      customerReference: { reference: input.reference.slice(0, 50) },
    },
  };
}

