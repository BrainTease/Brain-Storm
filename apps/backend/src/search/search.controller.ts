import { Body, Controller, Get, Optional, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SearchService, IndexName } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Full-text fuzzy search across courses, lessons, and posts' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'indices', required: false, description: 'Comma-separated: courses,lessons,posts' })
  search(
    @Query('q') q: string,
    @Query('indices') indices?: string,
    @Request() req?: { user?: { id: string } }
  ) {
    const idx = indices
      ? (indices.split(',').filter(Boolean) as IndexName[])
      : undefined;
    return this.searchService.search(q, idx, req?.user?.id);
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Autocomplete / search suggestions' })
  @ApiQuery({ name: 'q', description: 'Prefix to complete' })
  @ApiQuery({ name: 'indices', required: false })
  autocomplete(
    @Query('q') q: string,
    @Query('indices') indices?: string
  ) {
    const idx = indices
      ? (indices.split(',').filter(Boolean) as IndexName[])
      : undefined;
    return this.searchService.autocomplete(q, idx);
  }

  @Post('click')
  @ApiOperation({ summary: 'Track a search result click for analytics' })
  trackClick(
    @Body() body: { query: string; resultId: string; resultType: string },
    @Request() req?: { user?: { id: string } }
  ) {
    return this.searchService.trackClick(body.query, body.resultId, body.resultType, req?.user?.id);
  }

  @Get('analytics/top-queries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get top search queries (admin)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopQueries(@Query('limit') limit?: string) {
    return this.searchService.getTopQueries(limit ? parseInt(limit, 10) : 10);
  }
}
