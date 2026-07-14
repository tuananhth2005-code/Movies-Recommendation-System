import React from 'react';

const QUICK_ACTIONS = [
  {
    label: "Gợi ý cho tôi",
    message: "Gợi ý phim phù hợp với sở thích của tôi",
  },
  {
    label: "Phim đang hot",
    message: "Những phim đang thịnh hành nhất hiện tại là gì?",
  },
  {
    label: "Đang buồn",
    message: "Tôi đang buồn, gợi ý phim cảm xúc hay cho tôi",
  },
  {
    label: "Khoa học viễn tưởng",
    message: "Gợi ý phim khoa học viễn tưởng hay nhất",
  },
];

export default function QuickActions({ onSend }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-4 py-5">
      <div className="mb-1 text-center text-[0.85rem] text-white/50">
        Bạn muốn tôi giúp gì?
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => onSend(action.message)}
            className="whitespace-nowrap rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-[0.82rem] text-white transition hover:border-white/30 hover:bg-white/10"
          >
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
