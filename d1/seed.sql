-- Points
INSERT INTO points (name, description) VALUES ('Метро Центральная', 'Станция метро Центральная');
INSERT INTO points (name, description) VALUES ('ТЦ "Европа"', 'Торговый центр Европа');
INSERT INTO points (name, description) VALUES ('Офис Компании А', 'Офис на Пушкинской');

-- Machines
INSERT INTO machines (point_id, name, type, description) VALUES (1, 'Автомат №1 (напитки)', 'Beverages', 'Холодные напитки');
INSERT INTO machines (point_id, name, type, description) VALUES (1, 'Автомат №2 (снеки)', 'Snacks', 'Чипсы и сладости');
INSERT INTO machines (point_id, name, type, description) VALUES (2, 'Автомат №3 (напитки)', 'Beverages', 'Напитки в ТЦ');
INSERT INTO machines (point_id, name, type, description) VALUES (2, 'Автомат №4 (кофе)', 'Coffee', 'Кофе и горячие напитки');
INSERT INTO machines (point_id, name, type, description) VALUES (3, 'Автомат №5 (напитки)', 'Beverages', 'Вода и соки');
INSERT INTO machines (point_id, name, type, description) VALUES (3, 'Автомат №6 (снеки)', 'Snacks', 'Печенье и батончики');

-- Collections for 2026-08-01
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 2100, 12, '', '2026-08-01 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 1850, 9, '', '2026-08-01 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2300, 14, '', '2026-08-01 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 3200, 16, '', '2026-08-01 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1650, 11, '', '2026-08-01 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1400, 8, '', '2026-08-01 10:15:00');

-- Collections for 2026-08-02
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 1900, 11, '', '2026-08-02 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 2100, 10, '', '2026-08-02 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2600, 15, '', '2026-08-02 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 2800, 14, '', '2026-08-02 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1750, 12, '', '2026-08-02 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1600, 9, '', '2026-08-02 10:15:00');

-- Collections for 2026-08-03
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 2400, 13, '', '2026-08-03 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 1950, 10, '', '2026-08-03 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2200, 12, '', '2026-08-03 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 3500, 18, '', '2026-08-03 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1600, 10, '', '2026-08-03 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1800, 10, '', '2026-08-03 10:15:00');

-- Collections for 2026-08-04
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 2000, 11, '', '2026-08-04 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 1700, 8, '', '2026-08-04 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2150, 13, '', '2026-08-04 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 2900, 15, '', '2026-08-04 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1550, 10, '', '2026-08-04 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1350, 7, '', '2026-08-04 10:15:00');

-- Collections for 2026-08-05
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 2250, 12, '', '2026-08-05 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 2050, 11, '', '2026-08-05 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2400, 14, '', '2026-08-05 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 3100, 16, '', '2026-08-05 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1700, 11, '', '2026-08-05 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1650, 9, '', '2026-08-05 10:15:00');

-- Collections for 2026-08-06
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 2200, 12, '', '2026-08-06 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 1800, 9, '', '2026-08-06 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2350, 13, '', '2026-08-06 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 3300, 17, '', '2026-08-06 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1680, 11, '', '2026-08-06 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1550, 8, '', '2026-08-06 10:15:00');

-- Collections for 2026-08-07 (today)
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 2300, 13, '', '2026-08-07 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 1950, 10, '', '2026-08-07 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2500, 15, '', '2026-08-07 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 3400, 17, '', '2026-08-07 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1800, 12, '', '2026-08-07 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1700, 10, '', '2026-08-07 10:15:00');

-- Collections for 2026-07-31
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 2150, 12, '', '2026-07-31 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 1850, 9, '', '2026-07-31 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2350, 14, '', '2026-07-31 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 3100, 16, '', '2026-07-31 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1700, 11, '', '2026-07-31 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1600, 9, '', '2026-07-31 10:15:00');

-- Collections for 2026-07-30
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 2200, 12, '', '2026-07-30 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 1900, 10, '', '2026-07-30 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2400, 14, '', '2026-07-30 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 3200, 16, '', '2026-07-30 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1750, 12, '', '2026-07-30 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1650, 9, '', '2026-07-30 10:15:00');

-- Collections for 2026-07-29
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 2100, 11, '', '2026-07-29 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 1800, 9, '', '2026-07-29 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2250, 13, '', '2026-07-29 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 3050, 15, '', '2026-07-29 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1600, 10, '', '2026-07-29 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1500, 8, '', '2026-07-29 10:15:00');

-- Collections for 2026-07-28
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 2250, 13, '', '2026-07-28 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 1950, 10, '', '2026-07-28 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2400, 14, '', '2026-07-28 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 3200, 16, '', '2026-07-28 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1700, 11, '', '2026-07-28 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1650, 9, '', '2026-07-28 10:15:00');

-- Collections for 2026-07-27
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 2300, 13, '', '2026-07-27 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 2000, 11, '', '2026-07-27 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2500, 15, '', '2026-07-27 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 3300, 17, '', '2026-07-27 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1800, 12, '', '2026-07-27 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1700, 10, '', '2026-07-27 10:15:00');

-- Collections for earlier dates (26, 25, 24, 23, 22, 21 июля)
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 2180, 12, '', '2026-07-26 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 1900, 10, '', '2026-07-26 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2380, 14, '', '2026-07-26 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 3180, 16, '', '2026-07-26 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1720, 11, '', '2026-07-26 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1620, 9, '', '2026-07-26 10:15:00');

INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 2120, 12, '', '2026-07-25 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 1850, 9, '', '2026-07-25 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2320, 13, '', '2026-07-25 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 3120, 15, '', '2026-07-25 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1660, 10, '', '2026-07-25 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1560, 8, '', '2026-07-25 10:15:00');

-- Collections for 2026-08-24 (43 days ago from 2026-07-07)
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (1, 'Иван П.', 2280, 13, '', '2026-08-24 08:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (2, 'Иван П.', 1920, 10, '', '2026-08-24 08:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (3, 'Петр Л.', 2450, 14, '', '2026-08-24 09:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (4, 'Петр Л.', 3350, 17, '', '2026-08-24 09:15:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (5, 'Сергей К.', 1850, 12, '', '2026-08-24 10:00:00');
INSERT INTO collections (machine_id, collector, amount, quantity, comment, created_at) VALUES (6, 'Сергей К.', 1750, 10, '', '2026-08-24 10:15:00');
