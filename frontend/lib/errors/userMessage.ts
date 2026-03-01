export function toUserSafeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const lowered = error.message.toLowerCase();
  if (lowered.includes("timeout")) {
    return "Request timed out. Please try again.";
  }
  if (lowered.includes("network") || lowered.includes("failed to fetch")) {
    return "Unable to reach the service right now. Please retry.";
  }
  if (lowered.includes("request failed: 5")) {
    return "Service is temporarily unavailable. Please retry in a moment.";
  }
  if (lowered.includes("request failed: 4")) {
    return "Request could not be completed with current inputs. Please review and retry.";
  }

  return fallback;
}

