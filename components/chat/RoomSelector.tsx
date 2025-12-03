'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

interface Room {
  id: string;
  name: string;
  name_en: string | null;
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

  if (loading) {
    return <div className="p-4 text-black">{t('selectRoom')}...</div>;
  }

  return (
    <div className="border-r border-laundry-blue-light bg-white h-full overflow-y-auto">
      <div className="p-4 border-b border-laundry-blue-light bg-laundry-blue text-white">
        <h2 className="font-semibold">{t('selectRoom')}</h2>
      </div>
      <div className="divide-y divide-laundry-blue-light">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => onRoomSelect(room.id)}
            className={`w-full text-left p-4 hover:bg-laundry-blue-light transition-colors ${
              currentRoomId === room.id ? 'bg-laundry-blue-light border-l-4 border-laundry-blue text-black font-medium' : 'text-black'
            }`}
          >
            <div className="font-medium">{getRoomName(room)}</div>
            {room.type === 'support' && (
              <div className="text-xs text-black opacity-60 mt-1">{t('support')}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

