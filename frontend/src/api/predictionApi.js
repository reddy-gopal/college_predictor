import api from './apiClient';
export const predictCollegeApi = async (data) => {
    const response = await api.post('/predict-college/', data);
    return response.data;
};  