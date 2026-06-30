/**
 * SLO Thresholds for Load Testing
 * Defines performance thresholds that tests must meet
 */

export const searchDiscoveryThresholds = {
  // Search endpoints
  'http_req_duration{endpoint:search_courses}': ['p(95)<300', 'p(99)<500'],
  'http_req_failed{endpoint:search_courses}': ['rate<0.01'], // < 1%
  
  // Discovery endpoints
  'http_req_duration{endpoint:list_courses}': ['p(95)<200', 'p(99)<400'],
  'http_req_failed{endpoint:list_courses}': ['rate<0.005'], // < 0.5%
  
  'http_req_duration{endpoint:course_details}': ['p(95)<150', 'p(99)<300'],
  'http_req_failed{endpoint:course_details}': ['rate<0.005'], // < 0.5%
  
  'http_req_duration{endpoint:search_instructors}': ['p(95)<250', 'p(99)<450'],
  'http_req_failed{endpoint:search_instructors}': ['rate<0.01'], // < 1%
  
  'http_req_duration{endpoint:list_tags}': ['p(95)<100', 'p(99)<200'],
  'http_req_failed{endpoint:list_tags}': ['rate<0.001'], // < 0.1%
  
  'http_req_duration{endpoint:list_categories}': ['p(95)<100', 'p(99)<200'],
  'http_req_failed{endpoint:list_categories}': ['rate<0.001'], // < 0.1%
  
  // Overall thresholds
  'http_req_duration': ['p(95)<500', 'p(99)<1000'],
  'http_req_failed': ['rate<0.02'], // < 2%
  'http_reqs': ['rate>50'], // Minimum throughput: 50 req/s
};

export const authThresholds = {
  'http_req_duration{endpoint:login}': ['p(95)<500', 'p(99)<1000'],
  'http_req_failed{endpoint:login}': ['rate<0.02'], // < 2%
  
  'http_req_duration{endpoint:register}': ['p(95)<800', 'p(99)<1500'],
  'http_req_failed{endpoint:register}': ['rate<0.02'], // < 2%
  
  'http_req_duration{endpoint:refresh_token}': ['p(95)<200', 'p(99)<400'],
  'http_req_failed{endpoint:refresh_token}': ['rate<0.01'], // < 1%
  
  'http_req_duration': ['p(95)<800', 'p(99)<1500'],
  'http_req_failed': ['rate<0.02'], // < 2%
};

export const courseBrowsingThresholds = {
  'http_req_duration{endpoint:browse_courses}': ['p(95)<300', 'p(99)<600'],
  'http_req_failed{endpoint:browse_courses}': ['rate<0.01'], // < 1%
  
  'http_req_duration{endpoint:filter_courses}': ['p(95)<350', 'p(99)<700'],
  'http_req_failed{endpoint:filter_courses}': ['rate<0.01'], // < 1%
  
  'http_req_duration{endpoint:course_content}': ['p(95)<400', 'p(99)<800'],
  'http_req_failed{endpoint:course_content}': ['rate<0.01'], // < 1%
  
  'http_req_duration': ['p(95)<500', 'p(99)<1000'],
  'http_req_failed': ['rate<0.02'], // < 2%
};

export const userWorkflowThresholds = {
  'http_req_duration{endpoint:enroll}': ['p(95)<400', 'p(99)<800'],
  'http_req_failed{endpoint:enroll}': ['rate<0.01'], // < 1%
  
  'http_req_duration{endpoint:profile}': ['p(95)<200', 'p(99)<400'],
  'http_req_failed{endpoint:profile}': ['rate<0.005'], // < 0.5%
  
  'http_req_duration{endpoint:progress}': ['p(95)<250', 'p(99)<500'],
  'http_req_failed{endpoint:progress}': ['rate<0.01'], // < 1%
  
  'http_req_duration': ['p(95)<600', 'p(99)<1200'],
  'http_req_failed': ['rate<0.02'], // < 2%
  'checks': ['rate>0.95'], // 95% of checks should pass
};

// Stress test thresholds (more relaxed)
export const stressTestThresholds = {
  'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
  'http_req_failed': ['rate<0.10'], // < 10%
};

// Soak test thresholds (for extended duration)
export const soakTestThresholds = {
  'http_req_duration': ['p(95)<500', 'p(99)<1000'],
  'http_req_failed': ['rate<0.02'], // < 2%
  'http_reqs': ['rate>30'], // Sustained throughput
};

export default {
  searchDiscovery: searchDiscoveryThresholds,
  auth: authThresholds,
  courseBrowsing: courseBrowsingThresholds,
  userWorkflow: userWorkflowThresholds,
  stress: stressTestThresholds,
  soak: soakTestThresholds,
};
