import * as Linking from 'expo-linking';

export interface DeepLinkRoute {
  screen: string;
  params?: Record<string, any>;
}

export class DeepLinkHandler {
  parseNotificationData(data: any): DeepLinkRoute | null {
    if (data.screen) {
      return {
        screen: data.screen,
        params: data.params || {},
      };
    }

    if (data.courseId) {
      return {
        screen: 'CourseDetail',
        params: { courseId: data.courseId },
      };
    }

    if (data.url) {
      const { path, queryParams } = Linking.parse(data.url);
      return this.mapPathToRoute(path, queryParams);
    }

    return null;
  }

  private mapPathToRoute(path: string | null, params: any): DeepLinkRoute | null {
    if (!path) return null;

    if (path.startsWith('/courses/')) {
      const courseId = path.split('/')[2];
      return { screen: 'CourseDetail', params: { courseId } };
    }

    if (path === '/profile') {
      return { screen: 'Profile', params: {} };
    }

    return null;
  }

  handleDeepLink(route: DeepLinkRoute, navigation: any) {
    navigation.navigate(route.screen, route.params);
  }
}

export const deepLinkHandler = new DeepLinkHandler();
