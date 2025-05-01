# Artalyze – Backend API

This is the backend for Artalyze — responsible for authentication, daily puzzle logic, stats tracking, and image pair delivery.

## Features

- OTP-based login (no passwords) via AWS SES
- Daily puzzle generation & streak logic
- Full user stats tracking and persistence
- Image hosting via Cloudinary
- Authenticated admin image uploads

## Tech Stack

- Node.js + Express
- MongoDB Atlas
- JWT authentication
- AWS SES (email OTPs)
- Cloudinary

## Highlights

- Built to be scalable and secure with modular route handling
- Supports both the public-facing game and the admin panel
- Designed for minimal latency and API efficiency

## Other Repos

- [`artalyze-user`](https://github.com/TimVanC/artalyze-user) – public game UI
- [`artalyze-admin`](https://github.com/TimVanC/artalyze-admin) – internal dashboard 