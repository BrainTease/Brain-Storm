import { Pact, Matchers } from '@pact-foundation/pact';
import axios from 'axios';

const provider = new Pact({
  consumer: 'BrainStormFrontend',
  provider: 'BrainStormBackend',
  port: 8991,
});

describe('Courses API Contract', () => {
  beforeAll(() => provider.setup());
  afterEach(() => provider.verify());
  afterAll(() => provider.finalize());

  describe('GET /v1/courses', () => {
    it('should list all courses', async () => {
      const expectedBody = Matchers.eachLike({
        id: Matchers.uuid(),
        title: Matchers.string('Blockchain Basics'),
        description: Matchers.string('Learn blockchain fundamentals'),
        duration: Matchers.integer(120),
        published: true,
      });

      await provider.addInteraction({
        state: 'courses exist',
        uponReceiving: 'a request to list all courses',
        withRequest: {
          method: 'GET',
          path: '/v1/courses',
          headers: {
            Authorization: Matchers.regex(/Bearer .+/),
          },
        },
        willRespondWith: {
          status: 200,
          body: expectedBody,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      });

      const response = await axios.get('http://localhost:8991/v1/courses', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('GET /v1/courses/:id', () => {
    it('should get a single course', async () => {
      const courseId = '550e8400-e29b-41d4-a716-446655440000';
      const expectedBody = {
        id: courseId,
        title: 'Blockchain Basics',
        description: 'Learn blockchain fundamentals',
        duration: 120,
        modules: Matchers.eachLike({
          id: Matchers.uuid(),
          title: Matchers.string('Module 1'),
          order: 1,
        }),
      };

      await provider.addInteraction({
        state: `course ${courseId} exists`,
        uponReceiving: 'a request to get a course by id',
        withRequest: {
          method: 'GET',
          path: `/v1/courses/${courseId}`,
          headers: {
            Authorization: Matchers.regex(/Bearer .+/),
          },
        },
        willRespondWith: {
          status: 200,
          body: expectedBody,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      });

      const response = await axios.get(`http://localhost:8991/v1/courses/${courseId}`, {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(courseId);
    });
  });
});
