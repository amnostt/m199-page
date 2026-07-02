/**
 * Global exception filter registered via APP_FILTER provider.
 *
 * Normalizes all errors to a consistent { statusCode, message, timestamp, path }
 * envelope. Stack traces are never exposed, satisfying BF-03.
 */
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";

// ---------------------------------------------------------------------------
// MulterError detection (zero-cost import — only used when an error is caught)
// ---------------------------------------------------------------------------

interface MulterErrorLike {
  code: string;
  message: string;
  field?: string;
}

const MULTER_LIMIT_CODES = new Set([
  "LIMIT_FILE_SIZE",
  "LIMIT_FILE_COUNT",
  "LIMIT_FIELD_KEY",
  "LIMIT_FIELD_VALUE",
  "LIMIT_FIELD_COUNT",
  "LIMIT_UNEXPECTED_FILE",
  "LIMIT_PART_COUNT",
]);

function isMulterError(err: unknown): err is MulterErrorLike {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as Record<string, unknown>).code === "string" &&
    MULTER_LIMIT_CODES.has((err as MulterErrorLike).code)
  );
}

function multerErrorToHttpStatus(code: string): HttpStatus {
  switch (code) {
    case "LIMIT_FILE_SIZE":
      return HttpStatus.PAYLOAD_TOO_LARGE; // 413
    case "LIMIT_FILE_COUNT":
    case "LIMIT_UNEXPECTED_FILE":
      return HttpStatus.BAD_REQUEST; // 400
    default:
      return HttpStatus.INTERNAL_SERVER_ERROR; // 500 — unexpected limit
  }
}

// ---------------------------------------------------------------------------

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    let httpStatus: HttpStatus;
    let message: string;

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      message = exception.message;
    } else if (isMulterError(exception)) {
      httpStatus = multerErrorToHttpStatus(exception.code);
      message = exception.code === "LIMIT_FILE_SIZE"
        ? "File too large"
        : exception.message;
    } else {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Internal server error";
    }

    const responseBody = {
      statusCode: httpStatus,
      message,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
