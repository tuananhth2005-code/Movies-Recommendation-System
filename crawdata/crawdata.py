import requests
import pandas as pd
import time
import json
import sys

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LINKS_FILE = os.path.join(BASE_DIR, "links.csv")
OUTPUT_FILE = os.path.join(BASE_DIR, "movies_output.csv")
CHECKPOINT = os.path.join(BASE_DIR, "checkpoint.json")

#  CẤU HÌNH 

API_KEY        = "7a0e83357f78444d94d6cef73a0e115f" 
LANGUAGE       = "en-US"              
DELAY_SECONDS  = 0.1                
BATCH_SAVE     = 50                  

BASE_URL   = "https://api.themoviedb.org/3/movie"
TMDB_IMAGE = "https://image.tmdb.org/t/p/w500"   

def load_checkpoint() -> dict:
    """Đọc tiến trình đã lưu """
    if os.path.exists(CHECKPOINT):
        with open(CHECKPOINT, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"done_ids": [], "results": []}


def save_checkpoint(state: dict) -> None:
    """Lưu tiến trình xuống file."""
    with open(CHECKPOINT, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def get_youtube_trailer_id(videos: dict) -> str | None:
    """
    Lấy YouTube key của trailer đầu tiên tìm được.
    """
    results = videos.get("results", [])
    for priority in ["Trailer", "Teaser", "Clip"]:
        for v in results:
            if v.get("site") == "YouTube" and v.get("type") == priority:
                return v.get("key")
    for v in results:
        if v.get("site") == "YouTube":
            return v.get("key")
    return None


def fetch_movie(tmdb_id: int, retries: int = 3) -> dict | None:
    """
    Gọi TMDB API lấy thông tin phim theo tmdbId.
    Tự retry khi gặp lỗi 429 (rate limit) hoặc lỗi mạng tạm thời.
    """
    url    = f"{BASE_URL}/{tmdb_id}"
    params = {
        "api_key"           : API_KEY,
        "language"          : LANGUAGE,
        "append_to_response": "videos",   
    }

    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(url, params=params, timeout=10)
            # Rate limit: chờ theo header Retry-After rồi thử lại
            if resp.status_code == 429:
                wait = int(resp.headers.get("Retry-After", 10))
                print(f"  Rate limit! Chờ {wait}s rồi thử lại...")
                time.sleep(wait)
                continue
            # Phim không tồn tại trên TMDB
            if resp.status_code == 404:
                print(f"   tmdbId={tmdb_id} không tồn tại (404), bỏ qua.")
                return None

            resp.raise_for_status()
            data = resp.json()
            # Lấy release_date, trả None nếu chuỗi rỗng
            release_date = data.get("release_date") or None
            # vote_average: làm tròn 1 chữ số thập phân (khớp numeric(3,1))
            vote_avg = data.get("vote_average")
            if vote_avg is not None:
                vote_avg = round(float(vote_avg), 1)

            return {
                "id"                : data.get("id"),
                "title"             : data.get("title"),
                "overview"          : data.get("overview"),
                "release_date"      : release_date,
                "poster_path"       : data.get("poster_path"),        # VD: /abc.jpg
                "youtube_trailer_id": get_youtube_trailer_id(data.get("videos", {})),
                "vote_average"      : vote_avg,
                "vote_count"        : data.get("vote_count"),
            }

        except requests.exceptions.Timeout:
            print(f"   Timeout lần {attempt}/{retries}, thử lại...")
            time.sleep(2 * attempt)

        except requests.exceptions.RequestException as e:
            print(f"  Lỗi mạng lần {attempt}/{retries}: {e}")
            time.sleep(2 * attempt)

    print(f"  Bỏ qua tmdbId={tmdb_id} sau {retries} lần thất bại.")
    return None


def main():
    # Đọc links.csv
    if not os.path.exists(LINKS_FILE):
        print(f" Không tìm thấy file '{LINKS_FILE}'!")
        sys.exit(1)

    links = pd.read_csv(LINKS_FILE)
    if "tmdbId" not in links.columns:
        print(" File links.csv thiếu cột 'tmdbId'!")
        sys.exit(1)

    # Bỏ các dòng không có tmdbId
    links = links.dropna(subset=["tmdbId"])
    links["tmdbId"] = links["tmdbId"].astype(int)
    total = len(links)
    print(f" Tổng số phim cần crawl: {total}")

    # Load checkpoint
    state   = load_checkpoint()
    done_ids = set(state["done_ids"])
    results  = state["results"]

    skipped  = len(done_ids)
    if skipped:
        print(f" Tiếp tục từ checkpoint: đã có {skipped} phim, còn {total - skipped} phim.")

    errors = 0

    for idx, row in links.iterrows():
        tmdb_id = int(row["tmdbId"])

        if tmdb_id in done_ids:
            continue

        movie = fetch_movie(tmdb_id)

        if movie:
            results.append(movie)
            done_ids.add(tmdb_id)
            state["done_ids"] = list(done_ids)
            state["results"]  = results

            current = len(done_ids)
            print(f"[{current}/{total}] {movie['title']} ({movie['release_date']})")
        else:
            errors += 1

        time.sleep(DELAY_SECONDS)

        # Lưu checkpoint định kỳ
        if len(done_ids) % BATCH_SAVE == 0:
            save_checkpoint(state)
            print(f"  Đã lưu checkpoint ({len(done_ids)} phim)")

    # Lưu checkpoint lần cuối
    save_checkpoint(state)

    # Xuất CSV
    df = pd.DataFrame(results, columns=[
        "id", "title", "overview", "release_date",
        "poster_path", "youtube_trailer_id", "vote_average", "vote_count"
    ])
    df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

    print("\n" + "=" * 50)
    print(f" Hoàn thành!")
    print(f"   Thành công : {len(results)} phim")
    print(f"   Lỗi/bỏ qua: {errors} phim")
    print(f"   File output: {OUTPUT_FILE}")
    print("=" * 50)


if __name__ == "__main__":
    main()