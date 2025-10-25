import { NextRequest, NextResponse } from "next/server";
import { splitText, validateConfig } from "@/lib/splitters";
import type { SplitRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: SplitRequest = await request.json();

    // Validate request
    if (!body.text || typeof body.text !== "string") {
      return NextResponse.json(
        { error: "Text is required and must be a string" },
        { status: 400 }
      );
    }

    if (!body.config) {
      return NextResponse.json(
        { error: "Configuration is required" },
        { status: 400 }
      );
    }

    // Validate text length
    if (body.text.length > 100000) {
      return NextResponse.json(
        { error: "Text is too long. Maximum length is 100,000 characters" },
        { status: 400 }
      );
    }

    // Validate configuration
    const validation = validateConfig(body.config);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid configuration", details: validation.errors },
        { status: 400 }
      );
    }

    // Split text
    const result = await splitText(body.text, body.config);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in split API:", error);
    return NextResponse.json(
      {
        error: "Failed to split text",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
