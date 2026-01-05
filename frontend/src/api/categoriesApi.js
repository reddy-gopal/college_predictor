import api from './apiClient';

export const getCategoriesApi = async () => {
    const response = await api.get('/get-categories/');
    return response.data;
};