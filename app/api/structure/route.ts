import { getDirectoryStructure } from "@/lib/markdown";
import { NextResponse } from "next/server";

export async function GET() {
  const structure = await getDirectoryStructure();
  return NextResponse.json(structure);
}
