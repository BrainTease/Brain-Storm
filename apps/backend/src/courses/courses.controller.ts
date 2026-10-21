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
  Request,
} from '@nestjs/common';
import { CoursesBusinessService } from './courses-business.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CourseQueryDto } from './dto/course-query.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ScheduleCourseDto } from './dto/schedule-course.dto';
import { CourseResponseDto, toCourseResponseDto, toCourseResponseDtos } from './dto/course-response.dto';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private coursesBusinessService: CoursesBusinessService) {}

  @Get()
  @ApiOperation({ summary: 'Get all published courses' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by title or description' })
  @ApiQuery({ name: 'level', required: false, enum: ['beginner', 'intermediate', 'advanced'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns paginated published courses', type: [CourseResponseDto] })
  async findAll(@Query() query: CourseQueryDto) {
    const result = await this.coursesBusinessService.getAllCourses(
      query.search,
      query.level,
      query.page,
      query.limit
    );
    // Wrap every Course through DTO so internal fields are stripped
    const data = toCourseResponseDtos(result.data ?? result);
    return Array.isArray(result) ? data : { ...result, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiResponse({ status: 200, description: 'Returns a single course', type: CourseResponseDto })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findOne(@Param('id') id: string): Promise<CourseResponseDto> {
    const course = await this.coursesBusinessService.getCourse(id);
    return toCourseResponseDto(course);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'instructor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiBody({ type: CreateCourseDto })
  @ApiResponse({ status: 201, description: 'Course created successfully', type: CourseResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async create(@Body() data: CreateCourseDto, @Request() req: any): Promise<CourseResponseDto> {
    const course = await this.coursesBusinessService.createCourse(req.user.id, req.user.role, data);
    return toCourseResponseDto(course);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'instructor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a course' })
  @ApiBody({ type: UpdateCourseDto })
  @ApiResponse({ status: 200, description: 'Course updated successfully', type: CourseResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async update(
    @Param('id') id: string,
    @Body() data: UpdateCourseDto,
    @Request() req: any
  ): Promise<CourseResponseDto> {
    const course = await this.coursesBusinessService.updateCourse(id, req.user.id, req.user.role, data);
    return toCourseResponseDto(course);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'instructor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a course' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully', type: CourseResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async delete(@Param('id') id: string, @Request() req: any): Promise<CourseResponseDto> {
    const course = await this.coursesBusinessService.deleteCourse(id, req.user.id, req.user.role);
    return toCourseResponseDto(course);
  }

  @Post(':id/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'instructor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Schedule a course for future publication' })
  @ApiBody({ type: ScheduleCourseDto })
  @ApiResponse({ status: 200, description: 'Course scheduled', type: CourseResponseDto })
  @ApiResponse({ status: 400, description: 'scheduledAt must be in the future' })
  async schedule(
    @Param('id') id: string,
    @Body() dto: ScheduleCourseDto,
    @Request() req: any
  ): Promise<CourseResponseDto> {
    const scheduledAt = resolveScheduledAt(dto.scheduledAt, dto.timezone);
    const course = await this.coursesBusinessService.scheduleCourseForPublication(
      id,
      req.user.id,
      req.user.role,
      scheduledAt
    );
    return toCourseResponseDto(course);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'instructor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Immediately publish a course' })
  @ApiResponse({ status: 200, description: 'Course published', type: CourseResponseDto })
  async publishNow(@Param('id') id: string, @Request() req: any): Promise<CourseResponseDto> {
    const course = await this.coursesBusinessService.publishCourseNow(id, req.user.id, req.user.role);
    return toCourseResponseDto(course);
  }
}


