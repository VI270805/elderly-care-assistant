# CareAssist — Flask Backend

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the server
python app.py
```

Open http://localhost:5000 in your browser.  
Login with **admin / 1234**.

---

## Project Structure

```
careassist/
├── app.py                  ← Flask server + all API routes
├── requirements.txt
├── templates/
│   └── index.html          ← Jinja2 template (single-page app)
└── static/
    ├── css/
    │   └── style.css
    └── js/
        └── script.js       ← Frontend logic (fetch API calls)
```

---

## API Reference

### Auth
| Method | Endpoint     | Body                        | Description        |
|--------|--------------|-----------------------------|--------------------|
| POST   | /api/login   | `{username, password}`      | Authenticate user  |
| POST   | /api/logout  | —                           | Clear session      |
| GET    | /api/me      | —                           | Check session      |

### Reminders
| Method | Endpoint                  | Body                              | Description     |
|--------|---------------------------|-----------------------------------|-----------------|
| GET    | /api/reminders            | —                                 | List all        |
| POST   | /api/reminders            | `{name, time, freq, notes}`       | Add reminder    |
| PUT    | /api/reminders/<id>       | `{name?, time?, freq?, notes?, taken?}` | Update    |
| DELETE | /api/reminders/<id>       | —                                 | Delete          |

### Health Records
| Method | Endpoint           | Body               | Description     |
|--------|--------------------|--------------------|-----------------|
| GET    | /api/health        | —                  | List all        |
| POST   | /api/health        | `{bp?, sugar?, hr?}` | Add record    |
| DELETE | /api/health/<id>   | —                  | Delete          |

---

## Notes

- Data is stored **in-memory** by default (resets on server restart).  
  For persistence, replace `_reminders` and `_health_records` dicts with  
  SQLite via `flask-sqlalchemy` or a simple JSON file store.
- Change `app.secret_key` before deploying.
- Emergency contact is still saved in `localStorage` (client-only feature).
