import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    // GET /api/v1/categories – grouped dropdown cho frontend
    @Get()
    findAll() {
        return this.categoriesService.findAll();
    }

    // GET /api/v1/categories/flat – flat list
    @Get('flat')
    findFlat() {
        return this.categoriesService.findAllFlat();
    }
}
