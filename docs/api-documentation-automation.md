# Automated API Documentation Guide

This document describes the automated API documentation generation and deployment pipeline for Brain-Storm.

## Overview

The API documentation pipeline automatically generates, validates, and deploys comprehensive API documentation from OpenAPI specifications.

## Features

### 1. OpenAPI Specification Validation
- Validates OpenAPI spec syntax and structure
- Detects breaking changes from previous versions
- Ensures API compliance with OpenAPI standards

### 2. Multi-Format Documentation
- **Swagger UI**: Interactive API explorer
- **ReDoc**: Beautiful, responsive API documentation
- **Search Index**: Full-text searchable API reference

### 3. Version Management
- Tracks API versions automatically
- Maintains version history
- Supports multiple API versions

### 4. SDK Generation
- Automatically generates TypeScript SDK
- Automatically generates Python SDK
- Keeps SDKs in sync with API changes

### 5. Deployment
- Deploys to GitHub Pages automatically
- Maintains documentation history
- Provides PR previews for documentation changes

## Workflow Triggers

The API documentation pipeline runs automatically when:
- Code is pushed to `main` branch with backend changes
- Pull requests modify backend API code
- Pull requests modify API documentation
- Manual workflow dispatch

## Documentation Formats

### Swagger UI
Interactive API documentation with "Try it out" functionality.

**Access**: `https://your-domain/api/docs` or GitHub Pages URL

**Features**:
- Interactive endpoint testing
- Request/response examples
- Authentication testing
- Schema visualization

### ReDoc
Beautiful, responsive API documentation optimized for reading.

**Access**: `https://your-domain/api/redoc` or GitHub Pages URL

**Features**:
- Responsive design
- Search functionality
- Code examples
- Schema documentation

## API Documentation Structure

```
docs/api/
├── dist/
│   ├── index.html              # Swagger UI
│   ├── redoc.html              # ReDoc documentation
│   ├── openapi.json            # OpenAPI specification
│   ├── versions.json           # Version history
│   ├── CHANGELOG.md            # API changelog
│   └── search-index.json       # Search index
├── swagger-ui.html             # Swagger UI template
└── DEPLOYMENT.md               # Deployment guide
```

## Documenting Your API

