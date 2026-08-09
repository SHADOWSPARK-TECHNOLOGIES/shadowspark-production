import { NextResponse } from "next/server";

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
  };
}

export function successResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

export function errorResponse(status: number, code: string, message: string): NextResponse<ApiErrorPayload> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status }
  );
}

export interface ApiSuccessEnvelope<TData, TMeta = Record<string, never>> {
  success: true;
  data: TData;
  meta: TMeta;
}

export interface ApiErrorEnvelope {
  success: false;
  data: null;
  meta: Record<string, never>;
  error: {
    code: string;
    message: string;
  };
}

export function envelopeSuccessResponse<TData, TMeta>(
  data: TData,
  meta: TMeta,
  status = 200
): NextResponse<ApiSuccessEnvelope<TData, TMeta>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta,
    },
    { status }
  );
}

export function envelopeErrorResponse(status: number, code: string, message: string): NextResponse<ApiErrorEnvelope> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      meta: {},
      error: {
        code,
        message,
      },
    },
    { status }
  );
}
