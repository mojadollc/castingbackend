import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PublicSearchService } from './public-search.service';
import { PublicCastingSearchDto } from './public-search.dto';
import { Public } from '../auth/auth.guards';

@ApiTags('Public')
@Public()
@Controller('public')
export class PublicSearchController {
  constructor(private readonly publicSearchService: PublicSearchService) {}

  @Get('castings')
  @ApiOperation({ summary: 'Search published castings — no auth required' })
  searchCastings(@Query() query: PublicCastingSearchDto) {
    return this.publicSearchService.searchCastings(query);
  }

  @Get('castings/:slug')
  @ApiOperation({ summary: 'Get a casting by slug or ID — no auth required' })
  getCasting(@Param('slug') slug: string) {
    return this.publicSearchService.getCastingBySlug(slug);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all casting categories' })
  getCategories() {
    return this.publicSearchService.getCategories();
  }

  @Get('locations')
  @ApiOperation({ summary: 'List distinct locations from published castings' })
  @ApiQuery({ name: 'search', required: false })
  getLocations(@Query('search') search?: string) {
    return this.publicSearchService.getLocations(search);
  }
}
