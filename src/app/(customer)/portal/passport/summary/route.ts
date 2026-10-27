import { NextRequest, NextResponse } from "next/server";

/** The one-page GP summary is retired; there is one passport PDF now. The old address keeps working. */
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/portal/passport/passport", req.nextUrl.origin), 307);
}
