# GDD Garden Planner

A single-user garden planning tool that uses growing degree day (GDD) data
from a local temperature sensor to predict crop timelines. Built around a
drag-and-drop Gantt chart where bar lengths represent actual and projected
GDD accumulation, not calendar days.

The app uses single-sine with horizontal cutoff for GDD calculation, matching
the method used by Oregon State University's Croptime research. Each crop
references a GDD method (base/cap temperature pair), so warm-season and
cool-season crops accumulate GDD differently from the same temperature data.

## Setup

```
bundle install
rake db:migrate db:seed
bundle exec rackup -p 9292
```

This seeds the database with GDD methods and crops from OSU Extension EM 9305
and other extension sources. Crop GDD values marked `(est.)` are estimates.

## Loading temperature data

The app needs daily min/max temperature data. Export it as CSV with columns
`name`, `time` (nanosecond epoch), `min`, and `max`.

If your data is in InfluxDB, run a query like this on the InfluxDB host:

```
influx -database 'YOUR_DB' -execute "
  SELECT min(\"value\"), max(\"value\") FROM \"raw\".\"temperature\"
  WHERE \"sensor\"::tag = 'YOUR_SENSOR'
  AND time >= '2022-01-01T00:00:00Z'
  GROUP BY time(1d) tz('America/Los_Angeles')
" -format csv > temps.csv
```

Adjust the database name, sensor tag, start date, and timezone. Then import:

```
rake db:import_temps
```

This replaces all existing temperature data. The app uses historical data
(prior years) to project future GDD accumulation for the remainder of the
season.

## Running tests

```
rake test
```
