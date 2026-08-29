export class ActionError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHORISED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION",
  ) {
    super(message);
    this.name = "ActionError";
  }
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: ActionError["code"] };

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function actionFailure(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): ActionResult<never> {
  if (error instanceof ActionError) {
    return { success: false, error: error.message, code: error.code };
  }
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: fallback };
}
