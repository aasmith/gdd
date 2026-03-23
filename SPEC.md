# GDD Garden Planner

A single-user garden planning app that uses real growing degree day data
from a local InfluxDB instance to predict crop timelines and help plan
succession plantings.

## Overview

The app is a visual planner built around a Gantt-style timeline. The user
drops crops onto the timeline, and the app draws each planting's duration
based on actual/projected GDD accumulation — not calendar days. This
gives accurate, data-driven harvest predictions adapted to local
microclimate conditions.

## Stack

- **Backend**: Sinatra (Ruby), SQLite
- **Frontend**: Vanilla JS, D3.js
- **Data source**: InfluxDB (< 1.8, InfluxQL) on local network

## Data Model

### GDD Method

Defines a base/cap temperature pair for GDD calculation. Different crop
types accumulate GDD differently.

| Field    | Type    | Description                         |
|----------|---------|-------------------------------------|
| id       | integer | primary key                         |
| name     | string  | e.g., "Warm", "Hardy"              |
| base_f   | float   | base temperature °F (e.g., 50)     |
| cap_f    | float   | cap temperature °F (e.g., 86)      |

Seed with at least:
- **Warm** (50°F / 86°F) — tomatoes, peppers, beans, squash
- **Hardy** (40°F / 86°F) — peas, lettuce, spinach, brassicas

### Crop

A template describing a type of plant.

| Field         | Type    | Description                         |
|---------------|---------|-------------------------------------|
| id            | integer | primary key                         |
| name          | string  | e.g., "Tomato"                      |
| variety       | string  | e.g., "Early Girl"                  |
| gdd           | integer | GDD required from planting to harvest |
| gdd_method_id | integer | foreign key to gdd_method           |

### Planting

An instance of a crop placed on the timeline.

| Field          | Type    | Description                              |
|----------------|---------|------------------------------------------|
| id             | integer | primary key                              |
| crop_id        | integer | foreign key to crop                      |
| plant_date     | date    | date placed in the ground                |
| seeding_date   | date    | nullable, date seeds were started        |
| emergence_date | date    | nullable, freeform logging               |
| first_harvest  | date    | nullable, freeform logging               |
| removal_date   | date    | nullable, when the crop was pulled       |
| notes          | text    | nullable, freeform reference notes       |

### Daily Temperature Cache

Raw daily min/max temperatures synced from InfluxDB. GDD is not stored
here — it is computed on the fly using the appropriate GDD method, since
different crops use different base/cap temperatures.

| Field     | Type    | Description                            |
|-----------|---------|----------------------------------------|
| date      | date    | primary key, one row per day           |
| temp_min  | float   | daily minimum temperature (°F)         |
| temp_max  | float   | daily maximum temperature (°F)         |

## GDD Calculation

Given a GDD method with base B and cap C:

```
T_min = max(temp_min, B)
T_max = min(temp_max, C)
T_max = max(T_max, B)      # floor after cap
GDD   = max(0, (T_max + T_min) / 2 - B)
```

The formula is the same for all methods — only B and C change.
Computed on the fly from cached daily temps + the crop's GDD method.

## InfluxDB Integration

Pull daily min/max temperature from the existing sensor:

```sql
SELECT min("value"), max("value") FROM "raw"."temperature"
WHERE "sensor"::tag = 'outside-north'
AND time >= '<start>'
GROUP BY time(1d) tz('<local_tz>')
```

Sync strategy:
- On app load (or periodic background job), pull any missing days from
  InfluxDB into the GDD cache table.
- Today's partial GDD can be fetched live and treated as provisional.

## API Endpoints

### GDD Methods
- `GET    /api/gdd_methods`        — list all methods
- `POST   /api/gdd_methods`        — create a method
- `PUT    /api/gdd_methods/:id`    — update a method
- `DELETE /api/gdd_methods/:id`    — delete a method

### Crops
- `GET    /api/crops`        — list all crops (includes gdd_method)
- `POST   /api/crops`        — create a crop
- `PUT    /api/crops/:id`    — update a crop
- `DELETE /api/crops/:id`    — delete a crop

### Plantings
- `GET    /api/plantings`    — list all plantings (with crop data)
- `POST   /api/plantings`    — create a planting
- `PUT    /api/plantings/:id` — update a planting (dates, notes, position)
- `DELETE /api/plantings/:id` — delete a planting

### GDD
All GDD endpoints require a `method_id` parameter to select the
base/cap temperatures for calculation.

- `GET /api/gdd?method_id=N&from=YYYY-MM-DD&to=YYYY-MM-DD` — daily GDD
- `GET /api/gdd/cumulative?method_id=N&from=YYYY-MM-DD` — cumulative GDD
- `GET /api/gdd/projection?method_id=N&from=YYYY-MM-DD&gdd=N` — projected
  date to reach N more GDD, based on historical daily averages

## Frontend

### Main View: Gantt Timeline

- **X axis**: dates, with a GDD scale overlay showing cumulative GDD
  from March 1st.
- **Rows**: each planting is a horizontal bar. Bar length is determined
  by the crop's GDD requirement mapped onto the date axis using
  actual (past) and projected (future) GDD accumulation.
- **Drag and drop**: drag a crop from a sidebar palette onto the
  timeline to create a planting at that date. Drag existing bars to
  move them.
- **Dynamic bar length**: as a planting is dragged along the timeline,
  the bar length updates in real time. A crop placed in a cool period
  stretches longer (slow GDD accumulation); the same crop placed in a
  warm period compresses shorter (fast GDD accumulation). The frontend
  preloads the full season's daily GDD curve (actual + projected) so
  this calculation is instant — no API calls during drag.
- **Visual hints**: show remaining GDD in the season, highlight the
  projected first frost / season end. Make it clear when a placement
  won't have enough GDD to mature (e.g., bar extends past season end,
  turns red, or shows a warning icon).

### Sidebar: Crop Palette

- List of defined crops, showing name, variety, and GDD.
- Add/edit/delete crops inline.
- Drag from here onto the timeline to create a planting.

### Planting Detail

- Click a planting bar to open a detail panel/popover.
- Shows: crop info, GDD progress (accumulated / required), predicted
  harvest date, all freeform date fields, notes.
- Edit freeform dates and notes here.

## GDD Projection

To draw future planting bars, the app needs to estimate future daily
GDD. Approach:

- Use historical GDD data (prior years from InfluxDB) to compute an
  average daily GDD for each calendar day.
- When drawing a bar that extends into the future, switch from actual
  to projected GDD at "today."
- The projection endpoint handles this server-side.

## Season

- GDD accumulation starts March 1st each year.
- Season end / first frost: user-configurable, default November 1st.
  Used for "will this crop finish?" warnings.
- Both dates stored in a settings table / config so they can be
  adjusted from the UI.

## Non-Goals (for now)

- Multi-user / auth
- Space/bed planning (may add later)
- Seed inventory tracking
- Weather forecast integration
- Mobile-specific UI (should be responsive but not a priority)
