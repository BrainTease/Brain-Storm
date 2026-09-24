import * as fs from 'fs';
import * as path from 'path';

describe('API Reference Documentation', () => {
  const apiDocsDir = path.join(process.cwd(), 'docs', 'api');
  const openApiPath = path.join(apiDocsDir, 'openapi.json');
  const graphqlPath = path.join(apiDocsDir, 'graphql-schema.graphql');
  const sdkReadmePath = path.join(process.cwd(), 'packages', 'sdk', 'README.md');

  describe('OpenAPI Specification', () => {
    it('should have OpenAPI spec with valid structure', () => {
      expect(fs.existsSync(openApiPath)).toBe(true);
      const content = fs.readFileSync(openApiPath, 'utf-8');
      const spec = JSON.parse(content);
      expect(spec).toHaveProperty('openapi');
      expect(spec).toHaveProperty('info');
      expect(spec).toHaveProperty('paths');
      expect(Object.keys(spec.paths || {}).length).toBeGreaterThan(0);
    });

    it('should document metadata, authentication, and schemas', () => {
      const content = fs.readFileSync(openApiPath, 'utf-8');
      const spec = JSON.parse(content);
      expect(spec.info).toHaveProperty('title');
      expect(spec.info).toHaveProperty('version');
      expect(content).toMatch(/security|auth|bearer|token/i);
      expect(content).toMatch(/components|schemas/i);
    });
  });

  describe('GraphQL Schema', () => {
    it('should have valid GraphQL schema', () => {
      expect(fs.existsSync(graphqlPath)).toBe(true);
      const content = fs.readFileSync(graphqlPath, 'utf-8');
      expect(content).toMatch(/type\s+\w+\s*\{/);
      expect(content).toMatch(/schema\s*\{/);
      expect(content).toMatch(/type\s+Query\s*\{/);
    });

    it('should define operations and resolvers', () => {
      const content = fs.readFileSync(graphqlPath, 'utf-8');
      expect(content).toMatch(/type\s+Mutation|type\s+Subscription/);
      const fieldCount = (content.match(/\w+\s*(\([^)]*\))?\s*:/g) || []).length;
      expect(fieldCount).toBeGreaterThan(0);
    });
  });

  describe('API Documentation Integration', () => {
    it('should link API docs and have proper structure', () => {
      const sdkContent = fs.readFileSync(sdkReadmePath, 'utf-8');
      expect(sdkContent).toMatch(/docs\/api|api.*reference|openapi|graphql/i);
      expect(fs.existsSync(apiDocsDir)).toBe(true);
      const files = fs.readdirSync(apiDocsDir);
      const hasIndex = files.some((f) => /readme|index/i.test(f));
      expect(hasIndex).toBe(true);
    });

    it('should document error responses', () => {
      const openApiContent = fs.readFileSync(openApiPath, 'utf-8');
      const spec = JSON.parse(openApiContent);
      const hasErrors = Object.values(spec.paths || {}).some((pathItem: unknown) => {
        const item = pathItem as Record<string, unknown>;
        return Object.values(item || {}).some((op: unknown) => {
          const operation = op as Record<string, unknown>;
          const responses = operation.responses as Record<string, unknown>;
          return responses && (responses['400'] || responses['401'] || responses['500']);
        });
      });
      expect(hasErrors).toBe(true);
    });
  });
});
