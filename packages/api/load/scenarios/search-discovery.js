/**
 * Search & Discovery Load Test
 * Tests search and discovery endpoints with realistic user patterns
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { getStages } from '../config/stages.js';
import { searchDiscoveryThresholds } from '../config/thresholds.js';

// Custom metrics
const searchResponseTime = new Trend('search_response_time', true);
const discoveryResponseTime = new Trend('discovery_response_time', true);
const searchSuccessRate = new Rate('search_success_rate');
const discoverySuccessRate = new Rate('discovery_success_rate');
const searchRequests = new Counter('search_requests');
const discoveryRequests = new Counter('discovery_requests');

// Configuration
const API_URL = __ENV.K6_API_URL || 'http://localhost:3000';
const PROFILE = __ENV.PROFILE || 'load';

// Search queries to test
const searchQueries = [
  'blockchain',
  'smart contracts',
  'stellar',
  'web3',
  'cryptocurrency',
  'defi',
  'nft',
  'dapp',
  'ethereum',
  'solidity',
  'introduction',
  'advanced',
  'beginner',
  'intermediate',
  'expert',
];

// Categories to test
const categories = [
  'blockchain',
  'smart-contracts',
  'defi',
  'nft',
  'dapp-development',
  'web3',
];

// Tags to test
const tags = [
  'blockchain',
  'stellar',
  'smart-contracts',
  'web3',
  'cryptocurrency',
  'defi',
  'beginner',
  'intermediate',
  'advanced',
];

export const options = {
  stages: getStages(PROFILE),
  thresholds: searchDiscoveryThresholds,
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0',
};

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log(`Starting Search & Discovery Load Test`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Profile: ${PROFILE}`);
  
  // Warm up the server
  http.get(`${API_URL}/api/health`);
  
  return {
    apiUrl: API_URL,
    startTime: Date.now(),
  };
}

/**
 * Main test function - runs for each VU iteration
 */
export default function (data) {
  const { apiUrl } = data;
  
  // Randomly choose a test scenario
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% - Search for courses
    testCourseSearch(apiUrl);
  } else if (scenario < 0.7) {
    // 30% - Browse courses by category
    testCategoryBrowsing(apiUrl);
  } else if (scenario < 0.85) {
    // 15% - Search for instructors
    testInstructorSearch(apiUrl);
  } else if (scenario < 0.95) {
    // 10% - Browse by tags
    testTagBrowsing(apiUrl);
  } else {
    // 5% - List all courses
    testListAllCourses(apiUrl);
  }
  
  // Think time (user reading/browsing)
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

/**
 * Test course search functionality
 */
function testCourseSearch(apiUrl) {
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  const params = {
    tags: { endpoint: 'search_courses' },
    timeout: '10s',
  };
  
  const response = http.get(
    `${apiUrl}/api/search/courses?q=${query}&limit=20`,
    params
  );
  
  const success = check(response, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 300ms': (r) => r.timings.duration < 300,
    'search has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.courses) || Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
    'search response has correct structure': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.courses !== undefined || body.data !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  searchResponseTime.add(response.timings.duration);
  searchSuccessRate.add(success);
  searchRequests.add(1);
  
  // Small think time
  sleep(0.5);
}

/**
 * Test category browsing
 */
function testCategoryBrowsing(apiUrl) {
  const category = categories[Math.floor(Math.random() * categories.length)];
  const params = {
    tags: { endpoint: 'list_courses' },
    timeout: '10s',
  };
  
  const response = http.get(
    `${apiUrl}/api/courses?category=${category}&page=1&limit=20`,
    params
  );
  
  const success = check(response, {
    'category browse status is 200': (r) => r.status === 200,
    'category browse response time < 200ms': (r) => r.timings.duration < 200,
    'category browse has courses': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.courses) || Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
  });
  
  discoveryResponseTime.add(response.timings.duration);
  discoverySuccessRate.add(success);
  discoveryRequests.add(1);
  
  // If successful, view a course detail
  if (success && response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      const courses = body.courses || body.data || [];
      if (courses.length > 0) {
        const randomCourse = courses[Math.floor(Math.random() * courses.length)];
        const courseId = randomCourse.id || randomCourse._id;
        
        if (courseId) {
          sleep(0.5);
          testCourseDetails(apiUrl, courseId);
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  sleep(0.5);
}

/**
 * Test course details view
 */
function testCourseDetails(apiUrl, courseId) {
  const params = {
    tags: { endpoint: 'course_details' },
    timeout: '10s',
  };
  
  const response = http.get(`${apiUrl}/api/courses/${courseId}`, params);
  
  check(response, {
    'course details status is 200': (r) => r.status === 200,
    'course details response time < 150ms': (r) => r.timings.duration < 150,
    'course details has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined || body._id !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  discoveryResponseTime.add(response.timings.duration);
}

/**
 * Test instructor search
 */
function testInstructorSearch(apiUrl) {
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  const params = {
    tags: { endpoint: 'search_instructors' },
    timeout: '10s',
  };
  
  const response = http.get(
    `${apiUrl}/api/search/instructors?q=${query}&limit=20`,
    params
  );
  
  const success = check(response, {
    'instructor search status is 200': (r) => r.status === 200,
    'instructor search response time < 250ms': (r) => r.timings.duration < 250,
    'instructor search has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.instructors) || Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
  });
  
  searchResponseTime.add(response.timings.duration);
  searchSuccessRate.add(success);
  searchRequests.add(1);
  
  sleep(0.5);
}

/**
 * Test tag browsing
 */
function testTagBrowsing(apiUrl) {
  const tag = tags[Math.floor(Math.random() * tags.length)];
  const params = {
    tags: { endpoint: 'list_tags' },
    timeout: '10s',
  };
  
  const response = http.get(
    `${apiUrl}/api/courses?tags=${tag}&limit=20`,
    params
  );
  
  const success = check(response, {
    'tag browse status is 200': (r) => r.status === 200,
    'tag browse response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  discoveryResponseTime.add(response.timings.duration);
  discoverySuccessRate.add(success);
  discoveryRequests.add(1);
  
  sleep(0.5);
}

/**
 * Test listing all courses
 */
function testListAllCourses(apiUrl) {
  const page = Math.floor(Math.random() * 5) + 1; // Pages 1-5
  const params = {
    tags: { endpoint: 'list_courses' },
    timeout: '10s',
  };
  
  const response = http.get(
    `${apiUrl}/api/courses?page=${page}&limit=20`,
    params
  );
  
  const success = check(response, {
    'list all status is 200': (r) => r.status === 200,
    'list all response time < 200ms': (r) => r.timings.duration < 200,
    'list all has courses': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.courses) || Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    },
  });
  
  discoveryResponseTime.add(response.timings.duration);
  discoverySuccessRate.add(success);
  discoveryRequests.add(1);
  
  sleep(0.5);
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\n=== Search & Discovery Load Test Complete ===`);
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  console.log(`Profile: ${PROFILE}`);
  console.log(`API URL: ${data.apiUrl}`);
}
