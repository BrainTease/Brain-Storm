import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service';
import { Organization } from './organization.entity';
import { OrganizationMember } from './organization-member.entity';
import { OrganizationBillingProfile } from './organization-billing-profile.entity';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  const mockOrgRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const mockMemberRepo = { findOne: jest.fn(), findAndCount: jest.fn() };
  const mockBillingRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: getRepositoryToken(Organization), useValue: mockOrgRepo },
        { provide: getRepositoryToken(OrganizationMember), useValue: mockMemberRepo },
        { provide: getRepositoryToken(OrganizationBillingProfile), useValue: mockBillingRepo },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getOrganizationMembers', () => {
    it('returns members using the shared paginated list shape', async () => {
      const members = [{ id: 'm1' }, { id: 'm2' }] as OrganizationMember[];
      mockMemberRepo.findAndCount.mockResolvedValue([members, 2]);

      const result = await service.getOrganizationMembers('org-1');

      expect(result).toEqual({
        data: members,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasMore: false,
      });
      expect(mockMemberRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' }, skip: 0, take: 20 })
      );
    });

    it('honors the requested page and limit', async () => {
      mockMemberRepo.findAndCount.mockResolvedValue([[], 33]);

      const result = await service.getOrganizationMembers('org-1', { page: 2, limit: 10 });

      expect(result).toEqual({ data: [], total: 33, page: 2, limit: 10, totalPages: 4, hasMore: true });
      expect(mockMemberRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });
  });
});
