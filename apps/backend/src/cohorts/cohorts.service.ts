import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cohort } from './cohort.entity';
import { CohortMember } from './cohort-member.entity';

@Injectable()
export class CohortsService {
  constructor(
    @InjectRepository(Cohort) private cohortRepo: Repository<Cohort>,
    @InjectRepository(CohortMember) private memberRepo: Repository<CohortMember>,
  ) {}

  async createCohort(courseId: string, instructorId: string, data: any) {
    const cohort = this.cohortRepo.create({
      courseId,
      instructorId,
      ...data,
    });
    return this.cohortRepo.save(cohort);
  }

  async getCohort(id: string) {
    return this.cohortRepo.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });
  }

  async addMember(cohortId: string, userId: string) {
    const cohort = await this.cohortRepo.findOne({ where: { id: cohortId } });
    if (cohort.maxMembers > 0) {
      const memberCount = await this.memberRepo.count({ where: { cohortId } });
      if (memberCount >= cohort.maxMembers) {
        throw new Error('Cohort is full');
      }
    }

    const member = this.memberRepo.create({ cohortId, userId });
    return this.memberRepo.save(member);
  }

  async removeMember(cohortId: string, userId: string) {
    return this.memberRepo.delete({ cohortId, userId });
  }

  async updateMemberProgress(cohortId: string, userId: string, progressPercentage: number) {
    return this.memberRepo.update(
      { cohortId, userId },
      { progressPercentage },
    );
  }

  async getCohortProgress(cohortId: string) {
    const members = await this.memberRepo.find({
      where: { cohortId },
    });

    const avgProgress = members.length > 0
      ? members.reduce((sum, m) => sum + m.progressPercentage, 0) / members.length
      : 0;

    return {
      totalMembers: members.length,
      averageProgress: avgProgress,
      members,
    };
  }

  async getCohortsByCourse(courseId: string) {
    return this.cohortRepo.find({
      where: { courseId },
      relations: ['members'],
    });
  }
}
