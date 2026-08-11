import { IsIn } from "class-validator";

export class UpdateMissionStatusDto {
  @IsIn(["ACTIVE", "ARCHIVED"])
  status!: "ACTIVE" | "ARCHIVED";
}
