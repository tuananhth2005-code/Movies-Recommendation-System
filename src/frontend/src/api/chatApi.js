import axiosClient from './axiosClient';

const chatApi = {
  createSession: () =>
    axiosClient.post('/chat/sessions'),

  getSessions: () =>
    axiosClient.get('/chat/sessions'),

  getSession: (id) =>
    axiosClient.get(`/chat/sessions/${id}`),

  getSessionMessages: (id) =>
    axiosClient.get(`/chat/sessions/${id}/messages`),

  deleteSession: (id) =>
    axiosClient.delete(`/chat/sessions/${id}`),

  sendMessage: (sessionId, message) =>
    axiosClient.post('/chat/message', {
      session_id: sessionId,
      message,
    }, { timeout: 60000 }),
};

export default chatApi;
