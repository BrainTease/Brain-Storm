  async createCertificateBatch(payload: Record<string, any>[], createdById: string): Promise<BatchJob> {
    const job = await this.jobRepo.save(
      this.jobRepo.create({ type: 'certificates', payload, totalItems: payload.length, createdById }),
    );

    // Add to queue
    await this.batchQueue.add(
      'certificates',
      { jobId: job.id, payload },
      { jobId: job.id },
    );

    return job;
  }

  async createEmailBatch(payload: Record<string, any>[], createdById: string): Promise<BatchJob> {
    const job = await this.jobRepo.save(
      this.jobRepo.create({ type: 'emails', payload, totalItems: payload.length, createdById }),
    );

    // Add to queue
    await this.batchQueue.add(
      'emails',
      { jobId: job.id, payload },
      { jobId: job.id },
    );

    return job;
  }

  async createExportBatch(payload: Record<string, any>[], createdById: string): Promise<BatchJob> {
    const job = await this.jobRepo.save(
      this.jobRepo.create({ type: 'export', payload, totalItems: payload.length, createdById }),
    );

    // Add to queue
    await this.batchQueue.add(
      'export',
      { jobId: job.id, payload },
      { jobId: job.id },
    );

    return job;
  }