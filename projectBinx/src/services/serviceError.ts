import axios from 'axios';

export const toServiceError = (
  error: unknown,
  fallbackMessage: string,
): Error => {
  if (axios.isAxiosError(error)) {
    const responseMessage = error.response?.data?.message;

    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return new Error(responseMessage);
    }

    if (error.message) {
      return new Error(error.message);
    }
  }

  if (error instanceof Error && error.message) {
    return new Error(error.message);
  }

  return new Error(fallbackMessage);
};
