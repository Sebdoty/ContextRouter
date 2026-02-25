import { ZodError } from "zod";

export function toErrorResponse(error: unknown, fallbackStatus = 500) {
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: "Validation failed",
        details: error.flatten()
      }
    };
  }

  if (error instanceof Error) {
    return {
      status: fallbackStatus,
      body: {
        error: error.message
      }
    };
  }

  return {
    status: fallbackStatus,
    body: {
      error: "Unexpected error"
    }
  };
}
