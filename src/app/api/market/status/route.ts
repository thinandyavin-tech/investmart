import { NextResponse } from "next/server";
import { getMarketInfo } from "@/lib/marketHours";

export const revalidate = 30;

export function GET(): NextResponse {
  return NextResponse.json(getMarketInfo(), {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
