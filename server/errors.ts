export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'That appointment time is no longer available.') {
    super(409, 'BOOKING_CONFLICT', message);
  }
}
