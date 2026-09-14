import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { ApiErrorBody } from "./types";

/** Throw this from a handler to send a specific status code + message. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function jsonError(message: string, status = 500, details?: unknown) {
  const body: ApiErrorBody = { error: message };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

type RouteContext = { params: Record<string, string> };
type Handler = (req: NextRequest, ctx: RouteContext) => Promise<Response>;

/**
 * Wraps a route handler so that *every* failure becomes a JSON error with a
 * sensible status code instead of a crashed function / HTML 500 page.
 */
export function withApiHandler(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return jsonError(err.message, err.status, err.details);
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2025") return jsonError("Record not found", 404);
        if (err.code === "P2002") return jsonError("Duplicate record", 409);
        if (err.code === "P2003") return jsonError("Related record not found", 400);
      }
      if (err instanceof Prisma.PrismaClientInitializationError) {
        console.error("[api] database unavailable:", err.message);
        return jsonError("Database unavailable. Check DATABASE_URL.", 503);
      }
      if (err instanceof SyntaxError) {
        return jsonError("Malformed JSON body", 400);
      }
      console.error(`[api] ${req.method} ${req.nextUrl.pathname} failed:`, err);
      return jsonError("Internal server error", 500);
    }
  };
}

/** Parse a JSON body, turning parse failures into a 400 instead of a 500. */
export async function readJsonBody<T = unknown>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Malformed JSON body");
  }
}
