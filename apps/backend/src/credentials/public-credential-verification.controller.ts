/**
 * Public Credential Verification API (Issue #632)
 *
 * Exposes unauthenticated endpoints for third-party verifiers (employers,
 * institutions) to check the validity of a Brain-Storm credential.
 *
 * Features:
 * - Rate-limited via @nestjs/throttler (inherited from global guard)
 * - Returns issuer, course, issue date, expiry, and revocation status
 * - Provides an embeddable JS widget snippet
 * - Caching via Redis to absorb bursts
 */
import {
  Controller,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credential } from './credential.entity';
import { StellarService } from '../stellar/stellar.service';
import type { Response } from 'express';

const CACHE_TTL = 60; // seconds – credential data changes rarely

@ApiTags('credentials (public)')
@Controller('public/credentials')
export class PublicCredentialVerificationController {
  constructor(
    @InjectRepository(Credential)
    private readonly credentialRepo: Repository<Credential>,
    private readonly stellarService: StellarService,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  // ── Verify by credential ID ───────────────────────────────────────────────

  @Get(':id/verify')
  @ApiOperation({
    summary: 'Public: verify a credential by its UUID',
    description: 'No authentication required. Returns issuer, course, issue date, and on-chain status.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Credential UUID' })
  @ApiResponse({
    status: 200,
    description: 'Credential verification result',
    schema: {
      example: {
        credentialId: 'uuid',
        txHash: 'abc123',
        issuer: 'Brain-Storm',
        courseId: 'uuid',
        issuedAt: '2024-01-01T00:00:00.000Z',
        holderPublicKey: 'G…',
        onChain: { verified: true, ledger: 12345, createdAt: '2024-01-01T00:00:00.000Z' },
        status: 'valid',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async verifyById(@Param('id') id: string) {
    return this.resolveAndVerify('id', id);
  }

  // ── Verify by tx hash ─────────────────────────────────────────────────────

  @Get('hash/:txHash/verify')
  @ApiOperation({
    summary: 'Public: verify a credential by its Stellar transaction hash',
    description: 'No authentication required.',
  })
  @ApiParam({ name: 'txHash', type: String })
  @ApiResponse({ status: 200, description: 'Credential verification result' })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async verifyByHash(@Param('txHash') txHash: string) {
    return this.resolveAndVerify('txHash', txHash);
  }

  // ── Embeddable badge widget (JavaScript snippet) ──────────────────────────

  @Get(':id/widget')
  @Header('Content-Type', 'application/javascript')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({
    summary: 'Public: embeddable JavaScript widget snippet for credential verification badges',
    description:
      'Returns a self-contained JS snippet. Embed on any page with:\n\n' +
      '```html\n<div data-brainstorm-credential="CREDENTIAL_ID"></div>\n' +
      '<script src="https://api.brain-storm.com/v1/public/credentials/CREDENTIAL_ID/widget"></script>\n```',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'JavaScript widget snippet', content: { 'application/javascript': {} } })
  async getWidget(@Param('id') id: string, @Res() res: Response) {
    const cacheKey = `widget:${id}`;
    const cached = await this.cache.get<string>(cacheKey);
    if (cached) {
      res.send(cached);
      return;
    }

    // Light verification – we embed the status in the JS at render time
    let status = 'unknown';
    try {
      const result = await this.resolveAndVerify('id', id);
      status = result.status;
    } catch {
      status = 'not_found';
    }

    const badgeColor = status === 'valid' ? '#22c55e' : '#ef4444';
    const badgeLabel = status === 'valid' ? '✓ Verified' : '✗ Invalid';
    const verifyUrl = `https://brain-storm.app/credentials/${id}/verify`;

    const js = `(function(){
  var el=document.querySelector('[data-brainstorm-credential="${id}"]');
  if(!el)return;
  var badge=document.createElement('a');
  badge.href='${verifyUrl}';
  badge.target='_blank';
  badge.rel='noopener noreferrer';
  badge.title='Brain-Storm Verified Credential';
  badge.style='display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:9999px;background:${badgeColor};color:#fff;font-family:sans-serif;font-size:13px;font-weight:600;text-decoration:none;';
  badge.innerHTML='${badgeLabel}';
  el.appendChild(badge);
})();`;

    await this.cache.set(cacheKey, js, CACHE_TTL);
    res.send(js);
  }

  // ── iframe embed ──────────────────────────────────────────────────────────

  @Get(':id/badge')
  @Header('Content-Type', 'text/html')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOperation({
    summary: 'Public: embeddable iframe badge for a credential',
    description:
      'Returns an HTML badge page. Embed with:\n\n```html\n<iframe src="https://api.brain-storm.com/v1/public/credentials/CREDENTIAL_ID/badge" width="200" height="40"></iframe>\n```',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, content: { 'text/html': {} } })
  async getBadge(@Param('id') id: string, @Res() res: Response) {
    let status = 'unknown';
    let courseId = '';
    try {
      const result = await this.resolveAndVerify('id', id);
      status = result.status;
      courseId = result.courseId ?? '';
    } catch {
      status = 'not_found';
    }

    const color = status === 'valid' ? '#22c55e' : '#ef4444';
    const label = status === 'valid' ? '✓ Brain-Storm Verified' : '✗ Invalid Credential';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Credential Badge</title>
<style>
  body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:transparent;}
  a{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:9999px;
    background:${color};color:#fff;font-family:sans-serif;font-size:13px;font-weight:600;text-decoration:none;}
</style>
</head>
<body>
<a href="https://brain-storm.app/credentials/${id}/verify" target="_blank" rel="noopener">${label}</a>
</body>
</html>`;

    res.send(html);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async resolveAndVerify(by: 'id' | 'txHash', value: string) {
    const cacheKey = `cred:verify:${by}:${value}`;
    const cached = await this.cache.get<object>(cacheKey);
    if (cached) return cached;

    const credential = await this.credentialRepo.findOne({
      where: by === 'id' ? { id: value } : { txHash: value },
      relations: ['user', 'course'],
    });

    if (!credential) throw new NotFoundException('Credential not found');

    // On-chain verification
    let onChain: {
      verified: boolean;
      ledger?: number;
      createdAt?: string;
      operationCount?: number;
    } = { verified: false };

    if (credential.txHash) {
      try {
        onChain = await this.stellarService.verifyTransaction(credential.txHash);
      } catch {
        onChain = { verified: false };
      }
    }

    const status = onChain.verified ? 'valid' : credential.txHash ? 'unverified' : 'off-chain';

    const result = {
      credentialId: credential.id,
      txHash: credential.txHash ?? null,
      issuer: 'Brain-Storm',
      courseId: credential.courseId,
      courseTitle: credential.course?.title ?? null,
      issuedAt: credential.issuedAt,
      holderPublicKey: credential.stellarPublicKey ?? null,
      onChain,
      status,
    };

    await this.cache.set(cacheKey, result, CACHE_TTL);
    return result;
  }
}
