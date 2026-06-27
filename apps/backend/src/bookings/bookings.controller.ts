import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingService } from './booking.service';

class AvailabilitySlotDto {
  @ApiProperty({ example: '2026-07-01T09:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-07-01T17:00:00Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ example: 'Europe/London', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;
}

class SetAvailabilityDto {
  @ApiProperty({ type: [AvailabilitySlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots: AvailabilitySlotDto[];
}

class CreateBookingDto {
  @ApiProperty()
  @IsString()
  workerId: string;

  @ApiProperty({ example: '2026-07-01T10:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-07-01T11:00:00Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ example: 'UTC', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  message?: string;
}

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/bookings')
export class BookingsController {
  constructor(private readonly bookingService: BookingService) {}

  // ── Availability ──────────────────────────────────────────────────────────

  @Post('availability')
  @ApiOperation({ summary: 'Set worker availability schedule (replaces existing slots)' })
  @ApiResponse({ status: 201, description: 'Availability slots saved' })
  setAvailability(
    @Req() req: { user: { id: string } },
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.bookingService.setAvailability(req.user.id, dto.slots);
  }

  @Get('availability/:workerId')
  @ApiOperation({ summary: 'Get a worker\'s available slots' })
  @ApiResponse({ status: 200, description: 'List of availability slots' })
  getAvailability(@Param('workerId') workerId: string) {
    return this.bookingService.getAvailability(workerId);
  }

  // ── Bookings ──────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Request a booking with a worker' })
  @ApiResponse({ status: 201, description: 'Booking request created' })
  @ApiResponse({ status: 409, description: 'Double-booking conflict' })
  createBooking(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingService.createBooking(
      req.user.id,
      dto.workerId,
      dto.startTime,
      dto.endTime,
      dto.timezone,
      dto.message,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all bookings for the current user (as requester or worker)' })
  @ApiResponse({ status: 200, description: 'List of booking requests' })
  getMyBookings(@Req() req: { user: { id: string } }) {
    return this.bookingService.getMyBookings(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific booking' })
  @ApiResponse({ status: 200, description: 'Booking request' })
  getBooking(@Param('id') id: string) {
    return this.bookingService.getBooking(id);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept a booking request (worker only)' })
  @ApiResponse({ status: 200, description: 'Booking confirmed' })
  acceptBooking(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.bookingService.respondToBooking(req.user.id, id, true);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a booking request (worker only)' })
  @ApiResponse({ status: 200, description: 'Booking rejected' })
  rejectBooking(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.bookingService.respondToBooking(req.user.id, id, false);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking (requester or worker)' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  cancelBooking(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.bookingService.cancelBooking(req.user.id, id);
  }
}
