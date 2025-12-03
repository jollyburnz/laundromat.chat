'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

interface Room {
  id: string;
  name: string;
  name_en: string | null;
  name_es: string | null;
  name_zh: string | null;
  type: string;
}

interface RoomSelectorProps {
  currentRoomId: string | null;
  onRoomSelect: (roomId: string) => void;
  userRole: string;
}

export default function RoomSelector({ currentRoomId, onRoomSelect, userRole }: RoomSelectorProps) {
  const t = useTranslations('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = typeof window !== 'undefined' ? localStorage.getItem('language') || 'en' : 'en';

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Filter out staff-only rooms for non-staff users
      const filteredRooms = data?.filter(room => {
        if (room.type === 'support' && userRole !== 'staff' && userRole !== 'admin') {
          return false;
        }
        return true;
      }) || [];

      setRooms(filteredRooms);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoomName = (room: Room) => {
    if (locale === 'zh' && room.name_zh) return room.name_zh;
    if (locale === 'es' && room.name_es) return room.name_es;
    if (room.name_en) return room.name_en;
    return room.name;
  };

  // Get icon for each room type
  const getRoomIcon = (room: Room) => {
    switch (room.name) {
      case 'general':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'machine-issues':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'lost-found':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'announcements':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        );
      case 'support':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="border-r border-laundry-blue-light bg-white h-full overflow-y-auto w-16 lg:w-64 flex flex-col items-center justify-center">
        <div className="text-black">...</div>
      </div>
    );
  }

  return (
    <div className="border-r border-laundry-blue-light bg-white h-full overflow-y-auto w-16 lg:w-64 flex flex-col">
      {/* Header - hidden on mobile, shown on desktop */}
      <div className="hidden lg:block p-4 border-b border-laundry-blue-light bg-laundry-blue text-white">
        <h2 className="font-semibold">{t('selectRoom')}</h2>
      </div>
      <div className="flex flex-col lg:divide-y lg:divide-laundry-blue-light">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => onRoomSelect(room.id)}
            className={`w-full flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-2 p-3 lg:p-4 min-h-[44px] hover:bg-laundry-blue-light active:bg-laundry-blue-light transition-colors ${
              currentRoomId === room.id 
                ? 'bg-laundry-blue-light border-l-4 lg:border-l-4 border-laundry-blue text-laundry-blue' 
                : 'text-laundry-blue lg:text-black'
            }`}
            title={getRoomName(room)} // Tooltip for mobile
          >
            <div className="flex-shrink-0">
              {getRoomIcon(room)}
            </div>
            {/* Text only on desktop */}
            <div className="hidden lg:block font-medium text-base">{getRoomName(room)}</div>
            {room.type === 'support' && (
              <div className="hidden lg:block text-xs text-black opacity-60 mt-1">{t('support')}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

