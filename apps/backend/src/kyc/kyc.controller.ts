import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { KycService } from './kyc.service';

@ApiTags('kyc')
@Controller('kyc')
export class KycController {
  constructor(private kycService: KycService) {}

  @Get('status/:stellarPublicKey')
  @ApiOperation({ summary: 'SEP-0012: get KYC status for a Stellar account' })
  @ApiResponse({ status: 200, description: 'Returns KYC status record' })
  getStatus(@Param('stellarPublicKey') stellarPublicKey: string) {
    return this.kycService.getStatus(stellarPublicKey);
  }

  @Put('customer')
  @ApiOperation({ summary: 'SEP-0012: submit or update KYC fields' })
  @ApiResponse({ status: 200, description: 'KYC submission accepted' })
  upsertCustomer(@Body() body: { stellarPublicKey: string; [key: string]: string }) {
    const { stellarPublicKey, ...fields } = body;
    return this.kycService.upsertCustomer(stellarPublicKey, fields);
  }

  /** Webhook called by the KYC provider when verification status changes */
  @Post('webhook')
  @ApiOperation({ summary: 'KYC provider webhook — status update callback' })
  async webhook(@Body() payload: any) {
    await this.kycService.handleWebhook(payload);
    return { received: true };
  }
}
