import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserInteractionsService } from './user-interactions.service';

// Endpoint để Python ML Server lấy dữ liệu training
// Bảo vệ bằng API key đơn giản trong production
@Controller('api/v1/interactions')
export class UserInteractionsController {
    constructor(private readonly service: UserInteractionsService) {}

    // GET /api/v1/interactions/all – Python dùng khi train lại từ đầu
    @Get('all')
    getAll() {
        return this.service.getAllInteractions();
    }

    // GET /api/v1/interactions/since?date=2026-01-01 – Python dùng khi update incremental
    @Get('since')
    getSince(@Query('date') date: string) {
        const since = date ? new Date(date) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        return this.service.getInteractionsSince(since);
    }
}
