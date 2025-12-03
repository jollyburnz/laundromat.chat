-- Add Spanish names to existing rooms

UPDATE rooms SET name_es = 'Chat General' WHERE name = 'general';
UPDATE rooms SET name_es = 'Problemas con Máquinas' WHERE name = 'machine-issues';
UPDATE rooms SET name_es = 'Objetos Perdidos' WHERE name = 'lost-found';
UPDATE rooms SET name_es = 'Anuncios' WHERE name = 'announcements';
UPDATE rooms SET name_es = 'Soporte (Solo Personal)' WHERE name = 'support';

