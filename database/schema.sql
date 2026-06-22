DROP TABLE IF EXISTS `role_has_permissions`;
DROP TABLE IF EXISTS `model_has_permissions`;
DROP TABLE IF EXISTS `model_has_roles`;
DROP TABLE IF EXISTS `permissions`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `penelitian_anggota`;
DROP TABLE IF EXISTS `penelitian`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id`                       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name`                     VARCHAR(255) NOT NULL,
  `email`                    VARCHAR(255) NOT NULL UNIQUE,
  `password`                 VARCHAR(255) NOT NULL,
  `role`                     ENUM('admin','dosen','anggota') NOT NULL DEFAULT 'anggota',
  `status`                   ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
  `email_verified_at`        DATETIME     NULL DEFAULT NULL,
  `remember_token`           VARCHAR(255) NULL DEFAULT NULL,
  `two_factor_secret`        TEXT         NULL DEFAULT NULL,
  `two_factor_recovery_codes` TEXT        NULL DEFAULT NULL,
  `two_factor_confirmed_at`  DATETIME     NULL DEFAULT NULL,
  `created_at`               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `permissions` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name`       VARCHAR(255) NOT NULL,
  `guard_name` VARCHAR(255) NOT NULL DEFAULT 'web',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `roles` (
  `id`         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name`       VARCHAR(255) NOT NULL,
  `guard_name` VARCHAR(255) NOT NULL DEFAULT 'web',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `role_has_permissions` (
  `permission_id` BIGINT NOT NULL,
  `role_id`       BIGINT NOT NULL,
  PRIMARY KEY (`permission_id`, `role_id`),
  CONSTRAINT `fk_rhp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rhp_role`       FOREIGN KEY (`role_id`)       REFERENCES `roles`       (`id`) ON DELETE CASCADE
);

CREATE TABLE `model_has_roles` (
  `role_id`    BIGINT       NOT NULL,
  `model_type` VARCHAR(255) NOT NULL,
  `model_id`   INT UNSIGNED NOT NULL,
  PRIMARY KEY (`role_id`, `model_id`, `model_type`),
  INDEX `idx_mhr_model` (`model_id`, `model_type`),
  CONSTRAINT `fk_mhr_role` FOREIGN KEY (`role_id`)   REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mhr_user` FOREIGN KEY (`model_id`)  REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE `model_has_permissions` (
  `permission_id` BIGINT       NOT NULL,
  `model_type`    VARCHAR(255) NOT NULL,
  `model_id`      INT UNSIGNED NOT NULL,
  PRIMARY KEY (`permission_id`, `model_id`, `model_type`),
  INDEX `idx_mhp_model` (`model_id`, `model_type`),
  CONSTRAINT `fk_mhp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mhp_user`       FOREIGN KEY (`model_id`)      REFERENCES `users`       (`id`) ON DELETE CASCADE
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
  `role`          ENUM('Ketua','Anggota','Admin') NOT NULL DEFAULT 'Anggota',
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
