/**
 * EchoController + ValidationPipe integration test (BF-03).
 *
 * Proves that the global ValidationPipe rejects invalid body shapes
 * with a 400 status and an array of validation messages.
 */
import { describe, it, expect } from "vitest";
import {
  BadRequestException,
  ValidationPipe,
  type ArgumentMetadata,
} from "@nestjs/common";
import { EchoDto } from "./echo.dto.js";

describe("ValidationPipe + EchoDto integration", () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });

  it("rejects non-string message with 400 and message array", async () => {
    const metadata: ArgumentMetadata = {
      type: "body",
      metatype: EchoDto,
    };

    try {
      await pipe.transform({ message: 123 }, metadata);
      expect.unreachable("Expected BadRequestException");
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);

      const response = (error as BadRequestException).getResponse();
      expect(response).toHaveProperty("message");
      expect(Array.isArray((response as Record<string, unknown>).message)).toBe(
        true,
      );
      expect((response as Record<string, unknown>).statusCode).toBe(400);
    }
  });
});
