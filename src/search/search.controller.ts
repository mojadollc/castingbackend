import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchCastingsDto, SearchTalentsDto } from './search.dto';
import { Public, Roles } from '../auth/auth.guards';
import { UserRole } from '@prisma/client';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Public()
  @Get('castings')
  @ApiOperation({ summary: 'Search casting calls with faceted filters' })
  searchCastings(@Query() dto: SearchCastingsDto) {
    return this.svc.searchCastings(dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.CASTING_PROFESSIONAL, UserRole.CASTING_DIRECTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('talents')
  @ApiOperation({ summary: 'Search talent profiles (professionals only)' })
  searchTalents(@Query() dto: SearchTalentsDto) {
    return this.svc.searchTalents(dto);
  }
}
