CREATE TABLE `permissions`(
    `id` BIGINT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `guard_name` VARCHAR(255) NOT NULL,
    `created_at` DATETIME NOT NULL,
    `updated_at` DATETIME NOT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `roles`(
    `id` BIGINT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `guard_name` VARCHAR(255) NOT NULL,
    `created_at` DATETIME NOT NULL,
    `updated_at` DATETIME NOT NULL,
    PRIMARY KEY(`id`)
);
CREATE TABLE `model_has_permissions`(
    `permission_id` BIGINT NOT NULL,
    `model_type` VARCHAR(255) NOT NULL,
    `model_id` INT NOT NULL,
    PRIMARY KEY(
        `permission_id`,
        `model_id`,
        `model_type`
    )
);
ALTER TABLE
    `model_has_permissions` ADD INDEX `model_has_permissions_model_id_model_type_index`(`model_id`, `model_type`);
ALTER TABLE
    `model_has_permissions` ADD PRIMARY KEY(`permission_id`);
CREATE TABLE `model_has_roles`(
    `role_id` BIGINT NOT NULL,
    `model_type` VARCHAR(255) NOT NULL,
    `model_id` INT NOT NULL,
    PRIMARY KEY(`role_id`, `model_id`, `model_type`)
);
ALTER TABLE
    `model_has_roles` ADD INDEX `model_has_roles_model_id_model_type_index`(`model_id`, `model_type`);
ALTER TABLE
    `model_has_roles` ADD PRIMARY KEY(`role_id`);
CREATE TABLE `role_has_permissions`(
    `permission_id` BIGINT NOT NULL,
    `role_id` BIGINT NOT NULL,
    PRIMARY KEY(`permission_id`, `role_id`)
);
ALTER TABLE
    `role_has_permissions` ADD PRIMARY KEY(`permission_id`);
CREATE TABLE `users`(
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `email_verified_at` DATETIME NOT NULL,
    `remember_token` VARCHAR(255) NOT NULL,
    `two_factor_secret` TEXT NOT NULL,
    `two_factor_recovery_codes` TEXT NOT NULL,
    `two_factor_confirmed_at` DATETIME NOT NULL,
    `updated_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL
);
ALTER TABLE
    `role_has_permissions` ADD CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY(`role_id`) REFERENCES `roles`(`id`);
ALTER TABLE
    `model_has_roles` ADD CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY(`role_id`) REFERENCES `roles`(`id`);
ALTER TABLE
    `model_has_roles` ADD CONSTRAINT `model_has_roles_model_id_foreign` FOREIGN KEY(`model_id`) REFERENCES `users`(`id`);
ALTER TABLE
    `model_has_permissions` ADD CONSTRAINT `model_has_permissions_permission_id_foreign` FOREIGN KEY(`permission_id`) REFERENCES `permissions`(`id`);
ALTER TABLE
    `role_has_permissions` ADD CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY(`permission_id`) REFERENCES `permissions`(`id`);

CREATE TABLE `penelitian` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `judul`        VARCHAR(500) NOT NULL,
  `deskripsi`    TEXT         NULL DEFAULT NULL,
  `tahun_mulai`  YEAR         NOT NULL,
  `tahun_selesai` YEAR        NULL DEFAULT NULL,
  `status`       ENUM('draft','aktif','selesai','ditolak') NOT NULL DEFAULT 'draft',
  `ketua_id`     INT UNSIGNED NOT NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_penelitian_ketua` FOREIGN KEY (`ketua_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
);

CREATE TABLE `penelitian_anggota` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `penelitian_id` INT UNSIGNED NOT NULL,
  `dosen_id`      INT UNSIGNED NOT NULL,
  `role`          ENUM('Ketua','Anggota','reviewer') NOT NULL DEFAULT 'Anggota',
  `status`        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_penelitian_dosen` (`penelitian_id`, `dosen_id`),
  CONSTRAINT `fk_pa_penelitian` FOREIGN KEY (`penelitian_id`) REFERENCES `penelitian` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pa_dosen`      FOREIGN KEY (`dosen_id`)      REFERENCES `users`      (`id`) ON DELETE CASCADE
);

INSERT INTO `roles` (`name`, `guard_name`) VALUES
  ('admin',   'web'),
  ('dosen',   'web'),
  ('anggota', 'web');

INSERT INTO `permissions` (`name`, `guard_name`) VALUES
  ('penelitian.view-all',   'web'),
  ('penelitian.view-own',   'web'),
  ('penelitian.create',     'web'),
  ('penelitian.update-own', 'web'),
  ('penelitian.delete-own', 'web'),
  ('penelitian.update-any', 'web'),
  ('penelitian.delete-any', 'web'),
  ('penelitian.export',     'web'),
  ('anggota.manage',        'web'),
  ('anggota.membership',    'web'),
  ('user.view-all',         'web'),
  ('user.update-role',      'web');

INSERT INTO `role_has_permissions` (`permission_id`, `role_id`)
  SELECT p.id, r.id
  FROM `permissions` p, `roles` r
  WHERE r.name = 'admin';

INSERT INTO `role_has_permissions` (`permission_id`, `role_id`)
  SELECT p.id, r.id
  FROM `permissions` p, `roles` r
  WHERE r.name = 'dosen'
    AND p.name IN (
      'penelitian.view-all',
      'penelitian.view-own',
      'penelitian.create',
      'penelitian.update-own',
      'penelitian.delete-own',
      'penelitian.export',
      'anggota.manage'
    );

INSERT INTO `role_has_permissions` (`permission_id`, `role_id`)
  SELECT p.id, r.id
  FROM `permissions` p, `roles` r
  WHERE r.name = 'anggota'
    AND p.name IN (
      'penelitian.view-all',
      'anggota.membership'
    );

INSERT INTO `users` (`name`, `email`, `password`, `role`) VALUES
  ('Administrator', 'admin@fti.ac.id',
   '$2y$10$wH9Qx8N9K5V0m8mXz2L7Ku8m4m7Y4V7T2M5m0gM9Lz9P6YwzQ7K9S',
   'admin');
