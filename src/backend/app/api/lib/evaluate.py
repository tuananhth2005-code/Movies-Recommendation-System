import math
import numpy as np
from lib.get_items_rated import get_items_rated_by_user

def evaluate_RMSE(Yhat, rates, n_users, W, b):
    se = 0
    cnt = 0
    for n in range(n_users):
        ids, scores_truth = get_items_rated_by_user(rates, n)
        scores_pred = Yhat[ids, n]
        e = scores_truth - scores_pred 
        se += (e*e).sum(axis = 0)
        cnt += e.size 
    return math.sqrt(se/cnt)

def evaluate_MAE(Yhat, rates, n_users, W, b):
    abs_error_sum = 0
    cnt = 0
    for n in range(n_users):
        ids, scores_truth = get_items_rated_by_user(rates, n)
        scores_pred = Yhat[ids, n]
        abs_e = abs(scores_truth - scores_pred)
        abs_error_sum += abs_e.sum(axis = 0)
        cnt += abs_e.size 
    return abs_error_sum / cnt