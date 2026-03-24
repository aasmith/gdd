require_relative "../lib/gdd_calculator"

module Routes
  module Gdd
    def self.registered(app)
      # Daily GDD values for a date range
      app.get "/api/gdd" do
        method = DB[:gdd_methods][id: params[:method_id]]
        halt 400, { error: "method_id required" }.to_json unless method

        from = params[:from] || "#{Date.today.year}-03-01"
        to = params[:to] || Date.today.to_s

        temps = DB[:daily_temps]
          .where(date: Date.parse(from)..Date.parse(to))
          .order(:date)
          .all

        json GddCalculator.cumulative(temps, method[:base_f], method[:cap_f])
      end

      # Full season curve: actual + projected, for a given method and year
      app.get "/api/gdd/cumulative" do
        method_id = params[:method_id]&.to_i
        halt 400, { error: "method_id required" }.to_json unless method_id

        settings = DB[:settings].first
        year = (params[:year] || Date.today.year).to_i

        json GddCalculator.season_curve(
          DB, method_id, year,
          settings[:season_start], settings[:season_end]
        )
      end

      # Raw temps with GDD computed per method — for the data page
      app.get "/api/gdd/table" do
        from = params[:from] || "#{Date.today.year}-03-01"
        to = params[:to] || Date.today.to_s

        temps = DB[:daily_temps]
          .where(date: Date.parse(from)..Date.parse(to))
          .order(:date)
          .all

        methods = DB[:gdd_methods].order(:id).all

        rows = temps.map do |t|
          row = {
            date: t[:date].to_s,
            temp_min: t[:temp_min],
            temp_max: t[:temp_max],
          }
          methods.each do |m|
            row["gdd_#{m[:id]}"] = GddCalculator.daily(
              t[:temp_min], t[:temp_max], m[:base_f], m[:cap_f]
            ).round(1)
          end
          row
        end

        # Add cumulative totals
        cums = methods.each_with_object({}) { |m, h| h[m[:id]] = 0.0 }
        rows.each do |r|
          methods.each do |m|
            cums[m[:id]] += r["gdd_#{m[:id]}"]
            r["cum_#{m[:id]}"] = cums[m[:id]].round(1)
          end
        end

        json({ methods: methods, rows: rows })
      end

      # Projection basis — the historical averages the app uses for future GDD.
      # Same data source and logic as season_curve's projection.
      app.get "/api/gdd/projection_basis" do
        settings = DB[:settings].first
        year = (params[:year] || Date.today.year).to_i
        season_start = Date.parse("#{year}-#{settings[:season_start]}")

        # Same historical data pool that season_curve uses
        all_temps = DB[:daily_temps].where { date < season_start }.all
        averages = GddCalculator.historical_averages(all_temps)

        methods = DB[:gdd_methods].order(:id).all

        # Default to full year, but allow custom range
        start_date = params[:from] ? Date.parse(params[:from]) : Date.new(year, 1, 1)
        end_date = params[:to] ? Date.parse(params[:to]) : Date.new(year, 12, 31)

        rows = (start_date..end_date).map do |date|
          avg = averages[date.yday] || { temp_min: 0, temp_max: 0, years: 0 }
          row = {
            date: date.to_s,
            doy: date.yday,
            temp_min: avg[:temp_min].round(1),
            temp_max: avg[:temp_max].round(1),
            years: avg[:years],
          }
          methods.each do |m|
            row["gdd_#{m[:id]}"] = GddCalculator.daily(
              avg[:temp_min], avg[:temp_max], m[:base_f], m[:cap_f]
            ).round(1)
          end
          row
        end

        json({ methods: methods, rows: rows })
      end

      # Project: given a start date and GDD target, when will it be reached?
      app.get "/api/gdd/projection" do
        method_id = params[:method_id]&.to_i
        halt 400, { error: "method_id required" }.to_json unless method_id

        from = params[:from]
        gdd_target = params[:gdd]&.to_f
        halt 400, { error: "from and gdd required" }.to_json unless from && gdd_target

        settings = DB[:settings].first
        year = Date.parse(from).year

        curve = GddCalculator.season_curve(
          DB, method_id, year,
          settings[:season_start], settings[:season_end]
        )

        projected_date = GddCalculator.project_date(curve, Date.parse(from), gdd_target)

        json({
          from: from,
          gdd_target: gdd_target,
          projected_date: projected_date,
          will_finish: !projected_date.nil?
        })
      end
    end
  end
end
