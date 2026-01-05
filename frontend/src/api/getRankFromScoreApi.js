import api from './apiClient';

export const getRankFromScoreApi = async (data) => {
    const response = await api.post('/get-rank-from-score/', data);
    return response.data;
};