import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from scipy import sparse 
class CF:
    def __init__(self, Y_data, k=30, uuCF=1):
        """
        Y_data: numpy array dạng [user_id, item_id, rating]
        k: số hàng xóm gần nhất
        uuCF: 1 = user-user, 0 = item-item
        """
        self.uuCF = uuCF
        self.k = k

        # Nếu item-based thì đảo user và item
        self.Y_data = Y_data if uuCF else Y_data[:, [1, 0, 2]]

        # Số lượng user và item
        self.n_users = int(np.max(self.Y_data[:, 0])) + 1
        self.n_items = int(np.max(self.Y_data[:, 1])) + 1
        # Chỉ giữ các item thực sự có trong dữ liệu để tránh dự đoán cho ID "ảo"
        self.item_ids = np.unique(self.Y_data[:, 1]).astype(int)

    # 1. Chuẩn hóa dữ liệu
    def normalize_Y(self):
        """
        Trừ đi trung bình rating của mỗi user
        """
        self.Ybar_data = self.Y_data.copy()
        self.mu = np.zeros(self.n_users)  # lưu mean của từng user

        for u in range(self.n_users):
            # Lấy tất cả rating của user u
            ids = np.where(self.Y_data[:, 0] == u)[0]

            ratings = self.Y_data[ids, 2]

            # Tính trung bình
            if len(ratings) > 0:
                mean = np.mean(ratings)
            else:
                mean = 0

            self.mu[u] = mean
            # Chuẩn hóa rating
            self.Ybar_data[ids, 2] = ratings - mean

        # Tạo sparse matrix (item x user)
        self.Ybar = sparse.coo_matrix(
            (self.Ybar_data[:, 2],
             (self.Ybar_data[:, 1], self.Ybar_data[:, 0])),
            shape=(self.n_items, self.n_users)
        ).tocsr()

    # 2. Tính similarity
    def similarity(self):
        """
        Tính độ giống nhau giữa user-user
        """
        self.S = cosine_similarity(self.Ybar.T, self.Ybar.T)

    # 3. Train model
    def fit(self):
        self.normalize_Y()
        self.similarity()

    # 4. Predict rating
    def __pred(self, u, i, normalized=1):
        """
        Dự đoán rating của user u cho item i
        """

        # Bước 1: tìm user đã rate item i
        ids = np.where(self.Y_data[:, 1] == i)[0]
        users_rated_i = self.Y_data[ids, 0].astype(int)

        # Bước 2: lấy similarity
        sim = self.S[u, users_rated_i]

        # Bước 3: chọn top-k user giống nhất
        top_k_idx = np.argsort(sim)[-self.k:]
        nearest_sim = sim[top_k_idx]

        # Bước 4: lấy rating đã normalize
        ratings = self.Ybar[i, users_rated_i[top_k_idx]].toarray().flatten()

        # Bước 5: tính weighted average
        if np.sum(np.abs(nearest_sim)) == 0:
            return 0

        pred = np.dot(ratings, nearest_sim) / (np.sum(np.abs(nearest_sim)) + 1e-8)

        # Nếu cần rating gốc thì cộng lại mean
        if normalized == 0:
            pred += self.mu[u]

        return pred

    def pred(self, u, i, normalized=1):
        """
        Wrapper để xử lý user-based hoặc item-based
        """
        if self.uuCF:
            return self.__pred(u, i, normalized)
        else:
            return self.__pred(i, u, normalized)

    # 5. Recommend
    def recommend(self, u, top_n=5):
        """
        Gợi ý top_n item cho user u
        """
        ids = np.where(self.Y_data[:, 0] == u)[0]
        rated_items = set(self.Y_data[ids, 1].astype(int).tolist())

        predictions = []

        for i in self.item_ids:
            if i not in rated_items:
                score = self.__pred(u, i, normalized=0)
                predictions.append((i, score))

        # Sắp xếp giảm dần
        predictions.sort(key=lambda x: x[1], reverse=True)
        return predictions[:top_n]