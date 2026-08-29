/**
 * Course Browsing Load Test
 * Tests course browsing, filtering, and detail viewing
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { getStages } from '../config/stages.js';
import { courseBrowsingThresholds } from '../config/thresholds.js';

// Custom metrics
const browseResponseTime = new Trend('browse_response_time', true);
const filterResponseTime = new Trend('filter_response_time', true);
const detailResponseTime = new Trend('detail_response_time', true);
const browseSuccessRate = new Rate('browse_success_rate');

// Configuration
const API_URL = __ENV.K6_API_URL || 'http://localhost:3000';
const PROFILE = __ENV.PROFILE || 'load';

const sortOptions = ['newest', 'popular', 'rating', 'price'];
const filterOptions = {
  level: ['beginner', 'intermediate', 'advanced', 'expert'],
  price: ['free', 'paid'],
  duration: ['short', 'medium', 'long'],
  language: ['en', 'es', 'fr', 'de'],
};

export const options = {
  stages: getStages(PROFILE),
  thresholds: courseBrowsingThresholds,
};

export function setup() {
  console.log(`Starting Course Browsing Load Test`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Profile: ${PROFILE}`);

  return { apiUrl: API_URL };
}

export default function (data) {
  const { apiUrl } = data;

  // User journey: Browse → Filter → View Details
  browseCourses(apiUrl);
  sleep(1);

  if (Math.random() < 0.7) {
    // 70% of users apply filters
    filterCourses(apiUrl);
    sleep(0.5);
  }

  if (Math.random() < 0.8) {
    // 80% of users view course details
    viewCourseDetails(apiUrl);
    sleep(1);
  }

  sleep(Math.random() * 2 + 1);
}

function browseCourses(apiUrl) {
  const page = Math.floor(Math.random() * 10) + 1;
  const sort = sortOptions[Math.floor(Math.random() * sortOptions.length)];

  const params = {
    tags: { endpoint: 'browse_courses' },
    timeout: '10s',
  };

  const response = http.get(`${apiUrl}/api/courses?page=${page}&limit=20&sort=${sort}`, params);

  const success = check(response, {
    'browse status is 200': (r) => r.status === 200,
    'browse response time < 300ms': (r) => r.timings.duration < 300,
    'browse has courses': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.courses) || Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
    'browse has pagination': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.total !== undefined || body.totalCount !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  browseResponseTime.add(response.timings.duration);
  browseSuccessRate.add(success);
}

function filterCourses(apiUrl) {
  const level = filterOptions.level[Math.floor(Math.random() * filterOptions.level.length)];
  const price = filterOptions.price[Math.floor(Math.random() * filterOptions.price.length)];

  const params = {
    tags: { endpoint: 'filter_courses' },
    timeout: '10s',
  };

  const response = http.get(`${apiUrl}/api/courses?level=${level}&price=${price}&limit=20`, params);

  const success = check(response, {
    'filter status is 200': (r) => r.status === 200,
    'filter response time < 350ms': (r) => r.timings.duration < 350,
    'filter returns results': (r) => {
      try {
        const body = JSON.parse(r.body);
        const courses = body.courses || body.data || [];
        return Array.isArray(courses);
      } catch (e) {
        return false;
      }
    },
  });

  filterResponseTime.add(response.timings.duration);
  browseSuccessRate.add(success);
}

function viewCourseDetails(apiUrl) {
  // Get a random course ID (in real test, use from browse results)
  const courseId = `course-${Math.floor(Math.random() * 100) + 1}`;

  const params = {
    tags: { endpoint: 'course_content' },
    timeout: '10s',
  };

  const response = http.get(`${apiUrl}/api/courses/${courseId}`, params);

  check(response, {
    'detail status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'detail response time < 400ms': (r) => r.timings.duration < 400,
  });

  detailResponseTime.add(response.timings.duration);
}

export function teardown(data) {
  console.log(`\n=== Course Browsing Load Test Complete ===`);
  console.log(`Profile: ${PROFILE}`);
}
