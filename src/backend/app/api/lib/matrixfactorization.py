import pandas as pd 
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from scipy import sparse 
class MF(object):

    def __init__(self, Y_data, K, lam = 0.1, Xinit = None, Winit = None, 
            learning_rate = 0.5, max_iter = 1000, print_every = 100, user_based = 1):

        self.Y_raw_data = Y_data   # Dữ liệu gốc (user, item, rating)
        self.K = K                 # Số latent features

        # Hệ số regularization (tránh overfitting)
        self.lam = lam

        # Tốc độ học (learning rate)
        self.learning_rate = learning_rate

        # Số vòng lặp tối đa
        self.max_iter = max_iter

        # In kết quả sau mỗi print_every vòng lặp
        self.print_every = print_every

        # Chọn chuẩn hóa theo user hay item
        self.user_based = user_based

        # Số lượng user, item và số rating
        # +1 vì index bắt đầu từ 0
        self.n_users = int(np.max(Y_data[:, 0])) + 1 
        self.n_items = int(np.max(Y_data[:, 1])) + 1
        self.n_ratings = Y_data.shape[0]
        
        # Khởi tạo ma trận item (X)
        if Xinit is None:
            self.X = np.random.randn(self.n_items, K)
        else:
            self.X = Xinit 
        
        # Khởi tạo ma trận user (W)
        if Winit is None: 
            self.W = np.random.randn(K, self.n_users)
        else:
            self.W = Winit
            
        # Bản sao dữ liệu để chuẩn hóa
        self.Y_data_n = self.Y_raw_data.copy()


    
    def normalize_Y(self):
        """
        Chuẩn hóa dữ liệu rating:
        - Nếu user_based: trừ đi mean của từng user
        - Nếu item_based: trừ đi mean của từng item
        """

        if self.user_based:
            user_col = 0
            item_col = 1
            n_objects = self.n_users
        else:
            user_col = 1
            item_col = 0 
            n_objects = self.n_items

        users = self.Y_raw_data[:, user_col] 
        self.mu = np.zeros((n_objects,))

        for n in range(n_objects):
            # Lấy các dòng mà user/item = n
            ids = np.where(users == n)[0].astype(np.int32)

            # Lấy các item liên quan
            item_ids = self.Y_data_n[ids, item_col]

            # Lấy rating tương ứng
            ratings = self.Y_data_n[ids, 2]

            # Tính trung bình
            m = np.mean(ratings) 

            # Nếu không có rating (NaN) thì gán = 0
            if np.isnan(m):
                m = 0 

            self.mu[n] = m

            # Chuẩn hóa: rating - mean
            self.Y_data_n[ids, 2] = ratings - self.mu[n]

    def loss(self):
        """
        Hàm mất mát:
        - Sai số giữa dự đoán và thực tế
        - + regularization
        """
        L = 0 

        for i in range(self.n_ratings):
            # user, item, rating
            n, m, rate = int(self.Y_data_n[i, 0]), int(self.Y_data_n[i, 1]), self.Y_data_n[i, 2]

            # Tính lỗi bình phương
            L += 0.5*(rate - self.X[m, :].dot(self.W[:, n]))**2
        
        # Trung bình
        L /= self.n_ratings

        # Thêm regularization
        L += 0.5*self.lam*(np.linalg.norm(self.X, 'fro') + np.linalg.norm(self.W, 'fro'))

        return L 

    def get_items_rated_by_user(self, user_id):
        ids = np.where(self.Y_data_n[:,0] == user_id)[0] 
        item_ids = self.Y_data_n[ids, 1].astype(np.int32)
        ratings = self.Y_data_n[ids, 2]

        return (item_ids, ratings)
        
        
    def get_users_who_rate_item(self, item_id):
        ids = np.where(self.Y_data_n[:,1] == item_id)[0] 
        user_ids = self.Y_data_n[ids, 0].astype(np.int32)
        ratings = self.Y_data_n[ids, 2]

        return (user_ids, ratings)
    
    def updateX(self):
        """
        Cập nhật ma trận item (X)
        """
        for m in range(self.n_items):
            user_ids, ratings = self.get_users_who_rate_item(m)

            Wm = self.W[:, user_ids]

            # Gradient của X[m]
            grad_xm = -(ratings - self.X[m, :].dot(Wm)).dot(Wm.T)/self.n_ratings + \
                                               self.lam*self.X[m, :]

            # Cập nhật theo gradient descent
            self.X[m, :] -= self.learning_rate*grad_xm.reshape((self.K,))
    

    def updateW(self):
        """
        Cập nhật ma trận user (W)
        """
        for n in range(self.n_users):
            item_ids, ratings = self.get_items_rated_by_user(n)

            Xn = self.X[item_ids, :]

            # Gradient của W[:, n]
            grad_wn = -Xn.T.dot(ratings - Xn.dot(self.W[:, n]))/self.n_ratings + \
                        self.lam*self.W[:, n]

            # Cập nhật
            self.W[:, n] -= self.learning_rate*grad_wn.reshape((self.K,))


    def fit(self):
        self.normalize_Y()

        for it in range(self.max_iter):
            self.updateX()
            self.updateW()

            if (it + 1) % self.print_every == 0:
                rmse_train = self.evaluate_RMSE(self.Y_raw_data)
                print('iter =', it + 1, ', loss =', self.loss(), ', RMSE train =', rmse_train)

    def pred(self, u, i):
        """
        Dự đoán rating của user u cho item i
        """
        u = int(u)
        i = int(i)

        # Bias (mean)
        if self.user_based:
            bias = self.mu[u]
        else: 
            bias = self.mu[i]

        pred = self.X[i, :].dot(self.W[:, u]) + bias 

        # Giới hạn trong khoảng [0, 5]
        if pred < 0:
            return 0 
        if pred > 5: 
            return 5 

        return pred 
        

    def pred_for_user(self, user_id):
        """
        Dự đoán tất cả item mà user chưa đánh giá
        """
        ids = np.where(self.Y_data_n[:, 0] == user_id)[0]

        items_rated_by_u = self.Y_data_n[ids, 1].tolist()              
        
        y_pred = self.X.dot(self.W[:, user_id]) + self.mu[user_id]

        predicted_ratings= []

        for i in range(self.n_items):
            if i not in items_rated_by_u:
                predicted_ratings.append((i, y_pred[i]))
        
        return predicted_ratings
    

    # ================= RMSE =================
    def evaluate_RMSE(self, rate_test):
        """
        Tính RMSE trên tập test
        """
        n_tests = rate_test.shape[0]
        SE = 0  # tổng bình phương sai số

        for n in range(n_tests):
            pred = self.pred(rate_test[n, 0], rate_test[n, 1])
            SE += (pred - rate_test[n, 2])**2 

        RMSE = np.sqrt(SE/n_tests)

        return RMSE