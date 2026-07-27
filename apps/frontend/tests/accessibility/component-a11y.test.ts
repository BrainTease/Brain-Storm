import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { LoginForm } from '../../src/components/auth/LoginForm';
import { CourseCard } from '../../src/components/courses/CourseCard';

expect.extend(toHaveNoViolations);

describe('Component Accessibility', () => {
  describe('LoginForm', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<LoginForm />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form structure', () => {
      render(<LoginForm />);

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      const submitButton = screen.getByRole('button', { name: /login/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('CourseCard', () => {
    const mockCourse = {
      id: '1',
      title: 'Blockchain Basics',
      description: 'Learn blockchain fundamentals',
      duration: 120,
      image: '/course-image.jpg',
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(<CourseCard course={mockCourse} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have semantic heading', () => {
      render(<CourseCard course={mockCourse} />);

      const heading = screen.getByRole('heading', { name: mockCourse.title });
      expect(heading).toBeInTheDocument();
    });

    it('should have alt text for image', () => {
      render(<CourseCard course={mockCourse} />);

      const image = screen.getByAltText(new RegExp(mockCourse.title, 'i'));
      expect(image).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should have proper landmark structure', async () => {
      const { container } = render(
        <div>
          <header>
            <nav aria-label="Main navigation">
              <a href="/">Home</a>
              <a href="/courses">Courses</a>
            </nav>
          </header>
          <main id="main-content">
            <h1>Welcome</h1>
          </main>
          <footer>
            <p>&copy; 2024 Brain-Storm</p>
          </footer>
        </div>,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
