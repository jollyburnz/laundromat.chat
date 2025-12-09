'use client';

interface NicknameIndicatorProps {
  nickname: string;
}

export default function NicknameIndicator({ nickname }: NicknameIndicatorProps) {
  if (!nickname) return null;

  return (
    <div className="text-center py-1">
      <span className="text-laundry-blue font-medium text-sm lg:text-base">
        👤 {nickname}
      </span>
    </div>
  );
}