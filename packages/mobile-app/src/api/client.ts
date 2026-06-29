import axios, { AxiosInstance } from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/v1`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  setAuthToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken() {
    delete this.client.defaults.headers.common['Authorization'];
  }

  async getCourses() {
    const response = await this.client.get('/courses');
    return response.data;
  }

  async getCourse(id: string) {
    const response = await this.client.get(`/courses/${id}`);
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(email: string, password: string, name: string) {
    const response = await this.client.post('/auth/register', {
      email,
      password,
      name,
    });
    return response.data;
  }
}

export const apiClient = new ApiClient();
