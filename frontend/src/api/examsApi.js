import api from './apiClient';

export const getExamsApi = async () => {
    const response = await api.get('/exams');
    return response.data;
};