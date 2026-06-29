import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SearchService, IndexName } from './search.service';

class LabeledQueryEntry {
  @IsString() query: string;
  @IsArray() @IsString({ each: true }) relevantIds: string[];
}

class EvaluateRelevanceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabeledQueryEntry)
  labeledSet: LabeledQueryEntry[];

  @IsOptional() k?: number;
}

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Hybrid lexical + popularity-boosted search with synonym expansion' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'indices', required: false, description: 'Comma-separated: courses,lessons,posts' })
  @ApiQuery({ name: 'enrolled', required: false, description: 'Comma-separated enrolled course IDs for personalised ranking' })
  @ApiQuery({ name: 'explain', required: false, description: 'Return ES score explanation (debug)' })
  search(
    @Query('q') q: string,
    @Query('indices') indices?: string,
    @Query('enrolled') enrolled?: string,
    @Query('explain') explain?: string,
    @Request() req?: { user?: { id: string } },
  ) {
    const idx = indices
      ? (indices.split(',').filter(Boolean) as IndexName[])
      : undefined;
    const enrolledCourseIds = enrolled ? enrolled.split(',').filter(Boolean) : [];
    return this.searchService.search(q, idx, req?.user?.id, {
      enrolledCourseIds,
      explain: explain === 'true',
    });
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Autocomplete / search suggestions with edge-ngram + completion suggester' })
  @ApiQuery({ name: 'q', description: 'Prefix to complete' })
  @ApiQuery({ name: 'indices', required: false })
  autocomplete(
    @Query('q') q: string,
    @Query('indices') indices?: string,
  ) {
    const idx = indices
      ? (indices.split(',').filter(Boolean) as IndexName[])
      : undefined;
    return this.searchService.autocomplete(q, idx);
  }

  @Post('click')
  @ApiOperation({ summary: 'Track a search result click for analytics and future personalisation' })
  trackClick(
    @Body() body: { query: string; resultId: string; resultType: string },
    @Request() req?: { user?: { id: string } },
  ) {
    return this.searchService.trackClick(
      body.query,
      body.resultId,
      body.resultType,
      req?.user?.id,
    );
  }

  @Get('analytics/top-queries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get top search queries (admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopQueries(@Query('limit') limit?: string) {
    return this.searchService.getTopQueries(limit ? parseInt(limit, 10) : 10);
  }

  @Post('evaluate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Evaluate search relevance with a labeled query set (returns Precision@K, NDCG@K)' })
  evaluateRelevance(@Body() dto: EvaluateRelevanceDto) {
    return this.searchService.evaluateRelevance(dto.labeledSet, dto.k ?? 5);
  }
}
