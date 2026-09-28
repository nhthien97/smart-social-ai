
import { Controller, Get, Put, Post, Delete, Param, Body, Query, HttpCode, HttpStatus, UseGuards, Request, Res } from '@nestjs/common';
import { AdminService } from './admin.service';

// ── Public endpoint: không cần auth ─────────────────────────────────────────
@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly adminService: AdminService) {}

  /** GET /api/v1/settings/public — Flutter & Next.js đọc cấu hình công khai */
  @Get('public')
  getPublicSettings() {
    return this.adminService.getPublicSettings();
  }
}
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRoleAdmin } from '../users/schemas/user.scheme';
import { QuerySystemLogsDto } from './dto/system-logs.dto';
import { QueryUserActivityLogsDto } from './dto/user-activity-logs.dto';
import { CreateSystemSettingDto, UpdateSystemSettingDto } from './dto/system-settings.dto';
import { QueryAnalyticsDto, QueryDailyStatsDto, QueryMonthlyStatsDto } from './dto/analytics.dto';
import { AnalyticsService } from '../analytics/analytics.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRoleAdmin.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // User management endpoints
  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Roles(UserRoleAdmin.ADMIN)
  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') id: string, @Request() req) {
    return this.adminService.deleteUser(id, req.user.userId);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR)
  @Put('users/:id/block')
  @HttpCode(HttpStatus.OK)
  async blockUser(@Param('id') id: string, @Request() req) {
    return this.adminService.blockUser(id, req.user.userId);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR)
  @Put('users/:id/unblock')
  @HttpCode(HttpStatus.OK)
  async unblockUser(@Param('id') id: string, @Request() req) {
    return this.adminService.unblockUser(id, req.user.userId);
  }

  // ============ Post Management ============

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('posts')
  async getAllPosts(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllPosts(parseInt(page), parseInt(limit), status, search);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('posts/:id')
  async getPostById(@Param('id') id: string) {
    return this.adminService.getPostById(id);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR)
  @Put('posts/:id/hide')
  async hidePost(@Param('id') id: string, @Request() req) {
    return this.adminService.hidePost(id, req.user.userId);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR)
  @Put('posts/:id/show')
  async showPost(@Param('id') id: string, @Request() req) {
    return this.adminService.showPost(id, req.user.userId);
  }

  @Roles(UserRoleAdmin.ADMIN)
  @Delete('posts/:id')
  @HttpCode(HttpStatus.OK)
  async deletePost(@Param('id') id: string, @Request() req) {
    return this.adminService.deletePost(id, req.user.userId);
  }

  // ============ Report Management ============

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('reports')
  async getAllReports(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllReports(parseInt(page), parseInt(limit), status);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('reports/stats')
  async getReportStats() {
    return this.adminService.getReportStats();
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('reports/:id')
  async getReportById(@Param('id') id: string) {
    return this.adminService.getReportById(id);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR)
  @Put('reports/:id/resolve')
  async resolveReport(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { resolved_note: string; action_taken?: string },
  ) {
    return this.adminService.resolveReport(id, req.user.userId, body);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR)
  @Put('reports/:id/reject')
  async rejectReport(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { resolved_note: string },
  ) {
    return this.adminService.rejectReport(id, req.user.userId, body);
  }

  // Group management endpoints
  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('groups')
  async getAllGroups() {
    return this.adminService.getAllGroups();
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('groups/:id/details')
  async getGroupDetails(@Param('id') id: string) {
    return this.adminService.getGroupDetails(id);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR)
  @Put('groups/:id/status')
  async toggleGroupStatus(@Param('id') id: string, @Body() body: { status: 'active' | 'blocked' }, @Request() req) {
    return this.adminService.toggleGroupStatus(id, body.status, req.user.userId);
  }

  // ============ Admin Account Management ============

  // Get all admin accounts (admin, moderator, viewer)
  @Roles(UserRoleAdmin.ADMIN)
  @Get('accounts')
  async getAdminAccounts() {
    return this.adminService.getAdminAccounts();
  }

  // Search users to add as admin account
  @Roles(UserRoleAdmin.ADMIN)
  @Get('accounts/search')
  async searchUsersForAdmin(@Query('q') query: string) {
    return this.adminService.searchUsersForAdmin(query);
  }

  // Get single admin account by ID
  @Roles(UserRoleAdmin.ADMIN)
  @Get('accounts/:id')
  async getAdminAccountById(@Param('id') id: string) {
    return this.adminService.getAdminAccountById(id);
  }

  // Add a user as moderator/viewer
  @Roles(UserRoleAdmin.ADMIN)
  @Post('accounts/:id')
  async addAdminAccount(
    @Param('id') id: string,
    @Body() body: { role: UserRoleAdmin },
  ) {
    return this.adminService.addAdminAccount(id, body.role);
  }

  // Update admin account role
  @Roles(UserRoleAdmin.ADMIN)
  @Put('accounts/:id')
  async updateAdminAccount(
    @Param('id') id: string,
    @Body() body: { role: UserRoleAdmin },
  ) {
    return this.adminService.updateAdminAccount(id, body.role);
  }

  // Remove admin account (set role to NONE)
  @Roles(UserRoleAdmin.ADMIN)
  @Delete('accounts/:id')
  @HttpCode(HttpStatus.OK)
  async removeAdminAccount(@Param('id') id: string) {
    return this.adminService.removeAdminAccount(id);
  }

  // ============ System Logs (Admin Logs / Audit Trail) ============

  @Roles(UserRoleAdmin.ADMIN)
  @Get('logs')
  async getSystemLogs(@Query() dto: QuerySystemLogsDto) {
    return this.adminService.getSystemLogs(dto);
  }

  @Roles(UserRoleAdmin.ADMIN)
  @Get('logs/action-types')
  async getSystemLogActionTypes() {
    return this.adminService.getSystemLogActionTypes();
  }

  @Roles(UserRoleAdmin.ADMIN)
  @Get('logs/export')
  async exportSystemLogs(@Query() dto: QuerySystemLogsDto) {
    return this.adminService.exportSystemLogs(dto);
  }

  @Roles(UserRoleAdmin.ADMIN)
  @Get('logs/:id')
  async getSystemLogById(@Param('id') id: string) {
    return this.adminService.getSystemLogById(id);
  }

  // ============ User Activity Logs ============

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('user-activity')
  async getUserActivityLogs(@Query() dto: QueryUserActivityLogsDto) {
    return this.adminService.getUserActivityLogs(dto);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('user-activity/summary')
  async getUserActivitySummary(
    @Query('user_id') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.getUserActivitySummary(userId, from, to);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('user-activity/export')
  async exportUserActivityLogs(@Query() dto: QueryUserActivityLogsDto) {
    return this.adminService.exportUserActivityLogs(dto);
  }

  // ============ System Settings ============

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('settings')
  async getAllSettings() {
    return this.adminService.getAllSettings();
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('settings/:key')
  async getSettingByKey(@Param('key') key: string) {
    return this.adminService.getSettingByKey(key);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR)
  @Post('settings')
  async createSetting(@Body() dto: CreateSystemSettingDto, @Request() req) {
    return this.adminService.createSetting(dto, req.user.userId);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR)
  @Put('settings/:key')
  async updateSetting(@Param('key') key: string, @Body() dto: UpdateSystemSettingDto, @Request() req) {
    return this.adminService.updateSetting(key, dto, req.user.userId);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR)
  @Delete('settings/:key')
  @HttpCode(HttpStatus.OK)
  async deleteSetting(@Param('key') key: string, @Request() req) {
    return this.adminService.deleteSetting(key, req.user.userId);
  }

  @Roles(UserRoleAdmin.ADMIN)
  @Post('settings/seed')
  async seedDefaultSettings() {
    await this.adminService.seedDefaultSettings();
    return { message: 'Default settings seeded successfully' };
  }

  // ============ Analytics & Statistics ============

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('analytics/overview')
  async getAnalyticsOverview(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getOverview(from, to);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('analytics/growth')
  async getGrowthChart(@Query() dto: QueryAnalyticsDto) {
    return this.analyticsService.getGrowthChart(dto);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('analytics/engagement')
  async getEngagementStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getEngagementStats(from, to);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('analytics/daily')
  async getDailyStats(@Query() dto: QueryDailyStatsDto) {
    return this.analyticsService.getDailyStats(dto);
  }

  @Roles(UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER)
  @Get('analytics/monthly')
  async getMonthlyStats(@Query() dto: QueryMonthlyStatsDto) {
    return this.analyticsService.getMonthlyStats(dto);
  }

  @Roles(UserRoleAdmin.ADMIN)
  @Post('analytics/refresh')
  async refreshAnalytics() {
    await this.analyticsService.computeTodayStats();
    return { message: 'Analytics refreshed successfully' };
  }

  @Roles(UserRoleAdmin.ADMIN)
  @Get('analytics/export')
  async exportAnalytics(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.exportStats(from, to);
  }
}
