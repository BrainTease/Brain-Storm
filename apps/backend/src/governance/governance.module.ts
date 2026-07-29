import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GovernanceProposal } from './governance-proposal.entity';
import { GovernanceProposalService } from './governance-proposal.service';
import { GovernanceProposalController } from './governance-proposal.controller';
import { TypeOrmGovernanceProposalRepository } from './typeorm-governance-proposal.repository';
import { GOVERNANCE_PROPOSAL_REPOSITORY } from './governance-proposal.repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([GovernanceProposal])],
  controllers: [GovernanceProposalController],
  providers: [
    GovernanceProposalService,
    {
      /**
       * Bind the repository interface token to the concrete TypeORM
       * implementation.  To swap to a different persistence layer,
       * change only this binding — the service stays untouched.
       */
      provide: GOVERNANCE_PROPOSAL_REPOSITORY,
      useClass: TypeOrmGovernanceProposalRepository,
    },
  ],
  exports: [GovernanceProposalService],
})
export class GovernanceModule {}
