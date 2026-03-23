require "sequel"
require "rake/testtask"

Rake::TestTask.new do |t|
  t.test_files = FileList["test/**/*_test.rb"]
end

task default: :test

namespace :db do
  task :connect do
    @db = Sequel.connect("sqlite://db/gdd.sqlite3")
  end

  desc "Run database migrations"
  task migrate: :connect do
    Sequel.extension :migration
    Sequel::Migrator.run(@db, "db/migrate")
    puts "Migrations complete."
  end

  desc "Seed database with default data"
  task seed: :connect do
    load "db/seed.rb"
    seed(@db)
    puts "Seed complete."
  end

  desc "Generate fake temperature data for development"
  task fake_temps: :connect do
    require "date"
    srand(42)

    today = Date.today
    start_date = Date.new(today.year - 4, 1, 1)

    @db[:daily_temps].delete

    rows = []
    (start_date..today).each do |date|
      doy = date.yday
      # Sine curve peaking in July (~day 200), range roughly 30-100°F
      base = 55 + 25 * Math.sin((doy - 80) * Math::PI / 182.5)
      noise = rand(-8.0..8.0)
      avg = base + noise
      spread = rand(10.0..25.0)
      temp_min = (avg - spread / 2).round(1)
      temp_max = (avg + spread / 2).round(1)
      rows << { date: date.to_s, temp_min: temp_min, temp_max: temp_max }
    end

    @db[:daily_temps].multi_insert(rows)
    puts "Inserted #{rows.size} days of fake temperature data."
  end

  desc "Import temperature data from InfluxDB CSV export (temps.csv)"
  task import_temps: :connect do
    require "csv"
    require "date"

    file = ENV["FILE"] || "temps.csv"
    abort "File not found: #{file}" unless File.exist?(file)

    @db[:daily_temps].delete

    rows = []
    skipped = 0
    CSV.foreach(file, headers: true) do |row|
      next if row["min"].nil? || row["min"].empty? || row["max"].nil? || row["max"].empty?

      # Nanosecond epoch -> date in local time (already tz-adjusted by InfluxDB query)
      ts = row["time"].to_i / 1_000_000_000
      date = Time.at(ts).to_date

      rows << {
        date: date.to_s,
        temp_min: row["min"].to_f.round(2),
        temp_max: row["max"].to_f.round(2),
      }
    end

    @db[:daily_temps].multi_insert(rows)
    puts "Imported #{rows.size} days of temperature data."
  end
end
