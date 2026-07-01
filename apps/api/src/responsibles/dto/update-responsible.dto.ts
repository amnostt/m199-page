/**
 * UpdateResponsibleDto — partial update for displayName and/or status.
 *
 * AR-06: updates applied fields; AR-07: status=INACTIVE triggers
 * bulk session revocation in the service layer.
 */
import { IsIn, IsOptional, IsString } from "class-validator";

export class UpdateResponsibleDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  @IsIn(["ACTIVE", "INACTIVE"])
  status?: "ACTIVE" | "INACTIVE";
}
