import { IsBoolean, IsOptional } from 'class-validator';

/**
 * UC5.8: Cài đặt nhóm – bật/tắt duyệt bài & duyệt thành viên (admin only)
 */
export class UpdateGroupSettingsDto {
  /** Bật/tắt duyệt bài trước khi đăng trong nhóm */
  @IsOptional()
  @IsBoolean()
  require_post_approval?: boolean;

  /** Bật/tắt duyệt thành viên khi xin vào nhóm */
  @IsOptional()
  @IsBoolean()
  require_member_approval?: boolean;
}
