# 📅 Volunteer Shift Management App

Un'applicazione web per gestire turni di volontariato con auto-assegnazione, notifiche email e dashboard admin.

## 🎯 Features MVP

✅ Registrazione/Login utenti
✅ Volontari: Visualizzazione turni e auto-assegnazione
✅ Volontari: Cancellazione turni (fino 2 ore prima)
✅ Volontari: Storico turni
✅ Admin: Caricamento manuale turni via form
✅ Admin: Dashboard copertura turni
✅ Email notifiche (assegnazione + promemoria)
✅ Alert quando turni non coperti

## 🛠 Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS
- **Auth**: JWT + bcrypt
- **Email**: Nodemailer

## 📦 Setup

### Backend

```bash
cd backend
npm install
```

Crea file `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/shift_management
JWT_SECRET=your_secret_key
NODE_ENV=development
PORT=5000

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@shiftmanagement.com
```

Avvia il server:
```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Accedi a: `http://localhost:5173`

## 🗄 Database

Il database viene creato automaticamente al primo avvio del backend.

## 🚀 Prossimi Step

- [ ] Notifiche push in-app
- [ ] "Call for volunteer" broadcast
- [ ] Chat WhatsApp integrata
- [ ] Sincronizzazione automatica Google Calendar
- [ ] Analytics volontari
- [ ] Dark mode