### 1. Using NestJS Swagger Decorators

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  @Get()
  @ApiOperation({ summary: 'List all courses' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  findAll() {
    // Implementation
  }

  @Post()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created' })
  create(@Body() createCourseDto: CreateCourseDto) {
    // Implementation
  }
}
```

### 2. Documenting DTOs

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Course title',
    example: 'Introduction to Stellar',
  })
  title: string;

  @ApiProperty({
    description: 'Course description',
    example: 'Learn the basics of Stellar blockchain',
  })
  description: string;

  @ApiProperty({
    description: 'Course difficulty level',
    enum: ['beginner', 'intermediate', 'advanced'],
    example: 'beginner',
  })
  level: string;
}
```

### 3. Documenting Responses

```typescript
@Get(':id')
@ApiOperation({ summary: 'Get course by ID' })
@ApiResponse({
  status: 200,
  description: 'Course found',
  type: CourseDto,
})
@ApiResponse({
  status: 404,
  description: 'Course not found',
})
getCourse(@Param('id') id: string) {
  // Implementation
}
```

## Exporting OpenAPI Specification

### Manual Export

```bash
cd apps/backend
EXPORT_OPENAPI=true npm run start
# OpenAPI spec exported to openapi.json
```

### Automatic Export (CI/CD)

The CI/CD pipeline automatically exports the OpenAPI spec on every push to main.

## Breaking Changes Detection

The pipeline automatically detects breaking changes:

```
⚠️ Breaking Changes Detected:
- Removed endpoint: DELETE /v1/courses/:id
- Changed response type: GET /v1/users/:id
- Removed field: User.email
```

## SDK Generation

### TypeScript SDK

Generated automatically and available in `packages/sdk-typescript/`

**Installation**:
```bash
npm install @brain-storm/sdk
```

**Usage**:
```typescript
import { CoursesApi } from '@brain-storm/sdk';

const api = new CoursesApi();
const courses = await api.getCourses();
```

### Python SDK

Generated automatically and available in `packages/sdk-python/`

**Installation**:
```bash
pip install brain-storm-sdk
```

**Usage**:
```python
from brain_storm_sdk import CoursesApi

api = CoursesApi()
courses = api.get_courses()
```

## Documentation Versioning

### Version History

The `versions.json` file maintains version history:

```json
{
  "current": "1.2.0",
  "versions": [
    {
      "version": "1.2.0",
      "url": "./index.html",
      "redoc": "./redoc.html",
      "date": "2026-06-01T05:44:31Z"
    },
    {
      "version": "1.1.0",
      "url": "./v1.1.0/index.html",
      "redoc": "./v1.1.0/redoc.html",
      "date": "2026-05-15T10:30:00Z"
    }
  ]
}
```

### Accessing Previous Versions

Previous API versions are archived and accessible via GitHub Pages.

## Search Functionality

The `search-index.json` provides full-text search capabilities:

```json
{
  "version": "1.2.0",
  "endpoints": [
    {
      "path": "/v1/courses",
      "methods": ["GET", "POST"],
      "tags": ["courses"]
    }
  ],
  "schemas": [
    {
      "name": "CourseDto",
      "description": "Course data transfer object"
    }
  ],
  "tags": ["courses", "users", "auth"]
}
```

## PR Preview

When you create a pull request that modifies the API:

1. The pipeline validates the OpenAPI spec
2. Generates documentation preview
3. Comments on the PR with preview links
4. Detects breaking changes

Example PR comment:
```
## 📚 API Documentation Preview

**Version**: 1.2.0

- [Swagger UI](...)
- [ReDoc](...)

Documentation will be deployed to GitHub Pages on merge to main.
```

## Deployment

### GitHub Pages Deployment

Documentation is automatically deployed to GitHub Pages when:
- Code is pushed to `main` branch
- API changes are detected

**Access**: `https://your-org.github.io/Brain-Storm/`

### Custom Domain Deployment

To deploy to a custom domain:

1. Configure GitHub Pages in repository settings
2. Add custom domain
3. Update DNS records
4. Documentation will be available at your custom domain

## Troubleshooting

### OpenAPI Validation Fails

**Issue**: "Invalid OpenAPI specification"

**Solution**:
1. Check NestJS Swagger decorators
2. Verify all endpoints are documented
3. Ensure DTOs have proper decorators
4. Run validation locally:
   ```bash
   swagger-cli validate apps/backend/openapi.json
   ```

### Documentation Not Updating

**Issue**: "Documentation not deployed"

**Solution**:
1. Check GitHub Actions logs
2. Verify backend changes are detected
3. Ensure OpenAPI export is working
4. Check GitHub Pages settings

### SDK Generation Fails

**Issue**: "SDK generation failed"

**Solution**:
1. Verify OpenAPI spec is valid
2. Check OpenAPI Generator CLI installation
3. Review SDK generation logs
4. Ensure all endpoints are documented

## Best Practices

### 1. Keep Documentation Updated
- Document all new endpoints immediately
- Update documentation when changing API
- Include examples in documentation

### 2. Use Meaningful Descriptions
```typescript
// ✅ Good: Clear, descriptive
@ApiOperation({ summary: 'Get all published courses' })

// ❌ Bad: Vague
@ApiOperation({ summary: 'Get courses' })
```

### 3. Document Error Responses
```typescript
@ApiResponse({ status: 400, description: 'Invalid input' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 404, description: 'Course not found' })
```

### 4. Include Examples
```typescript
@ApiProperty({
  example: 'Introduction to Stellar',
  description: 'Course title',
})
title: string;
```

### 5. Version Your API
- Use versioning in routes: `/v1/`, `/v2/`
- Maintain backward compatibility
- Document deprecations

## Related Documentation

- [API Versioning](./api-versioning.md)
- [API Integration Examples](./api-integration-examples.md)
- [Deployment Guide](./deployment-guide.md)
- [OpenAPI Specification](https://spec.openapis.org/)
- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
