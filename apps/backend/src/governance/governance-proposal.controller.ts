import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GovernanceProposalService } from './governance-proposal.service';
import {
  CreateProposalDto,
  UpdateProposalDto,
  ProposalQueryDto,
  VoteDto,
} from './dto/governance-proposal.dto';

@ApiTags('governance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('governance/proposals')
export class GovernanceProposalController {
  constructor(private readonly service: GovernanceProposalService) {}

  @Get()
  @ApiOperation({ summary: 'List governance proposals with optional filtering and pagination' })
  findAll(@Query() query: ProposalQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single proposal by ID' })
  @ApiParam({ name: 'id', description: 'Proposal UUID' })
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get voting statistics for a proposal' })
  getStats(@Param('id') id: string) {
    return this.service.getStats(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new governance proposal (draft)' })
  create(@Body() dto: CreateProposalDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft governance proposal' })
  update(@Param('id') id: string, @Body() dto: UpdateProposalDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a draft proposal for voting' })
  @UseGuards(RolesGuard)
  @Roles('admin', 'instructor')
  @HttpCode(HttpStatus.OK)
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Cast a vote on an active proposal' })
  @HttpCode(HttpStatus.OK)
  vote(@Param('id') id: string, @Body() dto: VoteDto) {
    return this.service.recordVote(id, dto);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute / finalise a proposal after voting ends' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  execute(@Param('id') id: string) {
    return this.service.execute(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a draft or active proposal' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a proposal (admin only)' })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
