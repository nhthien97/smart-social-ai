import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto, ResolveReportDto } from './dto/create-report.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  @Post()
  create(@Body() createReportDto: CreateReportDto) {
    return this.reportsService.create(createReportDto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
  ) {
    return this.reportsService.findAll(parseInt(page), parseInt(limit), status);
  }

  @Get('stats')
  getStats() {
    return this.reportsService.getStats();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.reportsService.findById(id);
  }

  @Get('reporter/:reporterId')
  findByReporter(@Param('reporterId') reporterId: string) {
    return this.reportsService.findByReporter(reporterId);
  }

  @Get('post/:postId')
  findByPostId(@Param('postId') postId: string) {
    return this.reportsService.findByPostId(postId);
  }

  @Put(':id/resolve')
  resolve(@Param('id') id: string, @Request() req, @Body() dto: ResolveReportDto) {
    return this.reportsService.resolve(id, req.user.userId, dto);
  }

  @Put(':id/reject')
  reject(@Param('id') id: string, @Request() req, @Body() dto: ResolveReportDto) {
    return this.reportsService.reject(id, req.user.userId, dto);
  }
}
