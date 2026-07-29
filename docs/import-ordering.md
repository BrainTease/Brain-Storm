# Import Ordering Rules

## Overview
This document defines the import ordering rules for the monorepo.

## Ordering Rules

### 1. External Packages
```typescript
// First: External packages
import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';
// Second: Internal packages
import { UserService } from '@brain-storm/services';
import { User, ApiResponse } from '@brain-storm/types';
import { formatDate } from '@brain-storm/utils';
// Third: Relative imports (parent)
import { helper } from '../utils/helper';
import { config } from '../config';
// Fourth: Relative imports (current)
import { Component } from './Component';
import { styles } from './styles';
import './styles.css';
import React, { useState } from 'react';
import { useRouter } from 'next/router';

import { UserService } from '@brain-storm/services';
import { User } from '@brain-storm/types';
import { formatDate } from '@brain-storm/utils';

import { helper } from '../utils/helper';
import { config } from '../config';

import { UserCard } from './UserCard';
import { userStyles } from './styles';
import { helper } from '../utils/helper';
import React from 'react';
import { UserCard } from './UserCard';
import { UserService } from '@brain-storm/services';
'simple-import-sort/imports': [
  'error',
  {
    groups: [
      ['^@?\\w'],
      ['^@brain-storm/'],
      ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
      ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
    ],
  },
],
# Fix all imports in the monorepo
./scripts/fix-imports.sh

# Or use ESLint directly
npx eslint --fix . --ext .ts,.tsx
# Run import ordering audit
./scripts/audit-imports.sh

# Run ESLint with import rules
npx eslint . --ext .ts,.tsx --rule 'simple-import-sort/imports: error'
