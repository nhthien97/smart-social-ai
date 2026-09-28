import { IsString, IsMongoId } from 'class-validator';

export class InviteMemberDto {
  @IsString()
  @IsMongoId()
  user_id: string;
}
