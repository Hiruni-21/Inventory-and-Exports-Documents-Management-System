CREATE DATABASE IF NOT EXISTS fresh_world_system;
USE fresh_world_system;

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

INSERT INTO roles (role_name) VALUES
('Admin'),
('Manager'),
('Operations Executive'),
('Logistics Executive'),
('Supervisor'),
('Supplier');

INSERT INTO users (name, email, password, role_id) VALUES
('System Admin', 'admin@freshworld.com', '$2a$10$4i0P0S3vT5nV3V7n8g0b2eYJf7wP8dPzqvB2jBv4x0x9N2vYxIh4S', 1),
('Manager User', 'manager@freshworld.com', '$2a$10$4i0P0S3vT5nV3V7n8g0b2eYJf7wP8dPzqvB2jBv4x0x9N2vYxIh4S', 2),
('Operations User', 'operations@freshworld.com', '$2a$10$4i0P0S3vT5nV3V7n8g0b2eYJf7wP8dPzqvB2jBv4x0x9N2vYxIh4S', 3),
('Logistics User', 'logistics@freshworld.com', '$2a$10$4i0P0S3vT5nV3V7n8g0b2eYJf7wP8dPzqvB2jBv4x0x9N2vYxIh4S', 4),
('Supervisor User', 'supervisor@freshworld.com', '$2a$10$4i0P0S3vT5nV3V7n8g0b2eYJf7wP8dPzqvB2jBv4x0x9N2vYxIh4S', 5),
('Supplier User', 'supplier@freshworld.com', '$2a$10$4i0P0S3vT5nV3V7n8g0b2eYJf7wP8dPzqvB2jBv4x0x9N2vYxIh4S', 6);