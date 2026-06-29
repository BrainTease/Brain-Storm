import { Controller, Post, Get, Delete, Param, Query, UseGuards, Request, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StorageService } from './storage.service';
import * as multer from 'multer';

@ApiTags('media')
@Controller('media')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file to object storage' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }))
  upload(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.storage.upload(file, req.user.id);
  }

  @Get('mine') @ApiOperation({ summary: 'List my uploaded media' })
  mine(@Request() req: any) { return this.storage.findByOwner(req.user.id); }

  @Get(':id/url') @ApiOperation({ summary: 'Get a signed download URL' })
  getUrl(@Param('id') id: string, @Query('ttl') ttl?: string) {
    return this.storage.getSignedUrl(id, ttl ? parseInt(ttl) : undefined).then(url => ({ url }));
  }

  @Get(':id/url/:suffix') @ApiOperation({ summary: 'Get signed URL for an image derivative' })
  getDerivativeUrl(@Param('id') id: string, @Param('suffix') suffix: string) {
    return this.storage.getDerivativeSignedUrl(id, suffix).then(url => ({ url }));
  }

  @Delete(':id') @ApiOperation({ summary: 'Soft-delete a media file' })
  delete(@Param('id') id: string, @Request() req: any) { return this.storage.softDelete(id, req.user.id); }

  @Delete(':id/purge') @ApiOperation({ summary: 'Hard-delete a media file from storage and DB' })
  purge(@Param('id') id: string, @Request() req: any) { return this.storage.hardDelete(id, req.user.id); }
}
