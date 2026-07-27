import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JobsService } from './jobs.service';
import { CreateJobDto, UpdateJobDto, CreateApplicationDto, UpdateApplicationStatusDto, JobQueryDto } from './dto';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Get() @ApiOperation({ summary: 'List open jobs' })
  findAll(@Query() q: JobQueryDto) { return this.service.findAll(q); }

  @Get('recommendations') @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: 'Get skill-matched job recommendations' })
  getRecommendations(@Request() req: any) {
    const skills: string[] = req.user.skills ?? [];
    return this.service.getMatchingJobs(skills);
  }

  @Get(':id') @ApiOperation({ summary: 'Get a job by ID' })
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post() @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: 'Post a new job' })
  create(@Request() req: any, @Body() dto: CreateJobDto) { return this.service.createJob(req.user.id, dto); }

  @Patch(':id') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: 'Update a job' })
  update(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateJobDto) {
    return this.service.update(id, req.user.id, dto);
  }

  @Delete(':id') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: 'Delete a job' })
  remove(@Param('id') id: string, @Request() req: any) { return this.service.remove(id, req.user.id); }

  // ── Applications ──────────────────────────────────────────────────────────

  @Post(':id/apply') @UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiOperation({ summary: 'Apply to a job' })
  apply(@Param('id') id: string, @Request() req: any, @Body() dto: CreateApplicationDto) {
    return this.service.apply(id, req.user.id, dto);
  }

  @Get(':id/applications') @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: 'List applications for a job (poster only)' })
  getApplications(@Param('id') id: string, @Request() req: any) {
    return this.service.getApplicationsForJob(id, req.user.id);
  }

  @Get('applications/mine') @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my job applications' })
  myApplications(@Request() req: any) { return this.service.getMyApplications(req.user.id); }

  @Patch('applications/:appId/status') @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: 'Update application status (poster only)' })
  updateStatus(@Param('appId') appId: string, @Request() req: any, @Body() dto: UpdateApplicationStatusDto) {
    return this.service.updateApplicationStatus(appId, req.user.id, dto);
  }

  @Patch('applications/:appId/withdraw') @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: 'Withdraw an application' })
  withdraw(@Param('appId') appId: string, @Request() req: any) {
    return this.service.withdraw(appId, req.user.id);
  }
}
