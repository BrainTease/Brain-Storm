import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GrantsService } from './grants.service';
import { CreateGrantDto, UpdateGrantDto, PaginateGrantsDto } from './dto/grant.dto';

@ApiTags('grants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/grants')
export class GrantsController {
  constructor(private readonly grantsService: GrantsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new grant application' })
  @ApiResponse({ status: 201, description: 'Grant created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateGrantDto) {
    return this.grantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all grants (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of grants' })
  findAll(@Query() query: PaginateGrantsDto) {
    return this.grantsService.findAll(query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOperation({ summary: 'Get a grant by ID' })
  @ApiResponse({ status: 200, description: 'Grant details' })
  @ApiResponse({ status: 404, description: 'Grant not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.grantsService.findOne(id);
  }

  @Put(':id')
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOperation({ summary: 'Update a grant (status, metadata, review notes)' })
  @ApiResponse({ status: 200, description: 'Grant updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Grant not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGrantDto,
    @Request() req: { user?: { id?: string; sub?: string } }
  ) {
    const requesterId = req.user?.id ?? req.user?.sub ?? '';
    return this.grantsService.update(id, dto, requesterId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOperation({ summary: 'Delete a grant' })
  @ApiResponse({ status: 204, description: 'Grant deleted' })
  @ApiResponse({ status: 404, description: 'Grant not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.grantsService.remove(id);
  }
}
