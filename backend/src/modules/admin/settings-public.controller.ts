import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('settings')
export class SettingsPublicController {
  constructor(private readonly adminService: AdminService) {}

  // Public endpoint - no auth required
  // Flutter app fetches public settings from this endpoint
  @Get('public')
  async getPublicSettings() {
    return this.adminService.getPublicSettings();
  }
}
