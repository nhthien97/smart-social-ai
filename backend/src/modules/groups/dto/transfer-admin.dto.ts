import { IsString, IsMongoId } from 'class-validator';

export class TransferAdminDto {
  @IsString()
  @IsMongoId()
  new_admin_id: string;
}
