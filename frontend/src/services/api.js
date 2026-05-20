import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000/api';

class ApiService {
  async getAccessToken() {
    return await AsyncStorage.getItem('accessToken');
  }

  async getRefreshToken() {
    return await AsyncStorage.getItem('refreshToken');
  }

  async setTokens(accessToken, refreshToken) {
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
  }

  async clearTokens() {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
  }

  async refreshAccessToken() {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        await AsyncStorage.setItem('accessToken', data.accessToken);
        return data.accessToken;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }

    return null;
  }

  async fetchWithAuth(url, options = {}) {
    const accessToken = await this.getAccessToken();

    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      let response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 403) {
        const newAccessToken = await this.refreshAccessToken();
        if (newAccessToken) {
          headers.Authorization = `Bearer ${newAccessToken}`;
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), 10000);
          try {
            response = await fetch(url, {
              ...options,
              headers,
              signal: retryController.signal,
            });
            clearTimeout(retryTimeoutId);
          } catch (error) {
            clearTimeout(retryTimeoutId);
            throw error;
          }
        }
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async login(username, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка входа');
    }

    const data = await response.json();
    await this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async register(username, password, email) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка регистрации');
    }

    const data = await response.json();
    await this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async logout() {
    const refreshToken = await this.getRefreshToken();
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error('Error logging out:', error);
      }
    }
    await this.clearTokens();
  }

  async getMe() {
    const response = await this.fetchWithAuth(`${API_BASE_URL}/auth/me`);
    if (!response.ok) {
      throw new Error('Ошибка получения данных пользователя');
    }
    return await response.json();
  }

  async uploadFile(uri, name, type) {
    const accessToken = await this.getAccessToken();
    if (!accessToken) throw new Error('Не авторизован');

    const formData = new FormData();
    formData.append('file', { uri, name, type });

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка загрузки файла');
    }

    return await response.json();
  }

  // Используем моковые эндпоинты
  async getVacancies() {
    const response = await this.fetchWithAuth(`${API_BASE_URL}/mock/list`);
    if (!response.ok) {
      throw new Error('Ошибка получения вакансий');
    }
    return await response.json();
  }

  async getCandidates(vacancyId) {
    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/mock/vacancy/${vacancyId}/candidates`
    );
    if (!response.ok) {
      throw new Error('Ошибка получения кандидатов');
    }
    return await response.json();
  }

  async getCandidateDetail(vacancyId, candidateId) {
    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/mock/vacancy/${vacancyId}/candidate/${candidateId}`
    );
    if (!response.ok) {
      throw new Error('Ошибка получения данных кандидата');
    }
    return await response.json();
  }
}

export const apiService = new ApiService();